<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductIngredient;
use App\Models\PurchaseItem;
use App\Models\SaleItem;
use App\Models\Supplier;
use App\Models\Tax;
use App\Models\Unit;
use App\Models\Warehouse;
use App\Services\InventoryService;
use App\Support\Money;
use App\Support\ProductRules;
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
                        ->orWhere('code', 'like', "%{$term}%")
                            ->orWhere('barcode', 'like', "%{$term}%");
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
                    'near_expiry_days' => 30,
                    'has_batch' => false,
                    'has_serial' => false,
                    'has_variant' => false,
                    'details' => [],
                    'variants' => [],
                    'ingredients' => [],
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
        $request->merge([
            'barcode' => $request->filled('barcode') ? $request->input('barcode') : null,
            'supplier_id' => $request->filled('supplier_id') ? $request->input('supplier_id') : null,
            'slug' => $request->filled('slug') ? $request->input('slug') : null,
        ]);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'slug' => ['nullable', 'string', 'max:180'],
            'type' => ['required', Rule::in(['standard', 'combo', 'digital', 'service', 'ingredient'])],
            'code' => ['required', 'string', 'max:60', Rule::unique('products', 'code')->where('store_id', $storeId)->ignore($product->id)],
            'barcode' => ['nullable', 'string', 'max:60', Rule::unique('products', 'barcode')->where('store_id', $storeId)->ignore($product->id)],
            'brand_id' => ['required', Rule::exists('brands', 'id')->where('store_id', $storeId)],
            'category_id' => ['required', Rule::exists('categories', 'id')->where('store_id', $storeId)],
            'unit_id' => ['required', Rule::exists('units', 'id')->where('store_id', $storeId)],
            'sale_unit_id' => ['nullable', Rule::exists('units', 'id')->where('store_id', $storeId)],
            'purchase_unit_id' => ['nullable', Rule::exists('units', 'id')->where('store_id', $storeId)],
            'warehouse_id' => ['nullable', Rule::exists('warehouses', 'id')->where('store_id', $storeId)],
            'supplier_id' => ['nullable', Rule::exists('suppliers', 'id')->where('store_id', $storeId)],
            'cost' => ['required'],
            'price' => ['required'],
            'promo_price' => ['nullable'],
            'alert_qty' => ['nullable', 'integer', 'min:0'],
            'near_expiry_days' => ['nullable', 'integer', 'min:1', 'max:365'],
            'opening_stock' => ['nullable', 'integer', 'min:0'],
            'description' => ['nullable', 'string', 'max:5000'],
            'tax_id' => ['nullable', Rule::exists('taxes', 'id')->where('store_id', $storeId)],
            'tax_method' => ['nullable', Rule::in(['exclusive', 'inclusive'])],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'remove_image' => ['nullable', 'boolean'],
            'details' => ['nullable', 'array'],
            'details.generic_name' => ['nullable', 'string', 'max:180'],
            'details.strength' => ['nullable', 'string', 'max:80'],
            'details.dosage_form' => ['nullable', 'string', 'max:80'],
            'details.manufacturer' => ['nullable', 'string', 'max:180'],
            'details.model' => ['nullable', 'string', 'max:120'],
            'details.color' => ['nullable', 'string', 'max:60'],
            'details.storage' => ['nullable', 'string', 'max:60'],
            'details.ram' => ['nullable', 'string', 'max:60'],
            'details.warranty_months' => ['nullable', 'integer', 'min:0', 'max:120'],
            'details.pack_size' => ['nullable', 'string', 'max:60'],
            'details.weight' => ['nullable', 'string', 'max:60'],
            'details.wholesale' => ['nullable', 'string', 'max:20'],
            'details.style' => ['nullable', 'string', 'max:80'],
            'variants' => ['nullable', 'array'],
            'variants.*.id' => ['nullable', 'integer'],
            'variants.*.name' => ['nullable', 'string', 'max:120'],
            'variants.*.sku' => ['nullable', 'string', 'max:60'],
            'variants.*.barcode' => ['nullable', 'string', 'max:60'],
            'variants.*.price' => ['nullable'],
            'variants.*.stock_qty' => ['nullable', 'integer', 'min:0'],
            'variants.*.size' => ['nullable', 'string', 'max:40'],
            'variants.*.color' => ['nullable', 'string', 'max:40'],
            'variants.*.style' => ['nullable', 'string', 'max:40'],
            'ingredients' => ['nullable', 'array'],
            'ingredients.*.ingredient_id' => ['required', 'integer'],
            'ingredients.*.qty' => ['required', 'integer', 'min:1'],
        ]);
        $batch = $request->boolean('has_batch');
        $serial = $request->boolean('has_serial');
        $variant = $request->boolean('has_variant');
        ProductRules::assert($data['type'], $batch, $serial, $variant);
        $opening = (int) ($data['opening_stock'] ?? 0);
        if (! $product->exists && $opening > 0 && ($batch || $serial)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'opening_stock' => 'Receive batch and serial stock through a purchase so each unit stays traceable.',
            ]);
        }
        if (! $product->exists && $opening > 0 && in_array($data['type'], ['service', 'digital', 'combo'], true)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'opening_stock' => 'Opening stock applies to stocked products. Bundles use their ingredients.',
            ]);
        }
        $variantQtyPreview = 0;
        if ($variant) {
            foreach ($data['variants'] ?? [] as $input) {
                if (! blank($input['name'] ?? null)) {
                    $variantQtyPreview += (int) ($input['stock_qty'] ?? 0);
                }
            }
        }
        if (! $product->exists && $opening > 0 && $variantQtyPreview > 0) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'opening_stock' => 'Use either an opening quantity or variant quantities, so stock is only recorded once.',
            ]);
        }

        return DB::transaction(function () use ($request, $product, $data, $storeId, $opening, $batch, $serial, $variant) {
            $details = $this->detailsFrom($request, $data['details'] ?? []);
            $payload = [
                'store_id' => $storeId,
                'name' => $data['name'],
                'slug' => $this->uniqueSlug($storeId, $data['slug'] ?? $data['name'], $product->id),
                'type' => $data['type'],
                'code' => $data['code'],
                'barcode' => $data['barcode'] ?? null,
                'brand_id' => $data['brand_id'],
                'category_id' => $data['category_id'],
                'unit_id' => $data['unit_id'],
                'sale_unit_id' => $data['sale_unit_id'] ?? null ?: null,
                'purchase_unit_id' => $data['purchase_unit_id'] ?? null ?: null,
                'warehouse_id' => ($data['warehouse_id'] ?? null) ?: $product->warehouse_id,
                'supplier_id' => $data['supplier_id'] ?? null,
                'tax_id' => ($data['tax_id'] ?? null) ?: null,
                'tax_method' => $data['tax_method'] ?? 'exclusive',
                'cost_cents' => Money::parse($data['cost']),
                'price_cents' => Money::parse($data['price']),
                'promo_price_cents' => $request->boolean('has_promo') ? Money::parse($data['promo_price'] ?? 0) : null,
                'alert_qty' => (int) ($data['alert_qty'] ?? 0),
                'near_expiry_days' => (int) ($data['near_expiry_days'] ?? 30),
                'description' => $data['description'] ?? null,
                'details' => $details,
                'is_active' => $request->boolean('is_active', true),
                'featured_in_pos' => $request->boolean('featured_in_pos'),
                'has_serial' => $serial,
                'has_batch' => $batch,
                'has_variant' => $variant,
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

            $variantQty = 0;
            if ($product->has_variant) {
                $keep = [];
                foreach ($data['variants'] ?? [] as $input) {
                    if (blank($input['name'] ?? null)) {
                        continue;
                    }
                    $values = [
                        'store_id' => $storeId,
                        'name' => $input['name'],
                        'sku' => $input['sku'] ?? null,
                        'barcode' => ($input['barcode'] ?? null) ?: null,
                        'price_cents' => Money::parse($input['price'] ?? 0),
                        'stock_qty' => (int) ($input['stock_qty'] ?? 0),
                        'attributes' => array_filter([
                            'size' => $input['size'] ?? null,
                            'color' => $input['color'] ?? null,
                            'style' => $input['style'] ?? null,
                        ]),
                    ];
                    $variantQty += $values['stock_qty'];
                    $existing = ! empty($input['id']) ? $product->variants()->find($input['id']) : null;
                    $row = $existing ? tap($existing)->update($values) : $product->variants()->create($values);
                    $keep[] = $row->id;
                }
                $product->variants()->whereNotIn('id', $keep ?: [0])->delete();
            }

            if ($request->boolean('ingredients_present')) {
                $keepIngredients = [];
                foreach ($data['ingredients'] ?? [] as $input) {
                    $ingredient = Product::where('store_id', $storeId)->whereKey($input['ingredient_id'])->first();
                    if (! $ingredient || (int) $ingredient->id === (int) $product->id || $ingredient->type === 'combo') {
                        throw \Illuminate\Validation\ValidationException::withMessages([
                            'ingredients' => 'Choose an ingredient from this shop.',
                        ]);
                    }
                    $link = ProductIngredient::updateOrCreate(
                        ['product_id' => $product->id, 'ingredient_id' => $ingredient->id],
                        ['qty' => (int) $input['qty']],
                    );
                    $keepIngredients[] = $link->id;
                }
                $product->ingredients()->whereNotIn('id', $keepIngredients ?: [0])->delete();
            }

            $wasNew = $product->wasRecentlyCreated;
            if ($wasNew && $opening > 0) {
                app(InventoryService::class)->move($product, $opening, 'opening', $product, $request->user());
            } elseif ($wasNew && $product->has_variant && $variantQty > 0 && (int) $product->stock_qty === 0) {
                app(InventoryService::class)->move($product, $variantQty, 'opening', $product, $request->user());
            }

            return $product;
        });
    }

    private function uniqueSlug(int $storeId, string $source, ?int $ignoreId): string
    {
        $base = Str::slug($source) ?: 'product';
        $slug = $base;
        $n = 2;
        while (Product::where('store_id', $storeId)->where('slug', $slug)->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))->exists()) {
            $slug = $base.'-'.$n;
            $n++;
        }

        return $slug;
    }

    private function detailsFrom(Request $request, array $details): array
    {
        $details['prescription_required'] = $request->boolean('details.prescription_required');
        if (($details['wholesale'] ?? '') !== '') {
            $details['wholesale_cents'] = Money::parse($details['wholesale']);
        } else {
            unset($details['wholesale_cents']);
        }
        if (isset($details['warranty_months']) && $details['warranty_months'] !== '') {
            $details['warranty_months'] = (int) $details['warranty_months'];
        }

        return $details;
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
        $storeId = auth()->user()?->store_id;

        return [
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'brands' => Brand::orderBy('name')->get(['id', 'name']),
            'units' => Unit::orderBy('name')->get(['id', 'name', 'short_name']),
            'warehouses' => Warehouse::orderBy('name')->get(['id', 'name']),
            'taxes' => Tax::orderBy('name')->get(['id', 'name', 'rate_bps']),
            'suppliers' => Supplier::orderBy('name')->get(['id', 'name']),
            'products' => Product::orderBy('name')->get(['id', 'name', 'type']),
            'business_type' => auth()->user()?->store?->business_type ?? 'all_in_one',
            'modules' => SettingsController::modulesFor($storeId),
        ];
    }

    private function present(Product $product): array
    {
        $product->loadMissing(['category', 'brand', 'unit', 'tax', 'warehouse', 'supplier', 'variants', 'ingredients.ingredient']);
        $details = $product->details ?? [];
        if (isset($details['wholesale_cents'])) {
            $details['wholesale'] = number_format(((int) $details['wholesale_cents']) / 100, 2, '.', '');
        }

        return [
            'id' => $product->id,
            'name' => $product->name,
            'slug' => $product->slug,
            'type' => $product->type,
            'code' => $product->code,
            'barcode' => $product->barcode,
            'brand_id' => $product->brand_id,
            'category_id' => $product->category_id,
            'unit_id' => $product->unit_id,
            'warehouse_id' => $product->warehouse_id,
            'supplier_id' => $product->supplier_id,
            'tax_id' => $product->tax_id,
            'tax_method' => $product->tax_method,
            'cost' => number_format($product->cost_cents / 100, 2, '.', ''),
            'price' => number_format($product->price_cents / 100, 2, '.', ''),
            'promo_price' => $product->promo_price_cents !== null ? number_format($product->promo_price_cents / 100, 2, '.', '') : '',
            'has_promo' => $product->promo_price_cents !== null,
            'cost_cents' => $product->cost_cents,
            'price_cents' => $product->price_cents,
            'alert_qty' => $product->alert_qty,
            'near_expiry_days' => $product->near_expiry_days,
            'stock_qty' => $product->stock_qty,
            'description' => $product->description,
            'details' => $details,
            'is_active' => (bool) $product->is_active,
            'featured_in_pos' => (bool) $product->featured_in_pos,
            'has_variant' => (bool) $product->has_variant,
            'has_batch' => (bool) $product->has_batch,
            'has_serial' => (bool) $product->has_serial,
            'image' => $product->image ? '/storage/'.$product->image : null,
            'brand' => $product->brand?->name,
            'category' => $product->category?->name,
            'unit' => $product->unit?->name,
            'warehouse' => $product->warehouse?->name,
            'supplier' => $product->supplier?->name,
            'variants' => $product->variants->map(fn ($row) => [
                'id' => $row->id,
                'name' => $row->name,
                'sku' => $row->sku,
                'barcode' => $row->barcode,
                'price' => number_format($row->price_cents / 100, 2, '.', ''),
                'stock_qty' => $row->stock_qty,
                'size' => $row->attributes['size'] ?? '',
                'color' => $row->attributes['color'] ?? '',
                'style' => $row->attributes['style'] ?? '',
            ])->values(),
            'ingredients' => $product->ingredients->map(fn ($row) => [
                'ingredient_id' => $row->ingredient_id,
                'qty' => $row->qty,
                'name' => $row->ingredient?->name,
            ])->values(),
        ];
    }

    public function suggestCode(): never
    {
        abort(404);
    }
}
