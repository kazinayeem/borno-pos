<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\PurchaseItem;
use App\Models\SaleItem;
use App\Models\Tax;
use App\Models\Unit;
use App\Models\Warehouse;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $products = Product::query()->with(['brand', 'category', 'unit'])
            ->when($request->filled('q'), function ($query) use ($request) {
                $term = $request->string('q');
                $query->where(function ($inner) use ($term) {
                    $inner->where('name', 'like', "%{$term}%")
                        ->orWhere('code', 'like', "%{$term}%");
                });
            })
            ->when($request->filled('category_id'), fn ($q) => $q->where('category_id', $request->integer('category_id')))
            ->when($request->filled('brand_id'), fn ($q) => $q->where('brand_id', $request->integer('brand_id')))
            ->when($request->string('status') == 'active', fn ($q) => $q->where('is_active', true))
            ->when($request->string('status') == 'inactive', fn ($q) => $q->where('is_active', false))
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return view('products.index', [
            'products' => $products,
            'categories' => Category::orderBy('name')->get(),
            'brands' => Brand::orderBy('name')->get(),
        ]);
    }

    public function create()
    {
        return view('products.form', ['product' => new Product(['featured_in_pos' => true, 'is_active' => true, 'type' => 'standard']), 'variants' => collect()] + $this->lookups());
    }

    public function store(Request $request)
    {
        $product = $this->persist($request, new Product);

        return redirect()->route('products.show', $product)->with('status', 'Product saved.');
    }

    public function show(Product $product)
    {
        $product->load(['category', 'brand', 'unit', 'tax', 'warehouse', 'variants', 'movements' => fn ($q) => $q->latest()->limit(20)]);

        return view('products.show', compact('product'));
    }

    public function edit(Product $product)
    {
        return view('products.form', ['product' => $product, 'variants' => $product->variants] + $this->lookups());
    }

    public function update(Request $request, Product $product)
    {
        $this->persist($request, $product);

        return redirect()->route('products.show', $product)->with('status', 'Product updated.');
    }

    public function destroy(Product $product)
    {
        $used = SaleItem::where('product_id', $product->id)->exists() || PurchaseItem::where('product_id', $product->id)->exists();
        if ($used) {
            $product->update(['is_active' => false]);

            return back()->with('status', 'This product is used on transactions, so it was deactivated instead of deleted.');
        }
        if ($product->image) {
            Storage::disk('public')->delete($product->image);
        }
        $product->delete();

        return redirect()->route('products.index')->with('status', 'Product deleted.');
    }

    public function barcode(Request $request)
    {
        $products = Product::query()->orderBy('name')->get();
        $selected = $request->input('ids', []);

        return view('products.barcode', [
            'products' => $products,
            'selected' => Product::whereIn('id', $selected)->get(),
        ]);
    }

    private function persist(Request $request, Product $product): Product
    {
        $storeId = $request->user()->store_id;
        $data = $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'type' => ['required', Rule::in(['standard', 'combo', 'digital', 'service'])],
            'code' => ['required', 'string', 'max:60', Rule::unique('products', 'code')->where('store_id', $storeId)->ignore($product->id)],
            'brand_id' => ['required', Rule::exists('brands', 'id')->where('store_id', $storeId)],
            'category_id' => ['required', Rule::exists('categories', 'id')->where('store_id', $storeId)],
            'unit_id' => ['required', Rule::exists('units', 'id')->where('store_id', $storeId)],
            'sale_unit_id' => ['nullable', Rule::exists('units', 'id')->where('store_id', $storeId)],
            'purchase_unit_id' => ['nullable', Rule::exists('units', 'id')->where('store_id', $storeId)],
            'warehouse_id' => ['nullable', Rule::exists('warehouses', 'id')->where('store_id', $storeId)],
            'cost' => ['required'],
            'price' => ['required'],
            'promo_price' => ['nullable'],
            'alert_qty' => ['nullable', 'integer', 'min:0'],
            'description' => ['nullable', 'string', 'max:5000'],
            'tax_id' => ['nullable', Rule::exists('taxes', 'id')->where('store_id', $storeId)],
            'tax_method' => ['nullable', Rule::in(['exclusive', 'inclusive'])],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'remove_image' => ['nullable', 'boolean'],
            'variants' => ['nullable', 'array'],
            'variants.*.name' => ['nullable', 'string', 'max:120'],
            'variants.*.sku' => ['nullable', 'string', 'max:60'],
            'variants.*.price' => ['nullable'],
            'variants.*.stock_qty' => ['nullable', 'integer', 'min:0'],
        ]);

        return DB::transaction(function () use ($request, $product, $data, $storeId) {
            $payload = [
                'store_id' => $storeId,
                'name' => $data['name'],
                'type' => $data['type'],
                'code' => $data['code'],
                'brand_id' => $data['brand_id'],
                'category_id' => $data['category_id'],
                'unit_id' => $data['unit_id'],
                'sale_unit_id' => $data['sale_unit_id'] ?? null ?: null,
                'purchase_unit_id' => $data['purchase_unit_id'] ?? null ?: null,
                'warehouse_id' => ($data['warehouse_id'] ?? null) ?: $product->warehouse_id,
                'tax_id' => ($data['tax_id'] ?? null) ?: null,
                'tax_method' => $data['tax_method'] ?? 'exclusive',
                'cost_cents' => Money::parse($data['cost']),
                'price_cents' => Money::parse($data['price']),
                'promo_price_cents' => $request->boolean('has_promo') ? Money::parse($data['promo_price'] ?? 0) : null,
                'alert_qty' => (int) ($data['alert_qty'] ?? 0),
                'description' => $data['description'] ?? null,
                'is_active' => $request->boolean('is_active', true),
                'featured_in_pos' => $request->boolean('featured_in_pos'),
                'has_serial' => $request->boolean('has_serial'),
                'has_batch' => $request->boolean('has_batch'),
                'has_variant' => $request->boolean('has_variant'),
            ];

            if ($request->boolean('remove_image') && $product->image) {
                Storage::disk('public')->delete($product->image);
                $payload['image'] = null;
            }
            if ($request->hasFile('image')) {
                if ($product->image) {
                    Storage::disk('public')->delete($product->image);
                }
                $payload['image'] = $request->file('image')->store('products', 'public');
            }

            $product->exists ? $product->update($payload) : $product->fill($payload)->save();

            if ($product->has_variant) {
                $keep = [];
                foreach ($data['variants'] ?? [] as $variant) {
                    if (blank($variant['name'] ?? null)) {
                        continue;
                    }
                    $values = [
                        'store_id' => $storeId,
                        'name' => $variant['name'],
                        'sku' => $variant['sku'] ?? null,
                        'price_cents' => Money::parse($variant['price'] ?? 0),
                        'stock_qty' => (int) ($variant['stock_qty'] ?? 0),
                    ];
                    $existing = ! empty($variant['id']) ? $product->variants()->find($variant['id']) : null;
                    $row = $existing ? tap($existing)->update($values) : $product->variants()->create($values);
                    $keep[] = $row->id;
                }
                $product->variants()->whereNotIn('id', $keep ?: [0])->delete();
            }

            return $product;
        });
    }

    private function lookups(): array
    {
        return [
            'categories' => Category::orderBy('name')->get(),
            'brands' => Brand::orderBy('name')->get(),
            'units' => Unit::orderBy('name')->get(),
            'warehouses' => Warehouse::orderBy('name')->get(),
            'taxes' => Tax::orderBy('name')->get(),
        ];
    }

    public function suggestCode(): never
    {
        abort(404);
    }
}
