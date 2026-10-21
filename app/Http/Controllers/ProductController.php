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
            ->paginate(max(1, min(100, $request->integer('per_page', 10))))
            ->withQueryString();

        if ($request->expectsJson()) {
            return response()->json([
                'data' => $products->getCollection()->map(fn (Product $product) => [
                    'id' => $product->id,
                    'name' => $product->name,
                    'code' => $product->code,
                    'type' => $product->type,
                    'cost_cents' => $product->cost_cents,
                    'price_cents' => $product->price_cents,
                    'stock_qty' => $product->stock_qty,
                    'image' => $product->image ? '/storage/'.$product->image : null,
                    'brand' => $product->brand?->name,
                    'category' => $product->category?->name,
                    'unit' => $product->unit?->name,
                ])->values(),
                'meta' => [
                    'current_page' => $products->currentPage(),
                    'last_page' => $products->lastPage(),
                    'from' => $products->firstItem(),
                    'to' => $products->lastItem(),
                    'total' => $products->total(),
                    'per_page' => $products->perPage(),
                ],
                'categories' => Category::orderBy('name')->get(['id', 'name']),
                'brands' => Brand::orderBy('name')->get(['id', 'name']),
            ]);
        }

        return view('spa');
    }

    public function create(Request $request)
    {
        if ($request->expectsJson()) {
            return response()->json([
                'product' => [
                    'type' => 'standard',
                    'is_active' => true,
                    'featured_in_pos' => true,
                    'tax_method' => 'exclusive',
                    'variants' => [],
                ],
                'lookups' => $this->lookupPayload(),
            ]);
        }

        return view('spa');
    }

    public function store(Request $request)
    {
        $product = $this->persist($request, new Product);

        if ($request->expectsJson()) {
            return response()->json(['product' => $this->present($product), 'message' => 'Product saved.']);
        }

        return redirect()->route('products.show', $product)->with('status', 'Product saved.');
    }

    public function show(Request $request, Product $product)
    {
        $product->load(['category', 'brand', 'unit', 'tax', 'warehouse', 'variants', 'movements' => fn ($q) => $q->latest()->limit(20)]);

        if ($request->expectsJson()) {
            return response()->json(['product' => $this->present($product), 'lookups' => $this->lookupPayload()]);
        }

        return view('spa');
    }

    public function edit(Request $request, Product $product)
    {
        $product->load('variants');

        if ($request->expectsJson()) {
            return response()->json(['product' => $this->present($product), 'lookups' => $this->lookupPayload()]);
        }

        return view('spa');
    }

    public function update(Request $request, Product $product)
    {
        $this->persist($request, $product);

        if ($request->expectsJson()) {
            return response()->json(['product' => $this->present($product->fresh()), 'message' => 'Product updated.']);
        }

        return redirect()->route('products.show', $product)->with('status', 'Product updated.');
    }

    public function destroy(Request $request, Product $product)
    {
        $used = SaleItem::where('product_id', $product->id)->exists() || PurchaseItem::where('product_id', $product->id)->exists();
        if ($used) {
            $product->update(['is_active' => false]);
            $message = 'This product is used on transactions, so it was deactivated instead of deleted.';

            return $request->expectsJson()
                ? response()->json(['message' => $message, 'deactivated' => true])
                : back()->with('status', $message);
        }
        if ($product->image) {
            Storage::disk('public')->delete($product->image);
        }
        $product->delete();

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Product deleted.']);
        }

        return redirect()->route('products.index')->with('status', 'Product deleted.');
    }

    public function barcode(Request $request)
    {
        if ($request->expectsJson()) {
            return response()->json([
                'products' => Product::query()->orderBy('name')->get()->map(fn (Product $product) => [
                    'id' => $product->id,
                    'name' => $product->name,
                    'code' => $product->code,
                    'price_cents' => $product->sellingPriceCents(),
                ])->values(),
            ]);
        }

        return view('spa');
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

    private function lookupPayload(): array
    {
        return [
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'brands' => Brand::orderBy('name')->get(['id', 'name']),
            'units' => Unit::orderBy('name')->get(['id', 'name', 'short_name']),
            'warehouses' => Warehouse::orderBy('name')->get(['id', 'name']),
            'taxes' => Tax::orderBy('name')->get(['id', 'name', 'rate_bps']),
        ];
    }

    private function present(Product $product): array
    {
        $product->loadMissing(['category', 'brand', 'unit', 'tax', 'warehouse', 'variants']);

        return [
            'id' => $product->id,
            'name' => $product->name,
            'type' => $product->type,
            'code' => $product->code,
            'brand_id' => $product->brand_id,
            'category_id' => $product->category_id,
            'unit_id' => $product->unit_id,
            'warehouse_id' => $product->warehouse_id,
            'tax_id' => $product->tax_id,
            'tax_method' => $product->tax_method,
            'cost' => number_format($product->cost_cents / 100, 2, '.', ''),
            'price' => number_format($product->price_cents / 100, 2, '.', ''),
            'cost_cents' => $product->cost_cents,
            'price_cents' => $product->price_cents,
            'alert_qty' => $product->alert_qty,
            'stock_qty' => $product->stock_qty,
            'description' => $product->description,
            'is_active' => (bool) $product->is_active,
            'featured_in_pos' => (bool) $product->featured_in_pos,
            'has_variant' => (bool) $product->has_variant,
            'image' => $product->image ? '/storage/'.$product->image : null,
            'brand' => $product->brand?->name,
            'category' => $product->category?->name,
            'unit' => $product->unit?->name,
            'warehouse' => $product->warehouse?->name,
            'variants' => $product->variants->map(fn ($variant) => [
                'id' => $variant->id,
                'name' => $variant->name,
                'sku' => $variant->sku,
                'price' => number_format($variant->price_cents / 100, 2, '.', ''),
                'stock_qty' => $variant->stock_qty,
            ])->values(),
        ];
    }

    public function suggestCode(): never
    {
        abort(404);
    }
}
