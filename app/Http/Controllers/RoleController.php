<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\ShopRole;
use App\Services\RbacService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class RoleController extends Controller
{
    public function index(Request $request, RbacService $rbac): JsonResponse
    {
        $storeId = (int) $request->user()->store_id;

        $roles = ShopRole::query()
            ->withCount('users')
            ->where('store_id', $storeId)
            ->orderByDesc('is_system')
            ->orderBy('name')
            ->get();

        return response()->json([
            'roles' => $roles,
            'modules' => $rbac->getModules(),
            'all_permissions' => $rbac->getAllPermissionSlugs(),
        ]);
    }

    public function schema(RbacService $rbac): JsonResponse
    {
        return response()->json([
            'modules' => $rbac->getModules(),
            'all_permissions' => $rbac->getAllPermissionSlugs(),
            'default_roles' => $rbac->getDefaultRoleTemplates(),
        ]);
    }

    public function store(Request $request, RbacService $rbac): JsonResponse
    {
        $authUser = $request->user();
        $storeId = (int) $authUser->store_id;

        $data = $request->validate([
            'name' => [
                'required',
                'string',
                'max:80',
                Rule::unique('shop_roles', 'name')->where('store_id', $storeId),
            ],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string'],
        ]);

        $validSlugs = $rbac->getAllPermissionSlugs();
        $cleanedPermissions = array_values(array_intersect($data['permissions'] ?? [], $validSlugs));

        $role = ShopRole::create([
            'store_id' => $storeId,
            'name' => trim($data['name']),
            'description' => $data['description'] ?? null,
            'is_system' => false,
            'permissions' => $cleanedPermissions,
        ]);

        AuditLog::record(
            storeId: $storeId,
            userId: $authUser->id,
            action: 'role.create',
            targetType: 'ShopRole',
            targetId: $role->id,
            details: [
                'name' => $role->name,
                'permissions_count' => count($cleanedPermissions),
            ]
        );

        return response()->json([
            'message' => "Role '{$role->name}' created successfully.",
            'role' => $role->loadCount('users'),
        ], 201);
    }

    public function show(Request $request, int $id, RbacService $rbac): JsonResponse
    {
        $storeId = (int) $request->user()->store_id;

        $role = ShopRole::query()
            ->with(['users:id,name,email,username,role,is_active,role_id'])
            ->withCount('users')
            ->where('store_id', $storeId)
            ->findOrFail($id);

        return response()->json([
            'role' => $role,
            'modules' => $rbac->getModules(),
        ]);
    }

    public function update(Request $request, int $id, RbacService $rbac): JsonResponse
    {
        $authUser = $request->user();
        $storeId = (int) $authUser->store_id;

        $role = ShopRole::query()
            ->where('store_id', $storeId)
            ->findOrFail($id);

        $data = $request->validate([
            'name' => [
                'required',
                'string',
                'max:80',
                Rule::unique('shop_roles', 'name')->where('store_id', $storeId)->ignore($role->id),
            ],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string'],
        ]);

        $validSlugs = $rbac->getAllPermissionSlugs();
        $cleanedPermissions = array_values(array_intersect($data['permissions'] ?? [], $validSlugs));

        $updatePayload = [
            'description' => $data['description'] ?? null,
            'permissions' => $cleanedPermissions,
        ];

        // For non-system roles, allow changing name
        if (! $role->is_system) {
            $updatePayload['name'] = trim($data['name']);
        }

        $role->update($updatePayload);

        AuditLog::record(
            storeId: $storeId,
            userId: $authUser->id,
            action: 'role.update',
            targetType: 'ShopRole',
            targetId: $role->id,
            details: [
                'name' => $role->name,
                'permissions_count' => count($cleanedPermissions),
            ]
        );

        return response()->json([
            'message' => "Role '{$role->name}' updated successfully.",
            'role' => $role->fresh(['users'])->loadCount('users'),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user();
        $storeId = (int) $authUser->store_id;

        $role = ShopRole::query()
            ->where('store_id', $storeId)
            ->findOrFail($id);

        if ($role->is_system) {
            throw ValidationException::withMessages([
                'role' => "System role '{$role->name}' is protected and cannot be deleted.",
            ]);
        }

        $assignedCount = $role->users()->count();
        if ($assignedCount > 0) {
            throw ValidationException::withMessages([
                'role' => "Cannot delete role '{$role->name}' because {$assignedCount} staff member(s) are assigned to it. Reassign them first.",
            ]);
        }

        $roleName = $role->name;
        $role->delete();

        AuditLog::record(
            storeId: $storeId,
            userId: $authUser->id,
            action: 'role.delete',
            targetType: 'ShopRole',
            targetId: $id,
            details: ['name' => $roleName]
        );

        return response()->json([
            'message' => "Role '{$roleName}' deleted successfully.",
        ]);
    }
}
