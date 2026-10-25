<?php

namespace App\Http\Controllers;

use App\Models\Currency;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SettingsController extends Controller
{
    public function profile(Request $request)
    {
        $user = $request->user();
        if ($request->expectsJson()) {
            return response()->json([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'role' => $user->role,
                ],
            ]);
        }

        return view('spa');
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:40'],
            'email' => ['required', 'email', 'max:190', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
        ]);
        $user->fill([
            'name' => $data['name'],
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'],
        ]);
        if (! empty($data['password'])) {
            $user->password = $data['password'];
        }
        $user->save();

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Profile updated.',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'role' => $user->role,
                ],
            ]);
        }

        return back()->with('status', 'Profile updated.');
    }

    public function general(Request $request)
    {
        $store = $request->user()->store;
        $settings = $this->bag($request->user()->store_id);
        $currencies = Currency::orderBy('name')->get();

        if ($request->expectsJson()) {
            return response()->json([
                'settings' => $settings,
                'store' => $store,
                'currencies' => $currencies,
            ]);
        }

        return view('spa');
    }

    public function updateGeneral(Request $request)
    {
        $data = $request->validate([
            'shop_name' => ['required', 'string', 'max:160'],
            'phone' => ['nullable', 'string', 'max:40'],
            'address' => ['nullable', 'string', 'max:255'],
            'invoice_footer' => ['nullable', 'string', 'max:500'],
            'currency_symbol' => ['required', 'string', 'max:8'],
            'currency_code' => ['nullable', 'string', 'max:8'],
        ]);
        $store = $request->user()->store;
        if ($store) {
            $store->update([
                'name' => $data['shop_name'],
                'phone' => $data['phone'] ?? null,
                'address' => $data['address'] ?? null,
                'currency_symbol' => $data['currency_symbol'],
                'currency_code' => $data['currency_code'] ?? $store->currency_code,
            ]);
        }
        $this->put($request->user()->store_id, 'invoice_footer', $data['invoice_footer'] ?? '');

        if ($request->expectsJson()) {
            return response()->json(['message' => 'General settings saved.', 'store' => $store]);
        }

        return back()->with('status', 'General settings saved.');
    }

    public function setStoreCurrency(Request $request)
    {
        $data = $request->validate([
            'currency_code' => ['required', 'string', 'max:8'],
            'currency_symbol' => ['required', 'string', 'max:8'],
        ]);
        $store = $request->user()->store;
        if ($store) {
            $store->update([
                'currency_code' => $data['currency_code'],
                'currency_symbol' => $data['currency_symbol'],
            ]);
        }

        return response()->json([
            'message' => 'Store currency updated to '.$data['currency_code'].' ('.$data['currency_symbol'].').',
            'currency_code' => $store?->currency_code,
            'currency_symbol' => $store?->symbol(),
        ]);
    }

    public function modules(Request $request)
    {
        $saved = json_decode((string) $this->get($request->user()->store_id, 'modules'), true) ?: [];
        $modules = array_merge($this->moduleDefaults(), $saved);

        if ($request->expectsJson()) {
            return response()->json([
                'modules' => $modules,
            ]);
        }

        return view('spa');
    }

    public function updateModules(Request $request)
    {
        $modules = [];
        foreach (array_keys($this->moduleDefaults()) as $key) {
            $modules[$key] = $request->boolean($key);
        }
        $this->put($request->user()->store_id, 'modules', json_encode($modules));

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Business modules updated.', 'modules' => $modules]);
        }

        return back()->with('status', 'Business modules updated.');
    }

    public function gateway(Request $request)
    {
        $saved = json_decode((string) $this->get($request->user()->store_id, 'gateways'), true) ?: [];

        if ($request->expectsJson()) {
            return response()->json([
                'gateways' => $saved,
                'names' => ['cash' => 'Cash', 'paystack' => 'Paystack', 'razorpay' => 'Razorpay', 'paypal' => 'PayPal', 'stripe' => 'Stripe'],
            ]);
        }

        return view('spa');
    }

    public function updateGateway(Request $request)
    {
        $payload = [];
        foreach (['cash', 'paystack', 'razorpay', 'paypal', 'stripe'] as $name) {
            $payload[$name] = [
                'enabled' => $request->boolean($name.'_enabled'),
                'note' => 'Credentials are stored for this shop only. BornoPos does not charge an external gateway.',
            ];
        }
        $this->put($request->user()->store_id, 'gateways', json_encode($payload));

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Payment methods saved. No external payment was processed.', 'gateways' => $payload]);
        }

        return back()->with('status', 'Payment methods saved. No external payment was processed.');
    }

    public function mail()
    {
        return view('settings.mail', [
            'mail' => json_decode((string) Setting::withoutGlobalScopes()->whereNull('store_id')->where('key', 'mail')->value('value'), true) ?: [],
        ]);
    }

    public function updateMail(Request $request)
    {
        $data = $request->validate([
            'host' => ['nullable', 'string', 'max:190'],
            'port' => ['nullable', 'integer'],
            'username' => ['nullable', 'string', 'max:190'],
            'from' => ['nullable', 'email'],
        ]);
        Setting::withoutGlobalScopes()->updateOrCreate(
            ['store_id' => null, 'key' => 'mail'],
            ['value' => json_encode($data)],
        );

        return back()->with('status', 'Mail settings stored. Messages are not sent until a mailer is connected.');
    }

    public function language()
    {
        return view('settings.language');
    }

    public static function modulesFor(?int $storeId): array
    {
        $controller = new self;
        $saved = json_decode((string) $controller->get($storeId, 'modules'), true) ?: [];

        return array_merge($controller->moduleDefaults(), $saved);
    }

    private function moduleDefaults(): array
    {
        return [
            'product' => true, 'purchase' => true, 'accounting' => true, 'sales' => true,
            'expense' => true, 'hrm' => true, 'people' => true, 'reports' => true,
            'subscriptions' => true, 'store' => true,
            'batch' => true, 'serial' => true, 'variants' => true, 'recipe' => true,
            'warranty' => true, 'emi' => true,
        ];
    }

    private function bag(?int $storeId): array
    {
        return Setting::withoutGlobalScopes()->where('store_id', $storeId)->pluck('value', 'key')->all();
    }

    private function get(?int $storeId, string $key): ?string
    {
        return Setting::withoutGlobalScopes()->where('store_id', $storeId)->where('key', $key)->value('value');
    }

    private function put(?int $storeId, string $key, ?string $value): void
    {
        Setting::withoutGlobalScopes()->updateOrCreate(
            ['store_id' => $storeId, 'key' => $key],
            ['value' => $value],
        );
    }
}
