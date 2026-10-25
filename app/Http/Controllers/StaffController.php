<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\ShopRole;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StaffController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $storeId = (int) $request->user()->store_id;

        $query = User::query()
            ->with('shopRole')
            ->where('store_id', $storeId);

        $search = trim((string) ($request->input('search') ?? $request->input('q')));
        if ($search !== '') {
            $query->where(function ($sub) use ($search) {
                $sub->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('username', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($request->filled('role_id')) {
            $query->where('role_id', $request->integer('role_id'));
        }

        if ($request->filled('status')) {
            $isActive = $request->string('status')->toString() === 'active';
            $query->where('is_active', $isActive);
        }

        $sort = $request->string('sort', 'latest')->toString();
        if ($sort === 'name_asc') {
            $query->orderBy('name', 'asc');
        } elseif ($sort === 'name_desc') {
            $query->orderBy('name', 'desc');
        } else {
            $query->orderByDesc('id');
        }

        $perPage = max(1, min(100, $request->integer('per_page', 15)));
        $staff = $query->paginate($perPage)->withQueryString();

        $roles = ShopRole::query()
            ->where('store_id', $storeId)
            ->orderBy('name')
            ->get(['id', 'name', 'description', 'is_system']);

        return response()->json([
            'staff' => $staff->items(),
            'roles' => $roles,
            'meta' => [
                'current_page' => $staff->currentPage(),
                'last_page' => $staff->lastPage(),
                'from' => $staff->firstItem(),
                'to' => $staff->lastItem(),
                'total' => $staff->total(),
                'per_page' => $staff->perPage(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $authUser = $request->user();
        $storeId = (int) $authUser->store_id;

        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'email' => ['required', 'email', 'max:190', Rule::unique('users', 'email')],
            'username' => ['nullable', 'string', 'max:60', Rule::unique('users', 'username')],
            'phone' => ['nullable', 'string', 'max:40'],
            'password' => ['required', 'string', 'min:6'],
            'role_id' => [
                'required',
                'integer',
                Rule::exists('shop_roles', 'id')->where('store_id', $storeId),
            ],
            'is_active' => ['boolean'],
        ]);

        $role = ShopRole::query()
            ->where('store_id', $storeId)
            ->findOrFail($data['role_id']);

        $roleSlug = Str::slug($role->name, '_');
        if (in_array($roleSlug, ['super_admin', 'owner'], true) && ! $authUser->isOwner() && ! $authUser->isSuperAdmin()) {
            throw ValidationException::withMessages([
                'role_id' => 'You cannot assign administrative owner roles.',
            ]);
        }

        $user = User::create([
            'store_id' => $storeId,
            'role_id' => $role->id,
            'role' => $roleSlug ?: 'staff',
            'name' => $data['name'],
            'email' => $data['email'],
            'username' => $data['username'] ?: Str::before($data['email'], '@'),
            'phone' => $data['phone'] ?? null,
            'password' => $data['password'],
            'is_active' => $data['is_active'] ?? true,
        ]);

        AuditLog::record(
            storeId: $storeId,
            userId: $authUser->id,
            action: 'staff.create',
            targetType: 'User',
            targetId: $user->id,
            details: [
                'name' => $user->name,
                'email' => $user->email,
                'role' => $role->name,
            ]
        );

        return response()->json([
            'message' => "Staff member {$user->name} created successfully.",
            'user' => $user->load('shopRole'),
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $storeId = (int) $request->user()->store_id;

        $user = User::query()
            ->with('shopRole')
            ->where('store_id', $storeId)
            ->findOrFail($id);

        $activity = AuditLog::query()
            ->where('store_id', $storeId)
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->id)
                    ->orWhere(fn ($sub) => $sub->where('target_type', 'User')->where('target_id', $user->id));
            })
            ->latest()
            ->limit(10)
            ->get();

        return response()->json([
            'user' => $user,
            'activity' => $activity,
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user();
        $storeId = (int) $authUser->store_id;

        $user = User::query()
            ->where('store_id', $storeId)
            ->findOrFail($id);

        $store = $user->store;
        $isStoreOwner = $store && $store->owner_id === $user->id;

        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'email' => ['required', 'email', 'max:190', Rule::unique('users', 'email')->ignore($user->id)],
            'username' => ['nullable', 'string', 'max:60', Rule::unique('users', 'username')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:40'],
            'role_id' => [
                'required',
                'integer',
                Rule::exists('shop_roles', 'id')->where('store_id', $storeId),
            ],
            'is_active' => ['boolean'],
            'password' => ['nullable', 'string', 'min:6'],
        ]);

        if ($isStoreOwner && $data['role_id'] != $user->role_id) {
            throw ValidationException::withMessages([
                'role_id' => 'The Store Owner role cannot be changed.',
            ]);
        }

        if ($isStoreOwner && isset($data['is_active']) && ! $data['is_active']) {
            throw ValidationException::withMessages([
                'is_active' => 'The Store Owner account cannot be deactivated.',
            ]);
        }

        $role = ShopRole::query()
            ->where('store_id', $storeId)
            ->findOrFail($data['role_id']);

        $roleSlug = Str::slug($role->name, '_');

        $updateData = [
            'name' => $data['name'],
            'email' => $data['email'],
            'username' => ! empty($data['username']) ? $data['username'] : ($user->username ?: Str::before($data['email'], '@')),
            'phone' => array_key_exists('phone', $data) ? $data['phone'] : $user->phone,
            'role_id' => $role->id,
            'role' => $isStoreOwner ? 'owner' : ($roleSlug ?: 'staff'),
            'is_active' => $data['is_active'] ?? $user->is_active,
        ];

        if (! empty($data['password'])) {
            $updateData['password'] = $data['password'];
        }

        $user->update($updateData);

        AuditLog::record(
            storeId: $storeId,
            userId: $authUser->id,
            action: 'staff.update',
            targetType: 'User',
            targetId: $user->id,
            details: [
                'updated_fields' => array_keys($data),
                'role' => $role->name,
                'is_active' => $user->is_active,
            ]
        );

        return response()->json([
            'message' => "Staff member {$user->name} updated successfully.",
            'user' => $user->fresh(['shopRole']),
        ]);
    }

    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user();
        $storeId = (int) $authUser->store_id;

        $user = User::query()
            ->where('store_id', $storeId)
            ->findOrFail($id);

        $store = $user->store;
        if ($store && $store->owner_id === $user->id) {
            throw ValidationException::withMessages([
                'user' => 'The Store Owner account cannot be deactivated.',
            ]);
        }

        if ($authUser->id === $user->id) {
            throw ValidationException::withMessages([
                'user' => 'You cannot deactivate your own account.',
            ]);
        }

        $user->update([
            'is_active' => ! $user->is_active,
        ]);

        $statusStr = $user->is_active ? 'activated' : 'deactivated';

        AuditLog::record(
            storeId: $storeId,
            userId: $authUser->id,
            action: "staff.{$statusStr}",
            targetType: 'User',
            targetId: $user->id,
            details: ['is_active' => $user->is_active]
        );

        return response()->json([
            'message' => "Account for {$user->name} has been {$statusStr}.",
            'is_active' => $user->is_active,
        ]);
    }

    public function resetPassword(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user();
        $storeId = (int) $authUser->store_id;

        $user = User::query()
            ->where('store_id', $storeId)
            ->findOrFail($id);

        $data = $request->validate([
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        $user->update([
            'password' => $data['password'],
        ]);

        AuditLog::record(
            storeId: $storeId,
            userId: $authUser->id,
            action: 'staff.password_reset',
            targetType: 'User',
            targetId: $user->id
        );

        return response()->json([
            'message' => "Password for {$user->name} reset successfully.",
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user();
        $storeId = (int) $authUser->store_id;

        $user = User::query()
            ->where('store_id', $storeId)
            ->findOrFail($id);

        $store = $user->store;
        if ($store && $store->owner_id === $user->id) {
            throw ValidationException::withMessages([
                'user' => 'The Store Owner account cannot be deleted.',
            ]);
        }

        if ($authUser->id === $user->id) {
            throw ValidationException::withMessages([
                'user' => 'You cannot delete your own account.',
            ]);
        }

        $userName = $user->name;
        $user->delete();

        AuditLog::record(
            storeId: $storeId,
            userId: $authUser->id,
            action: 'staff.delete',
            targetType: 'User',
            targetId: $id,
            details: ['name' => $userName]
        );

        return response()->json([
            'message' => "Staff account {$userName} was deleted successfully.",
        ]);
    }
}
