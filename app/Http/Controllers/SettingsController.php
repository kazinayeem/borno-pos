<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\Setting;
use App\Models\Store;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SettingsController extends Controller
{
    public function profile()
    {
        return view('settings.profile');
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

        return back()->with('status', 'Profile updated.');
    }

    public function general()
    {
        return view('settings.general', [
            'settings' => $this->bag($requestStore = auth()->user()->store_id),
            'store' => auth()->user()->store,
        ]);
    }

    public function updateGeneral(Request $request)
    {
        $data = $request->validate([
            'shop_name' => ['required', 'string', 'max:160'],
            'phone' => ['nullable', 'string', 'max:40'],
            'address' => ['nullable', 'string', 'max:255'],
            'invoice_footer' => ['nullable', 'string', 'max:500'],
            'currency_symbol' => ['required', 'string', 'max:8'],
        ]);
        $store = $request->user()->store;
        if ($store) {
            $store->update([
                'name' => $data['shop_name'],
                'phone' => $data['phone'] ?? null,
                'address' => $data['address'] ?? null,
                'currency_symbol' => $data['currency_symbol'],
            ]);
        }
        $this->put($request->user()->store_id, 'invoice_footer', $data['invoice_footer'] ?? '');

        return back()->with('status', 'General settings saved.');
    }

    public function modules()
    {
        $saved = json_decode((string) $this->get(auth()->user()->store_id, 'modules'), true) ?: [];

        return view('settings.modules', [
            'modules' => array_merge($this->moduleDefaults(), $saved),
        ]);
    }

    public function updateModules(Request $request)
    {
        $modules = [];
        foreach (array_keys($this->moduleDefaults()) as $key) {
            $modules[$key] = $request->boolean($key);
        }
        $this->put($request->user()->store_id, 'modules', json_encode($modules));

        return back()->with('status', 'Business modules updated.');
    }

    public function gateway()
    {
        $saved = json_decode((string) $this->get(auth()->user()->store_id, 'gateways'), true) ?: [];

        return view('settings.gateway', [
            'gateways' => $saved,
            'names' => ['cash' => 'Cash', 'paystack' => 'Paystack', 'razorpay' => 'Razorpay', 'paypal' => 'PayPal', 'stripe' => 'Stripe'],
        ]);
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
