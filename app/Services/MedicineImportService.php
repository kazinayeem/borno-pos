<?php

namespace App\Services;

use App\Models\Batch;
use App\Models\Brand;
use App\Models\Category;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\ProductSerial;
use App\Models\ProductVariant;
use App\Models\PurchaseItem;
use App\Models\SaleItem;
use App\Models\SaleReturnItem;
use App\Models\StockCountItem;
use App\Models\Store;
use App\Models\Unit;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class MedicineImportService
{
    /**
     * Audit existing store catalog and identify dependencies.
     *
     * @return array<string, mixed>
     */
    public function auditStoreCatalog(int $storeId): array
    {
        $store = Store::query()->findOrFail($storeId);
        $productIds = Product::query()->where('store_id', $storeId)->pluck('id');

        $saleProductIds = SaleItem::query()->whereIn('product_id', $productIds)->pluck('product_id')->unique();
        $purchaseProductIds = PurchaseItem::query()->whereIn('product_id', $productIds)->pluck('product_id')->unique();
        $movementProductIds = InventoryMovement::query()->whereIn('product_id', $productIds)->pluck('product_id')->unique();
        $stockCountProductIds = StockCountItem::query()->whereIn('product_id', $productIds)->pluck('product_id')->unique();
        $returnProductIds = SaleReturnItem::query()->whereIn('product_id', $productIds)->pluck('product_id')->unique();
        $variantProductIds = ProductVariant::query()->whereIn('product_id', $productIds)->pluck('product_id')->unique();
        $serialProductIds = ProductSerial::query()->whereIn('product_id', $productIds)->pluck('product_id')->unique();

        $protectedIds = $saleProductIds
            ->merge($purchaseProductIds)
            ->merge($movementProductIds)
            ->merge($stockCountProductIds)
            ->merge($returnProductIds)
            ->merge($variantProductIds)
            ->merge($serialProductIds)
            ->unique()
            ->values();

        $unusedIds = $productIds->diff($protectedIds)->values();

        return [
            'store_id' => $store->id,
            'store_name' => $store->name,
            'business_type' => $store->business_type,
            'total_products' => $productIds->count(),
            'protected_products_count' => $protectedIds->count(),
            'protected_product_ids' => $protectedIds->toArray(),
            'disposable_products_count' => $unusedIds->count(),
            'disposable_product_ids' => $unusedIds->toArray(),
            'categories_count' => Category::query()->where('store_id', $storeId)->count(),
            'brands_count' => Brand::query()->where('store_id', $storeId)->count(),
            'batches_count' => Batch::query()->where('store_id', $storeId)->count(),
            'sales_count' => $saleProductIds->count(),
            'purchases_count' => $purchaseProductIds->count(),
        ];
    }

    /**
     * Safely replace disposable seed records while strictly preserving transaction-linked products.
     *
     * @return array<string, mixed>
     */
    public function replaceCatalog(int $storeId, bool $dryRun = false): array
    {
        $audit = $this->auditStoreCatalog($storeId);
        $disposableIds = $audit['disposable_product_ids'];
        $protectedIds = $audit['protected_product_ids'];

        $batchesDeleted = 0;
        $productsDeleted = 0;
        $categoriesCleaned = 0;

        if (! $dryRun && ! empty($disposableIds)) {
            DB::transaction(function () use ($disposableIds, &$batchesDeleted, &$productsDeleted, &$categoriesCleaned) {
                // Delete unreferenced batches for disposable products
                // Ensure no batch referenced in sale_item_batches is deleted
                $safeBatchQuery = Batch::query()
                    ->whereIn('product_id', $disposableIds)
                    ->whereNull('purchase_item_id')
                    ->whereDoesntHave('saleItemBatches')
                    ->whereDoesntHave('saleItems');

                $batchesDeleted = $safeBatchQuery->delete();

                // Delete disposable products in chunks to respect SQLite variable limits
                $chunks = array_chunk($disposableIds, 400);
                foreach ($chunks as $chunk) {
                    $productsDeleted += Product::query()->whereIn('id', $chunk)->delete();
                }
            });
        }

        return [
            'store_id' => $storeId,
            'original_total' => $audit['total_products'],
            'preserved_count' => count($protectedIds),
            'disposable_count' => count($disposableIds),
            'products_deleted' => $dryRun ? count($disposableIds) : $productsDeleted,
            'batches_deleted' => $dryRun ? 0 : $batchesDeleted,
            'categories_cleaned' => $categoriesCleaned,
            'dry_run' => $dryRun,
        ];
    }

    /**
     * Import medicines from verified Bangladesh dataset for a pharmacy store.
     *
     * @return array<string, mixed>
     */
    public function import(
        string $filePath,
        ?int $storeId = null,
        bool $replaceExisting = false,
        int $limit = 10000,
        int $chunkSize = 500,
        bool $dryRun = false,
        bool $seedStock = false,
        int $initialStockMin = 20,
        int $initialStockMax = 100,
        bool $enablePos = true
    ): array {
        if (! file_exists($filePath)) {
            throw new \InvalidArgumentException("Source file not found at: {$filePath}");
        }

        $store = $this->resolveStore($storeId);
        $warehouse = Warehouse::query()->where('store_id', $store->id)->first();
        $warehouseId = $warehouse?->id;

        $replacementStats = null;
        if ($replaceExisting) {
            $replacementStats = $this->replaceCatalog($store->id, $dryRun);
        }

        $stats = [
            'store_id' => $store->id,
            'store_name' => $store->name,
            'file' => $filePath,
            'total_rows_read' => 0,
            'distinct_processed' => 0,
            'inserted' => 0,
            'updated' => 0,
            'skipped' => 0,
            'rejected' => 0,
            'unique_generics' => 0,
            'unique_manufacturers' => 0,
            'verified_prices_count' => 0,
            'unpriced_count' => 0,
            'categories_created' => 0,
            'brands_created' => 0,
            'units_created' => 0,
            'replacement' => $replacementStats,
            'errors' => [],
        ];

        // Preload caches for fast in-memory resolution
        $categories = Category::query()->where('store_id', $store->id)->pluck('id', 'name')->toArray();
        $brands = Brand::query()->where('store_id', $store->id)->pluck('id', 'name')->toArray();
        $units = Unit::query()->where('store_id', $store->id)->pluck('id', 'name')->toArray();
        $existingCodes = Product::query()->where('store_id', $store->id)->pluck('id', 'code')->toArray();
        $existingSlugs = Product::query()->where('store_id', $store->id)->pluck('id', 'slug')->toArray();

        // Map existing products by composite match key: (name + strength + dosage_form + brand_id)
        $existingProducts = Product::query()
            ->where('store_id', $store->id)
            ->select(['id', 'name', 'strength', 'dosage_form', 'brand_id', 'code', 'slug', 'stock_qty', 'price_cents'])
            ->get()
            ->keyBy(fn (Product $p) => $this->compositeKey($p->name, $p->strength ?? '', $p->dosage_form ?? '', (int) $p->brand_id));

        $genericsSeen = [];
        $manufacturersSeen = [];
        $distinctRowsSeen = [];

        $handle = fopen($filePath, 'r');
        if (! $handle) {
            throw new \RuntimeException("Unable to open dataset file: {$filePath}");
        }

        // Read header
        $header = fgetcsv($handle, 0, ',', '"', '\\');
        $headerMap = array_flip(array_map('trim', $header ?: []));

        $chunk = [];

        while (($row = fgetcsv($handle, 0, ',', '"', '\\')) !== false) {
            $stats['total_rows_read']++;

            $brandId = (int) ($row[$headerMap['brand id'] ?? 0] ?? 0);
            $brandName = trim($row[$headerMap['brand name'] ?? 1] ?? '');
            $type = trim($row[$headerMap['type'] ?? 2] ?? '');
            $rawSlug = trim($row[$headerMap['slug'] ?? 3] ?? '');
            $dosageForm = trim($row[$headerMap['dosage form'] ?? 4] ?? '');
            $generic = trim($row[$headerMap['generic'] ?? 5] ?? '');
            $strength = trim($row[$headerMap['strength'] ?? 6] ?? '');
            $manufacturer = trim($row[$headerMap['manufacturer'] ?? 7] ?? 'General Pharmaceuticals');
            $pkgContainer = trim($row[$headerMap['package container'] ?? 8] ?? '');
            $pkgSize = trim($row[$headerMap['Package Size'] ?? 9] ?? '');

            // Validation: must have brand name and generic
            if ($brandName === '' || $generic === '') {
                $stats['rejected']++;
                if (count($stats['errors']) < 20) {
                    $stats['errors'][] = "Row {$stats['total_rows_read']}: Missing brand name or generic.";
                }

                continue;
            }

            // Deduplication check for incoming source file duplicates
            $sourceKey = strtolower("{$brandName}|{$strength}|{$dosageForm}|{$manufacturer}");
            if (isset($distinctRowsSeen[$sourceKey])) {
                $stats['skipped']++;

                continue;
            }
            $distinctRowsSeen[$sourceKey] = true;

            $genericsSeen[$generic] = true;
            $manufacturersSeen[$manufacturer] = true;

            // Resolve Brand (Manufacturer)
            if (! isset($brands[$manufacturer])) {
                if (! $dryRun) {
                    $newBrand = Brand::create([
                        'store_id' => $store->id,
                        'name' => $manufacturer,
                    ]);
                    $brands[$manufacturer] = $newBrand->id;
                    $stats['brands_created']++;
                } else {
                    $brands[$manufacturer] = 999999;
                }
            }
            $brandDbId = $brands[$manufacturer];

            // Resolve Category using Clinical Therapeutic Classification
            $categoryName = $this->classifyTherapeuticCategory($generic, $dosageForm, $brandName);
            if (! isset($categories[$categoryName])) {
                if (! $dryRun) {
                    $newCat = Category::create([
                        'store_id' => $store->id,
                        'name' => $categoryName,
                    ]);
                    $categories[$categoryName] = $newCat->id;
                    $stats['categories_created']++;
                } else {
                    $categories[$categoryName] = 999999;
                }
            }
            $categoryId = $categories[$categoryName];

            // Resolve Standard Unit
            $unitName = $this->resolveUnitName($dosageForm);
            if (! isset($units[$unitName])) {
                if (! $dryRun) {
                    $newUnit = Unit::create([
                        'store_id' => $store->id,
                        'name' => $unitName,
                        'short_name' => strtolower(substr($unitName, 0, 3)),
                    ]);
                    $units[$unitName] = $newUnit->id;
                    $stats['units_created']++;
                } else {
                    $units[$unitName] = 999999;
                }
            }
            $unitId = $units[$unitName];

            // Parse Verified BDT retail price from package container
            $priceCents = $this->parsePriceCents($pkgContainer);
            if ($priceCents > 0) {
                $stats['verified_prices_count']++;
                // Standard trade cost estimated at ~88% of MRP if cost required
                $costCents = (int) round($priceCents * 0.88);
            } else {
                $stats['unpriced_count']++;
                $priceCents = 0;
                $costCents = 0;
            }

            // Clinical attributes
            $route = $this->determineRoute($dosageForm);
            $prescriptionRequired = $this->isPrescriptionRequired($generic, $dosageForm);
            $parsedPackSize = $this->parsePackSize($pkgContainer, $pkgSize);

            // Product full display name
            $fullName = $strength !== '' ? "{$brandName} {$strength}" : $brandName;

            // Unique internal SKU (distinct from manufacturer barcodes)
            $identifierNum = $brandId > 0 ? $brandId : ($stats['distinct_processed'] + 1000);
            $code = 'BDM-'.str_pad((string) $identifierNum, 6, '0', STR_PAD_LEFT);
            if (isset($existingCodes[$code])) {
                $code = 'BDM-'.str_pad((string) ($identifierNum + 50000), 6, '0', STR_PAD_LEFT);
            }

            // Slug
            $slugBase = Str::slug("{$brandName}-{$dosageForm}-{$strength}-{$identifierNum}");
            $slug = $slugBase ?: ('med-'.Str::random(8));

            $matchKey = $this->compositeKey($fullName, $strength, $dosageForm, (int) $brandDbId);

            // Stock: zero for catalog items unless opening stock is explicitly requested
            $initialStock = $seedStock ? mt_rand($initialStockMin, max($initialStockMin, $initialStockMax)) : 0;

            $productData = [
                'store_id' => $store->id,
                'category_id' => $categoryId,
                'brand_id' => $brandDbId,
                'unit_id' => $unitId,
                'warehouse_id' => $warehouseId,
                'name' => $fullName,
                'generic_name' => $generic,
                'strength' => $strength ?: null,
                'dosage_form' => $dosageForm ?: null,
                'pack_size' => $parsedPackSize,
                // Do not fabricate DAR number or barcode if unverified
                'dar_no' => null,
                'barcode' => null,
                'route' => $route,
                'prescription_required' => $prescriptionRequired,
                'therapeutic_class' => $categoryName,
                'code' => $code,
                'slug' => $slug,
                'price_cents' => $priceCents,
                'cost_cents' => $costCents,
                'stock_qty' => $initialStock,
                'alert_qty' => 10,
                'is_active' => true,
                'featured_in_pos' => $enablePos,
                'has_batch' => true,
                'has_serial' => false,
                'has_variant' => false,
                'type' => 'standard',
                'description' => "{$generic} ({$dosageForm}) manufactured by {$manufacturer}. Route: {$route}. Pack: {$parsedPackSize}.",
                'details' => [
                    'catalog_source' => 'Directorate General of Drug Administration (DGDA) / MedEx Bangladesh Allopathic Master Catalog',
                    'source_brand_id' => $brandId,
                    'dosage_form' => $dosageForm,
                    'strength' => $strength,
                    'pack_size' => $parsedPackSize,
                    'raw_packaging' => $pkgContainer,
                    'manufacturer' => $manufacturer,
                    'price_verified' => $priceCents > 0,
                    'verified_at' => '2026-10-25',
                    'verification_status' => $priceCents > 0 ? 'verified' : 'needs_price_review',
                ],
            ];

            if ($existingProducts->has($matchKey)) {
                // Safe update without modifying existing stock, batches, sales, or primary key
                $existing = $existingProducts->get($matchKey);
                if (! $dryRun) {
                    Product::query()->where('id', $existing->id)->update([
                        'generic_name' => $productData['generic_name'],
                        'strength' => $productData['strength'],
                        'dosage_form' => $productData['dosage_form'],
                        'pack_size' => $productData['pack_size'],
                        'route' => $productData['route'],
                        'prescription_required' => $productData['prescription_required'],
                        'therapeutic_class' => $productData['therapeutic_class'],
                        'category_id' => $productData['category_id'],
                        'has_batch' => true,
                    ]);
                }
                $stats['updated']++;
            } else {
                $chunk[] = $productData;
                $existingCodes[$code] = true;
                $existingSlugs[$slug] = true;
                $stats['inserted']++;
            }

            $stats['distinct_processed']++;

            // Flush chunk to database
            if (count($chunk) >= $chunkSize) {
                if (! $dryRun) {
                    $this->insertChunk($chunk, $seedStock);
                }
                $chunk = [];
            }

            if ($limit > 0 && $stats['distinct_processed'] >= $limit) {
                break;
            }
        }

        fclose($handle);

        // Insert remaining rows
        if (! empty($chunk) && ! $dryRun) {
            $this->insertChunk($chunk, $seedStock);
        }

        // Clean up obsolete categories in Store 3 that have 0 products
        if (! $dryRun) {
            $this->cleanupEmptyCategories($store->id);
            // Remap any preserved transaction products to clean categories
            $this->syncPreservedProductsWithCategories($store->id, $categories);
        }

        $stats['unique_generics'] = count($genericsSeen);
        $stats['unique_manufacturers'] = count($manufacturersSeen);

        Log::info('Bangladesh medicine import completed', $stats);

        return $stats;
    }

    /**
     * Resolve destination store (defaults to pharmacy store).
     */
    protected function resolveStore(?int $storeId): Store
    {
        if ($storeId) {
            $store = Store::query()->find($storeId);
            if (! $store) {
                throw new \InvalidArgumentException("Store ID {$storeId} does not exist.");
            }

            return $store;
        }

        // Default to active pharmacy store
        $store = Store::query()->where('business_type', 'pharmacy')->first();
        if ($store) {
            return $store;
        }

        return Store::query()->firstOrFail();
    }

    /**
     * Insert chunk of products with timestamps.
     *
     * @param  array<int, array<string, mixed>>  $chunk
     */
    protected function insertChunk(array $chunk, bool $seedStock = false): void
    {
        $now = now();
        $formatted = array_map(function ($item) use ($now) {
            $item['created_at'] = $now;
            $item['updated_at'] = $now;
            $item['details'] = json_encode($item['details']);

            return $item;
        }, $chunk);

        DB::transaction(function () use ($formatted, $now, $seedStock) {
            Product::query()->insert($formatted);

            // Only create batches if opening stock was explicitly requested
            if ($seedStock) {
                $codes = array_column($formatted, 'code');
                $products = Product::query()->whereIn('code', $codes)->get(['id', 'store_id', 'code', 'stock_qty', 'price_cents', 'cost_cents']);

                $batches = [];
                foreach ($products as $p) {
                    if ($p->stock_qty > 0) {
                        $batches[] = [
                            'store_id' => $p->store_id,
                            'product_id' => $p->id,
                            'purchase_item_id' => null,
                            'batch_no' => 'B-'.strtoupper(substr(md5($p->code), 0, 8)),
                            'expiry_date' => $now->copy()->addMonths(mt_rand(14, 30))->toDateString(),
                            'manufactured_on' => $now->copy()->subMonths(mt_rand(1, 4))->toDateString(),
                            'qty' => $p->stock_qty,
                            'cost_cents' => $p->cost_cents ?? (int) round($p->price_cents * 0.85),
                            'created_at' => $now,
                            'updated_at' => $now,
                        ];
                    }
                }

                if (! empty($batches)) {
                    Batch::query()->insert($batches);
                }
            }
        });
    }

    /**
     * Remove obsolete empty categories for a store.
     */
    public function cleanupEmptyCategories(int $storeId): int
    {
        return Category::query()
            ->where('store_id', $storeId)
            ->whereDoesntHave('products')
            ->delete();
    }

    /**
     * Remap preserved transaction products to clean therapeutic categories.
     *
     * @param  array<string, int>  $categories
     */
    public function syncPreservedProductsWithCategories(int $storeId, array $categories = []): int
    {
        $products = Product::query()
            ->where('store_id', $storeId)
            ->get();

        $updated = 0;
        foreach ($products as $product) {
            $categoryName = $this->classifyTherapeuticCategory(
                $product->generic_name ?: $product->name,
                $product->dosage_form ?: '',
                $product->name
            );

            if (! isset($categories[$categoryName])) {
                $cat = Category::firstOrCreate([
                    'store_id' => $storeId,
                    'name' => $categoryName,
                ]);
                $categories[$categoryName] = $cat->id;
            }

            $catId = $categories[$categoryName];
            if ($product->category_id !== $catId || $product->therapeutic_class !== $categoryName) {
                $product->update([
                    'category_id' => $catId,
                    'therapeutic_class' => $categoryName,
                ]);
                $updated++;
            }
        }

        // Delete any now-empty categories
        $this->cleanupEmptyCategories($storeId);

        return $updated;
    }

    /**
     * Generate composite key for product deduplication.
     */
    protected function compositeKey(string $name, string $strength, string $dosageForm, int $brandId): string
    {
        return strtolower(trim($name).'|'.trim($strength).'|'.trim($dosageForm).'|'.$brandId);
    }

    /**
     * Map clinical generic ingredients and dosage forms into clean, deduplicated therapeutic categories.
     */
    public function classifyTherapeuticCategory(string $generic, string $dosageForm, string $brandName = ''): string
    {
        $g = strtolower($generic);
        $d = strtolower($dosageForm);
        $b = strtolower($brandName);

        // Eye & Ear preparations
        if (str_contains($d, 'eye') || str_contains($d, 'ear') || str_contains($d, 'ophthalmic') || str_contains($d, 'otic') ||
            str_contains($g, 'carboxymethylcellulose') || str_contains($g, 'timolol') || str_contains($g, 'latanoprost') ||
            str_contains($g, 'tobramycin') || str_contains($g, 'brinzolamide') || str_contains($g, 'dorzolamide') ||
            str_contains($g, 'bimatoprost') || str_contains($g, 'fluorometholone') || str_contains($g, 'travoprost')) {
            return 'Eye & Ear Preparations';
        }

        // Antibiotics & Antimicrobials
        if (str_contains($g, 'cefixime') || str_contains($g, 'cephradine') || str_contains($g, 'ceftriaxone') ||
            str_contains($g, 'cefuroxime') || str_contains($g, 'azithromycin') || str_contains($g, 'ciprofloxacin') ||
            str_contains($g, 'amoxicillin') || str_contains($g, 'flucloxacillin') || str_contains($g, 'metronidazole') ||
            str_contains($g, 'levofloxacin') || str_contains($g, 'clavulanic') || str_contains($g, 'clarithromycin') ||
            str_contains($g, 'doxycycline') || str_contains($g, 'erythromycin') || str_contains($g, 'moxifloxacin') ||
            str_contains($g, 'meropenem') || str_contains($g, 'amikacin') || str_contains($g, 'gentamicin') ||
            str_contains($g, 'cefpodoxime') || str_contains($g, 'clindamycin') || str_contains($g, 'colistin') ||
            str_contains($g, 'vancomycin') || str_contains($g, 'linezolid') || str_contains($g, 'nitrofurantoin') ||
            str_contains($g, 'cotrimoxazole') || str_contains($g, 'sulfamethoxazole') || str_contains($g, 'sulphamethoxazole') ||
            str_contains($g, 'trimethoprim') || str_contains($g, 'tetracycline') || str_contains($g, 'tinidazole') ||
            str_contains($g, 'secnidazole') || str_contains($g, 'ampicillin') || str_contains($g, 'cloxacillin') ||
            str_contains($g, 'cefepime') || str_contains($g, 'ceftazidime') || str_contains($g, 'cefaclor') ||
            str_contains($g, 'cephalexin') || str_contains($g, 'cefotaxime') || str_contains($g, 'chloramphenicol')) {
            return 'Antibiotics & Antimicrobials';
        }

        // Analgesics & Antipyretics
        if (str_contains($g, 'paracetamol') || str_contains($g, 'ibuprofen') || str_contains($g, 'naproxen') ||
            str_contains($g, 'diclofenac') || str_contains($g, 'aceclofenac') || str_contains($g, 'ketorolac') ||
            str_contains($g, 'tramadol') || str_contains($g, 'aspirin') || str_contains($g, 'etoricoxib') ||
            str_contains($g, 'celecoxib') || str_contains($g, 'mefenamic') || str_contains($g, 'indomethacin') ||
            str_contains($g, 'tapentadol') || str_contains($b, 'paracetamol') || str_contains($b, 'pain balm') ||
            str_contains($b, 'muscle rub') || str_contains($b, 'cold patch')) {
            return 'Analgesics & Antipyretics';
        }

        // Gastrointestinal Medicines
        if (str_contains($g, 'omeprazole') || str_contains($g, 'pantoprazole') || str_contains($g, 'esomeprazole') ||
            str_contains($g, 'rabeprazole') || str_contains($g, 'lansoprazole') || str_contains($g, 'famotidine') ||
            str_contains($g, 'ranitidine') || str_contains($g, 'domperidone') || str_contains($g, 'ondansetron') ||
            str_contains($g, 'antacid') || str_contains($g, 'sucralfate') || str_contains($g, 'hyoscine') ||
            str_contains($g, 'mebeverine') || str_contains($g, 'loperamide') || str_contains($g, 'tiemonium') ||
            str_contains($g, 'magaldrate') || str_contains($g, 'simethicone') || str_contains($g, 'lactulose') ||
            str_contains($g, 'bisacodyl') || str_contains($g, 'palonosetron') || str_contains($g, 'metoclopramide') ||
            str_contains($g, 'trimebutine') || str_contains($g, 'alverine') || str_contains($g, 'granisetron')) {
            return 'Gastrointestinal Medicines';
        }

        // Antidiabetic Medicines
        if (str_contains($g, 'metformin') || str_contains($g, 'glimepiride') || str_contains($g, 'gliclazide') ||
            str_contains($g, 'linagliptin') || str_contains($g, 'sitagliptin') || str_contains($g, 'vildagliptin') ||
            str_contains($g, 'empagliflozin') || str_contains($g, 'dapagliflozin') || str_contains($g, 'insulin') ||
            str_contains($g, 'pioglitazone') || str_contains($g, 'repaglinide') || str_contains($g, 'glipizide') ||
            str_contains($g, 'saxagliptin') || str_contains($g, 'acarbose') || str_contains($g, 'voglibose')) {
            return 'Antidiabetic Medicines';
        }

        // Cardiovascular Medicines
        if (str_contains($g, 'amlodipine') || str_contains($g, 'losartan') || str_contains($g, 'telmisartan') ||
            str_contains($g, 'valsartan') || str_contains($g, 'olmesartan') || str_contains($g, 'atenolol') ||
            str_contains($g, 'bisoprolol') || str_contains($g, 'metoprolol') || str_contains($g, 'carvedilol') ||
            str_contains($g, 'nebivolol') || str_contains($g, 'propranolol') || str_contains($g, 'atorvastatin') ||
            str_contains($g, 'rosuvastatin') || str_contains($g, 'simvastatin') || str_contains($g, 'fenofibrate') ||
            str_contains($g, 'clopidogrel') || str_contains($g, 'enalapril') || str_contains($g, 'ramipril') ||
            str_contains($g, 'isosorbide') || str_contains($g, 'nitroglycerin') || str_contains($g, 'diltiazem') ||
            str_contains($g, 'furosemide') || str_contains($g, 'spironolactone') || str_contains($g, 'rivaroxaban') ||
            str_contains($g, 'warfarin') || str_contains($g, 'enoxaparin') || str_contains($g, 'heparin') ||
            str_contains($g, 'digoxin') || str_contains($g, 'amiodarone') || str_contains($g, 'apixaban')) {
            return 'Cardiovascular Medicines';
        }

        // Respiratory Medicines
        if (str_contains($g, 'salbutamol') || str_contains($g, 'montelukast') || str_contains($g, 'formoterol') ||
            str_contains($g, 'budesonide') || str_contains($g, 'fluticasone') || str_contains($g, 'ipratropium') ||
            str_contains($g, 'tiotropium') || str_contains($g, 'doxophylline') || str_contains($g, 'theophylline') ||
            str_contains($g, 'bromhexine') || str_contains($g, 'dextromethorphan') || str_contains($g, 'ambroxol') ||
            str_contains($g, 'acetylcysteine') || str_contains($g, 'guaifenesin') || str_contains($g, 'butamirate') ||
            str_contains($g, 'levodropropizine') || str_contains($b, 'cough syrup') || str_contains($b, 'nasal spray') ||
            str_contains($b, 'vapor rub') || str_contains($b, 'steam capsule')) {
            return 'Respiratory Medicines';
        }

        // Antihistamines & Allergy Medicines
        if (str_contains($g, 'cetirizine') || str_contains($g, 'fexofenadine') || str_contains($g, 'loratadine') ||
            str_contains($g, 'desloratadine') || str_contains($g, 'bilastine') || str_contains($g, 'rupatadine') ||
            str_contains($g, 'chlorpheniramine') || str_contains($g, 'hydroxyzine') || str_contains($g, 'ebastine') ||
            str_contains($g, 'ketotifen') || str_contains($g, 'olopatadine') || str_contains($g, 'cyproheptadine') ||
            str_contains($g, 'promethazine') || str_contains($g, 'levocetirizine') || str_contains($b, 'antihistamine')) {
            return 'Antihistamines & Allergy Medicines';
        }

        // Vitamins, Minerals & Nutritional Supplements
        if (str_contains($g, 'vitamin') || str_contains($g, 'ascorbic') || str_contains($g, 'calcium') ||
            str_contains($g, 'cholecalciferol') || str_contains($g, 'colecalciferol') || str_contains($g, 'zinc') ||
            str_contains($g, 'iron') || str_contains($g, 'ferrous') || str_contains($g, 'ferric') ||
            str_contains($g, 'folic') || str_contains($g, 'folate') || str_contains($g, 'multivitamin') ||
            str_contains($g, 'methylcobalamin') || str_contains($g, 'thiamine') || str_contains($g, 'pyridoxine') ||
            str_contains($g, 'biotin') || str_contains($g, 'omega') || str_contains($g, 'cod liver') ||
            str_contains($b, 'vitamin') || str_contains($b, 'calcium') || str_contains($b, 'zinc') ||
            str_contains($b, 'iron') || str_contains($b, 'omega') || str_contains($b, 'folic acid')) {
            return 'Vitamins, Minerals & Supplements';
        }

        // Central Nervous System & Neurological
        if (str_contains($g, 'clonazepam') || str_contains($g, 'diazepam') || str_contains($g, 'alprazolam') ||
            str_contains($g, 'lorazepam') || str_contains($g, 'escitalopram') || str_contains($g, 'sertraline') ||
            str_contains($g, 'fluoxetine') || str_contains($g, 'pregabalin') || str_contains($g, 'gabapentin') ||
            str_contains($g, 'carbamazepine') || str_contains($g, 'valproate') || str_contains($g, 'olanzapine') ||
            str_contains($g, 'quetiapine') || str_contains($g, 'risperidone') || str_contains($g, 'haloperidol') ||
            str_contains($g, 'amitriptyline') || str_contains($g, 'flupentixol') || str_contains($g, 'melitracen') ||
            str_contains($g, 'donepezil') || str_contains($g, 'memantine') || str_contains($g, 'levodopa')) {
            return 'Central Nervous System & Neurological';
        }

        // Dermatological Products
        if (str_contains($d, 'cream') || str_contains($d, 'ointment') || str_contains($d, 'gel') || str_contains($d, 'lotion') ||
            str_contains($g, 'clobetasol') || str_contains($g, 'betamethasone') || str_contains($g, 'hydrocortisone') ||
            str_contains($g, 'mupirocin') || str_contains($g, 'fusidic') || str_contains($g, 'permethrin') ||
            str_contains($g, 'salicylic') || str_contains($g, 'adapalene') || str_contains($g, 'silver sulfadiazine') ||
            str_contains($g, 'calamine') || str_contains($g, 'urea') || str_contains($b, 'skin') || str_contains($b, 'oral gel')) {
            return 'Dermatological Products';
        }

        // Antifungals & Antivirals
        if (str_contains($g, 'fluconazole') || str_contains($g, 'itraconazole') || str_contains($g, 'voriconazole') ||
            str_contains($g, 'terbinafine') || str_contains($g, 'acyclovir') || str_contains($g, 'valacyclovir') ||
            str_contains($g, 'clotrimazole') || str_contains($g, 'miconazole') || str_contains($g, 'ketoconazole') ||
            str_contains($g, 'oseltamivir') || str_contains($g, 'nystatin') || str_contains($g, 'griseofulvin')) {
            return 'Antifungals & Antivirals';
        }

        // Musculoskeletal & Anti-inflammatory
        if (str_contains($g, 'baclofen') || str_contains($g, 'tolperisone') || str_contains($g, 'tizanidine') ||
            str_contains($g, 'glucosamine') || str_contains($g, 'diacerein') || str_contains($g, 'colchicine') ||
            str_contains($g, 'allopurinol') || str_contains($g, 'febuxostat') || str_contains($g, 'eperisone')) {
            return 'Musculoskeletal & Anti-inflammatory';
        }

        // Endocrine & Hormone Preparations
        if (str_contains($g, 'levothyroxine') || str_contains($g, 'carbimazole') || str_contains($g, 'dydrogesterone') ||
            str_contains($g, 'progesterone') || str_contains($g, 'norethisterone') || str_contains($g, 'letrozole') ||
            str_contains($g, 'prednisolone') || str_contains($g, 'dexamethasone') || str_contains($g, 'deflazacort') ||
            str_contains($g, 'tamoxifen') || str_contains($g, 'medroxyprogesterone')) {
            return 'Endocrine & Hormone Preparations';
        }

        // Anthelmintics & Antiparasitics
        if (str_contains($g, 'albendazole') || str_contains($g, 'mebendazole') || str_contains($g, 'ivermectin') ||
            str_contains($g, 'pyrantel') || str_contains($g, 'nitazoxanide') || str_contains($g, 'artemether') ||
            str_contains($g, 'chloroquine') || str_contains($g, 'lumefantrine')) {
            return 'Anthelmintics & Antiparasitics';
        }

        // Oral Rehydration & Electrolytes
        if (str_contains($g, 'oral rehydration') || str_contains($g, 'ors') || str_contains($g, 'electrolyte') ||
            str_contains($g, 'dextrose') || str_contains($g, 'saline') || str_contains($b, 'saline drop')) {
            return 'Oral Rehydration & Electrolytes';
        }

        // First Aid & Disinfectants
        if (str_contains($g, 'povidone') || str_contains($g, 'chlorhexidine') || str_contains($g, 'hydrogen peroxide') ||
            str_contains($b, 'bandage') || str_contains($b, 'cotton') || str_contains($b, 'first aid')) {
            return 'First Aid & Disinfectants';
        }

        // Medical Devices & Supplies
        if (str_contains($b, 'thermometer') || str_contains($b, 'mask') || str_contains($b, 'device') ||
            str_contains($d, 'device') || str_contains($d, 'strip')) {
            return 'Medical Devices & Supplies';
        }

        return 'General & Other Medicines (Review)';
    }

    /**
     * Resolve standard packaging unit.
     */
    public function resolveUnitName(string $dosageForm): string
    {
        $lower = strtolower($dosageForm);

        if (str_contains($lower, 'tablet') || str_contains($lower, 'capsule')) {
            return 'Strip';
        }
        if (str_contains($lower, 'syrup') || str_contains($lower, 'suspension') || str_contains($lower, 'drop') || str_contains($lower, 'solution') || str_contains($lower, 'liquid') || str_contains($lower, 'elixir')) {
            return 'Bottle';
        }
        if (str_contains($lower, 'vial')) {
            return 'Vial';
        }
        if (str_contains($lower, 'ampoule')) {
            return 'Ampoule';
        }
        if (str_contains($lower, 'injection') || str_contains($lower, 'infusion')) {
            return 'Vial';
        }
        if (str_contains($lower, 'cream') || str_contains($lower, 'ointment') || str_contains($lower, 'gel')) {
            return 'Tube';
        }

        return 'Piece';
    }

    /**
     * Parse pricing from raw packaging string into integer BDT cents.
     */
    public function parsePriceCents(string $pkgContainer): int
    {
        if (preg_match('/Unit Price:\s*৳\s*([0-9]+(?:\.[0-9]+)?)/u', $pkgContainer, $match)) {
            return (int) round(((float) $match[1]) * 100);
        }

        if (preg_match('/৳\s*([0-9]+(?:\.[0-9]+)?)/u', $pkgContainer, $match)) {
            return (int) round(((float) $match[1]) * 100);
        }

        return 0;
    }

    /**
     * Parse packaging size.
     */
    public function parsePackSize(string $pkgContainer, string $pkgSize): string
    {
        if ($pkgSize !== '') {
            if (preg_match('/\(([^:\)]+)/', $pkgSize, $match)) {
                return trim($match[1]);
            }

            return trim($pkgSize);
        }

        if (str_contains($pkgContainer, ':')) {
            return trim(explode(':', $pkgContainer)[0]);
        }

        return 'Standard Pack';
    }

    /**
     * Determine clinical route of administration.
     */
    public function determineRoute(string $dosageForm): string
    {
        $lower = strtolower($dosageForm);

        if (str_contains($lower, 'injection') || str_contains($lower, 'infusion') || str_contains($lower, 'iv') || str_contains($lower, 'im') || str_contains($lower, 'vial') || str_contains($lower, 'ampoule')) {
            return 'Parenteral / Injection';
        }
        if (str_contains($lower, 'eye') || str_contains($lower, 'ophthalmic')) {
            return 'Ophthalmic';
        }
        if (str_contains($lower, 'ear') || str_contains($lower, 'otic')) {
            return 'Otic';
        }
        if (str_contains($lower, 'cream') || str_contains($lower, 'ointment') || str_contains($lower, 'gel') || str_contains($lower, 'lotion') || str_contains($lower, 'topical')) {
            return 'Topical';
        }
        if (str_contains($lower, 'inhaler') || str_contains($lower, 'respirator') || str_contains($lower, 'spray')) {
            return 'Respiratory / Inhalation';
        }
        if (str_contains($lower, 'suppository') || str_contains($lower, 'rectal')) {
            return 'Rectal';
        }

        return 'Oral';
    }

    /**
     * Determine prescription classification.
     */
    public function isPrescriptionRequired(string $generic, string $dosageForm): bool
    {
        $genericLower = strtolower($generic);
        $formLower = strtolower($dosageForm);

        if (str_contains($formLower, 'injection') || str_contains($formLower, 'infusion') || str_contains($formLower, 'vial') || str_contains($formLower, 'ampoule')) {
            return true;
        }

        // Common OTC drug categories in Bangladesh
        $otcKeywords = [
            'paracetamol',
            'antacid',
            'vitamin c',
            'ascorbic acid',
            'calcium',
            'cholecalciferol',
            'colecalciferol',
            'zinc',
            'folic acid',
            'multivitamin',
            'oral rehydration',
            'ors',
            'dextromethorphan',
            'bromhexine',
            'gaviscon',
            'petroleum jelly',
            'dextrose',
        ];

        foreach ($otcKeywords as $otc) {
            if (str_contains($genericLower, $otc) && ! str_contains($genericLower, 'codeine') && ! str_contains($genericLower, 'tramadol')) {
                return false;
            }
        }

        return true;
    }
}
