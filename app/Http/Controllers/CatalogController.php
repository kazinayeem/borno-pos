<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Currency;
use App\Models\Customer;
use App\Models\CustomerGroup;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Holiday;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\ShopRole;
use App\Models\Supplier;
use App\Models\Tax;
use App\Models\Unit;
use App\Models\Warehouse;
use App\Support\Money;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class CatalogController extends Controller
{
    public function index(Request $request)
    {
        $def = $this->definition($request);
        $query = $def['model']::query()->latest();
        if ($search = trim($request->string('q'))) {
            $query->where(function ($inner) use ($def, $search) {
                foreach ($def['search'] as $column) {
                    $inner->orWhere($column, 'like', "%{$search}%");
                }
            });
        }
        if (! empty($def['with'])) {
            $query->with($def['with']);
        }

        $rows = $query->paginate(15)->withQueryString();

        if ($request->expectsJson()) {
            return response()->json($this->payload($def, $rows));
        }

        return view('spa');
    }

    public function create(Request $request)
    {
        if ($request->expectsJson()) {
            return response()->json($this->payload($this->definition($request)));
        }

        return view('spa');
    }

    public function store(Request $request)
    {
        $def = $this->definition($request);
        $row = $def['model']::create($this->validatePayload($request, $def));

        if ($request->expectsJson()) {
            return response()->json(['row' => $row, 'message' => $def['singular'].' saved.']);
        }

        return redirect()->route($def['route'].'.index')->with('status', $def['singular'].' saved.');
    }

    public function edit(Request $request, int $id)
    {
        $def = $this->definition($request);
        $row = $def['model']::query()->findOrFail($id);

        if ($request->expectsJson()) {
            return response()->json($this->payload($def, null, $row));
        }

        return view('spa');
    }

    public function update(Request $request, int $id)
    {
        $def = $this->definition($request);
        $row = $def['model']::query()->findOrFail($id);
        $row->update($this->validatePayload($request, $def, $row));

        if ($request->expectsJson()) {
            return response()->json(['row' => $row->fresh(), 'message' => $def['singular'].' updated.']);
        }

        return redirect()->route($def['route'].'.index')->with('status', $def['singular'].' updated.');
    }

    public function destroy(Request $request, int $id)
    {
        $def = $this->definition($request);

        if ($dependencyError = $this->checkDependencies($def['route'], $id)) {
            if ($request->expectsJson()) {
                return response()->json(['message' => $dependencyError], 422);
            }

            return back()->withErrors(['dependency' => $dependencyError]);
        }

        $def['model']::query()->findOrFail($id)->delete();

        if ($request->expectsJson()) {
            return response()->json(['message' => $def['singular'].' deleted.']);
        }

        return redirect()->route($def['route'].'.index')->with('status', $def['singular'].' deleted.');
    }

    private function checkDependencies(string $route, int $id): ?string
    {
        return match ($route) {
            'categories' => Product::where('category_id', $id)->exists()
                ? 'Cannot delete Category: Products are currently assigned to it. Reassign or remove the products first.'
                : null,
            'brands' => Product::where('brand_id', $id)->exists()
                ? 'Cannot delete Brand: Products are currently linked to this brand.'
                : null,
            'units' => Product::where('unit_id', $id)->orWhere('purchase_unit_id', $id)->orWhere('sale_unit_id', $id)->exists()
                ? 'Cannot delete Unit: Products are currently measured in this unit.'
                : null,
            'warehouses' => (Product::where('warehouse_id', $id)->exists() || Purchase::where('warehouse_id', $id)->exists())
                ? 'Cannot delete Warehouse: It has active inventory or purchase records associated with it.'
                : null,
            'suppliers' => (Purchase::where('supplier_id', $id)->exists() || Product::where('supplier_id', $id)->exists())
                ? 'Cannot delete Supplier: Purchases or products are linked to this supplier.'
                : null,
            'customers' => Sale::where('customer_id', $id)->exists()
                ? 'Cannot delete Customer: Existing sales transactions or invoices are linked to this customer.'
                : null,
            'customer-groups' => Customer::where('customer_group_id', $id)->exists()
                ? 'Cannot delete Customer Group: Customers are assigned to this group.'
                : null,
            'departments' => Employee::where('department_id', $id)->exists()
                ? 'Cannot delete Department: Employees are currently assigned to it.'
                : null,
            'expense-categories' => Expense::where('expense_category_id', $id)->exists()
                ? 'Cannot delete Expense Category: Historical expenses are recorded under this category.'
                : null,
            default => null,
        };
    }

    private function payload(array $def, $rows = null, $row = null): array
    {
        $body = [
            'title' => $def['title'],
            'singular' => $def['singular'],
            'fields' => collect($def['fields'])->map(fn ($field) => collect($field)->except('rules'))->values(),
            'options' => $def['options'],
            'row' => $row,
        ];
        if ($rows) {
            $body['data'] = $rows->items();
            $body['meta'] = [
                'current_page' => $rows->currentPage(),
                'last_page' => $rows->lastPage(),
                'from' => $rows->firstItem(),
                'to' => $rows->lastItem(),
                'total' => $rows->total(),
            ];
        }

        return $body;
    }

    private function validatePayload(Request $request, array $def, ?Model $row = null): array
    {
        $rules = [];
        foreach ($def['fields'] as $field) {
            $rules[$field['name']] = $field['rules'];
            if (in_array($field['type'] ?? 'text', ['select', 'date'], true) && $request->input($field['name']) === '') {
                $request->merge([$field['name'] => null]);
            }
        }
        if (isset($rules['code']) && $row) {
            $rules['code'] = ['required', 'string', 'max:40', Rule::unique('currencies', 'code')->ignore($row->id)];
        }
        $validated = Validator::make($request->all(), $rules)->validate();
        foreach ($def['fields'] as $field) {
            if (($field['type'] ?? 'text') === 'money') {
                $validated[$field['name']] = Money::parse($validated[$field['name']] ?? 0);
            }
            if (($field['type'] ?? '') === 'checks') {
                $validated[$field['name']] = array_values($request->input($field['name'], []));
            }
            if (($field['type'] ?? '') === 'checkbox') {
                $validated[$field['name']] = $request->boolean($field['name']);
            }
        }

        return $validated;
    }

    private function definition(Request $request): array
    {
        $key = $request->route('resource');
        $all = $this->definitions();
        abort_unless(isset($all[$key]), 404);
        $def = $all[$key];
        $def['key'] = $key;
        $def['options'] = [];
        foreach ($def['fields'] as $field) {
            if (($field['source'] ?? null) === 'departments') {
                $def['options'][$field['name']] = Department::orderBy('name')->pluck('name', 'id');
            }
            if (($field['source'] ?? null) === 'groups') {
                $def['options'][$field['name']] = CustomerGroup::orderBy('name')->pluck('name', 'id');
            }
        }

        return $def;
    }

    private function definitions(): array
    {
        $text = fn (string $name, string $label, string $rules = 'required|string|max:160') => [
            'name' => $name, 'label' => $label, 'type' => 'text', 'rules' => $rules,
        ];

        return [
            'categories' => $this->pack(Category::class, 'Categories', 'Category', 'categories', 'Product', [$text('name', 'Name')], ['name']),
            'brands' => $this->pack(Brand::class, 'Brands', 'Brand', 'brands', 'Product', [$text('name', 'Name')], ['name']),
            'units' => $this->pack(Unit::class, 'Units', 'Unit', 'units', 'Product', [
                $text('name', 'Name'),
                $text('short_name', 'Short name', 'required|string|max:20'),
            ], ['name', 'short_name']),
            'warehouses' => $this->pack(Warehouse::class, 'Warehouses', 'Warehouse', 'warehouses', 'Product', [
                $text('name', 'Name'),
                $text('phone', 'Phone', 'nullable|string|max:40'),
                $text('address', 'Address', 'nullable|string|max:255'),
            ], ['name', 'phone']),
            'taxes' => $this->pack(Tax::class, 'Taxes', 'Tax', 'taxes', 'Settings', [
                $text('name', 'Name'),
                ['name' => 'rate_bps', 'label' => 'Rate (basis points, 1500 = 15%)', 'type' => 'number', 'rules' => 'required|integer|min:0|max:10000'],
            ], ['name']),
            'currencies' => $this->pack(Currency::class, 'Currencies', 'Currency', 'currencies', 'Settings', [
                $text('name', 'Name'),
                ['name' => 'code', 'label' => 'Code', 'type' => 'text', 'rules' => 'required|string|max:8|unique:currencies,code'],
                $text('symbol', 'Symbol', 'required|string|max:8'),
                ['name' => 'rate_bps', 'label' => 'Rate (10000 = 1.00)', 'type' => 'number', 'rules' => 'required|integer|min:1'],
            ], ['name', 'code']),
            'coupons' => $this->pack(Coupon::class, 'Coupons', 'Coupon', 'coupons', 'Settings', [
                $text('code', 'Code'),
                ['name' => 'type', 'label' => 'Type', 'type' => 'select', 'rules' => 'required|in:fixed,percent', 'choices' => ['fixed' => 'Fixed amount (cents)', 'percent' => 'Percent (basis points)']],
                ['name' => 'value', 'label' => 'Value', 'type' => 'number', 'rules' => 'required|integer|min:0'],
                ['name' => 'expires_on', 'label' => 'Expires on', 'type' => 'date', 'rules' => 'nullable|date'],
                ['name' => 'is_active', 'label' => 'Active', 'type' => 'checkbox', 'rules' => 'nullable'],
            ], ['code']),
            'departments' => $this->pack(Department::class, 'Departments', 'Department', 'departments', 'HRM', [$text('name', 'Name')], ['name']),
            'roles' => $this->pack(ShopRole::class, 'Role Permission', 'Role', 'roles', 'HRM', [
                $text('name', 'Role name'),
                ['name' => 'permissions', 'label' => 'Permissions', 'type' => 'checks', 'rules' => 'nullable|array', 'choices' => [
                    'pos' => 'POS', 'products.view' => 'View products', 'products.manage' => 'Manage products',
                    'sales.view' => 'View sales', 'purchases.manage' => 'Manage purchases', 'reports.view' => 'Reports',
                ]],
            ], ['name']),
            'employees' => $this->pack(Employee::class, 'Employees', 'Employee', 'employees', 'HRM', [
                $text('name', 'Name'),
                $text('email', 'Email', 'nullable|email|max:190'),
                $text('phone', 'Phone', 'nullable|string|max:40'),
                ['name' => 'department_id', 'label' => 'Department', 'type' => 'select', 'rules' => 'nullable|integer', 'source' => 'departments'],
                ['name' => 'salary_cents', 'label' => 'Monthly salary', 'type' => 'money', 'rules' => 'required'],
                ['name' => 'joined_on', 'label' => 'Joined on', 'type' => 'date', 'rules' => 'nullable|date'],
            ], ['name', 'email', 'phone'], ['department']),
            'holidays' => $this->pack(Holiday::class, 'Holidays', 'Holiday', 'holidays', 'HRM', [
                $text('name', 'Name'),
                ['name' => 'starts_on', 'label' => 'Starts on', 'type' => 'date', 'rules' => 'required|date'],
                ['name' => 'ends_on', 'label' => 'Ends on', 'type' => 'date', 'rules' => 'required|date|after_or_equal:starts_on'],
            ], ['name']),
            'customers' => $this->pack(Customer::class, 'Customers', 'Customer', 'customers', 'People', [
                $text('name', 'Name'),
                $text('phone', 'Phone', 'nullable|string|max:40'),
                $text('email', 'Email', 'nullable|email|max:190'),
                ['name' => 'customer_group_id', 'label' => 'Group', 'type' => 'select', 'rules' => 'nullable|integer', 'source' => 'groups'],
                $text('address', 'Address', 'nullable|string|max:255'),
            ], ['name', 'phone', 'email'], ['group']),
            'customer-groups' => $this->pack(CustomerGroup::class, 'Customer Groups', 'Customer group', 'customer-groups', 'People', [
                $text('name', 'Name'),
                ['name' => 'discount_bps', 'label' => 'Discount (basis points)', 'type' => 'number', 'rules' => 'nullable|integer|min:0|max:10000'],
            ], ['name']),
            'suppliers' => $this->pack(Supplier::class, 'Suppliers', 'Supplier', 'suppliers', 'People', [
                $text('name', 'Name'),
                $text('company', 'Company', 'nullable|string|max:160'),
                $text('phone', 'Phone', 'nullable|string|max:40'),
                $text('email', 'Email', 'nullable|email|max:190'),
                $text('address', 'Address', 'nullable|string|max:255'),
            ], ['name', 'company', 'phone']),
            'expense-categories' => $this->pack(ExpenseCategory::class, 'Expense Categories', 'Expense category', 'expense-categories', 'Expense', [
                $text('name', 'Name'),
            ], ['name']),
        ];
    }

    private function pack(string $model, string $title, string $singular, string $route, string $group, array $fields, array $search, array $with = []): array
    {
        return compact('model', 'title', 'singular', 'route', 'group', 'fields', 'search', 'with');
    }
}
