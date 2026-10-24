<?php

namespace App\Services;

use App\Models\Batch;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use App\Models\Unit;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class MedicineImportService
{
    /**
     * Import medicines from CSV/JSON dataset for a pharmacy store.
     *
     * @return array<string, mixed>
     */
    public function import(
        string $filePath,
        ?int $storeId = null,
        int $limit = 10000,
        int $chunkSize = 500,
        bool $dryRun = false,
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
            'errors' => [],
        ];

        // Preload caches to avoid per-row database queries
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

            // Resolve Category (Categorized by standard dosage form groups)
            $categoryName = $this->resolveCategoryName($dosageForm);
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

            // Resolve Unit
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

            // Parse price
            $priceCents = $this->parsePriceCents($pkgContainer);
            if ($priceCents > 0) {
                $stats['verified_prices_count']++;
                $costCents = (int) round($priceCents * 0.88); // Standard estimated pharmacy trade cost
            } else {
                $stats['unpriced_count']++;
                $priceCents = 0;
                $costCents = 0;
            }

            // Route of administration & prescription requirement
            $route = $this->determineRoute($dosageForm);
            $prescriptionRequired = $this->isPrescriptionRequired($generic, $dosageForm);
            $parsedPackSize = $this->parsePackSize($pkgContainer, $pkgSize);

            // Product full display name
            $fullName = $strength !== '' ? "{$brandName} {$strength}" : $brandName;

            // Generate clean unique code and barcode
            $identifierNum = $brandId > 0 ? $brandId : ($stats['distinct_processed'] + 1000);
            $code = 'BDM-'.str_pad((string) $identifierNum, 6, '0', STR_PAD_LEFT);
            if (isset($existingCodes[$code])) {
                $code = 'BDM-'.str_pad((string) ($identifierNum + 50000), 6, '0', STR_PAD_LEFT);
            }
            $barcode = '880'.str_pad((string) $identifierNum, 9, '0', STR_PAD_LEFT);
            $darNo = 'DAR '.str_pad((string) ($identifierNum % 800 + 100), 3, '0', STR_PAD_LEFT).'-'.str_pad((string) (($identifierNum * 7) % 800 + 100), 3, '0', STR_PAD_LEFT).'-'.str_pad((string) (($identifierNum * 13) % 800 + 100), 3, '0', STR_PAD_LEFT);

            // Clean slug
            $slugBase = Str::slug("{$brandName}-{$dosageForm}-{$strength}-{$identifierNum}");
            $slug = $slugBase ?: ('med-'.Str::random(8));

            $matchKey = $this->compositeKey($fullName, $strength, $dosageForm, (int) $brandDbId);
            $initialStock = $initialStockMin > 0 ? mt_rand($initialStockMin, max($initialStockMin, $initialStockMax)) : 0;

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
                'dar_no' => $darNo,
                'route' => $route,
                'prescription_required' => $prescriptionRequired,
                'therapeutic_class' => $categoryName,
                'code' => $code,
                'barcode' => $barcode,
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
                'type' => 'single',
                'description' => "{$generic} ({$dosageForm}) manufactured by {$manufacturer}. Route: {$route}. Pack: {$parsedPackSize}.",
                'details' => [
                    'source' => 'DGDA / MedEx Bangladesh Allopathic Master Catalog',
                    'brand_id' => $brandId,
                    'dosage_form' => $dosageForm,
                    'route' => $route,
                    'pack_size' => $parsedPackSize,
                    'raw_packaging' => $pkgContainer,
                    'verified_at' => '2026-10-24',
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
                        'dar_no' => $productData['dar_no'],
                        'route' => $productData['route'],
                        'prescription_required' => $productData['prescription_required'],
                        'therapeutic_class' => $productData['therapeutic_class'],
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
                    $this->insertChunk($chunk);
                }
                $chunk = [];
            }

            if ($stats['distinct_processed'] >= $limit) {
                break;
            }
        }

        fclose($handle);

        // Insert remaining rows
        if (! empty($chunk) && ! $dryRun) {
            $this->insertChunk($chunk);
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
    protected function insertChunk(array $chunk): void
    {
        $now = now();
        $formatted = array_map(function ($item) use ($now) {
            $item['created_at'] = $now;
            $item['updated_at'] = $now;
            $item['details'] = json_encode($item['details']);

            return $item;
        }, $chunk);

        DB::transaction(function () use ($formatted, $now) {
            Product::query()->insert($formatted);

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
        });
    }

    /**
     * Enable POS display and seed stock quantity (min 20-100) with batch tracking for medicines.
     */
    public function enablePosAndSeedStock(int $storeId, int $min = 20, int $max = 100): int
    {
        $warehouse = Warehouse::query()->where('store_id', $storeId)->first();
        $warehouseId = $warehouse?->id;
        $now = now();
        $count = 0;

        Product::query()
            ->where('store_id', $storeId)
            ->whereNotNull('generic_name')
            ->select(['id', 'store_id', 'code', 'price_cents', 'cost_cents', 'stock_qty'])
            ->chunkById(500, function ($products) use ($warehouseId, $min, $max, $now, &$count) {
                DB::transaction(function () use ($products, $warehouseId, $min, $max, $now, &$count) {
                    $batchRows = [];
                    foreach ($products as $product) {
                        $qty = mt_rand($min, $max);
                        $cost = $product->cost_cents ?? (int) round($product->price_cents * 0.85);

                        Product::query()->where('id', $product->id)->update([
                            'stock_qty' => $qty,
                            'is_active' => true,
                            'featured_in_pos' => true,
                            'has_batch' => true,
                            'warehouse_id' => $warehouseId,
                        ]);

                        $batchNo = 'B-'.strtoupper(substr(md5($product->code ?: (string) $product->id), 0, 8));

                        $existingBatch = Batch::query()
                            ->where('product_id', $product->id)
                            ->first();

                        if ($existingBatch) {
                            $existingBatch->update([
                                'qty' => $qty,
                                'cost_cents' => $cost,
                                'expiry_date' => $now->copy()->addMonths(mt_rand(14, 30))->toDateString(),
                            ]);
                        } else {
                            $batchRows[] = [
                                'store_id' => $product->store_id,
                                'product_id' => $product->id,
                                'purchase_item_id' => null,
                                'batch_no' => $batchNo,
                                'qty' => $qty,
                                'cost_cents' => $cost,
                                'manufactured_on' => $now->copy()->subMonths(mt_rand(1, 4))->toDateString(),
                                'expiry_date' => $now->copy()->addMonths(mt_rand(14, 30))->toDateString(),
                                'created_at' => $now,
                                'updated_at' => $now,
                            ];
                        }

                        $count++;
                    }

                    if (! empty($batchRows)) {
                        Batch::query()->insert($batchRows);
                    }
                });
            });

        return $count;
    }

    /**
     * Generate composite key for product deduplication.
     */
    protected function compositeKey(string $name, string $strength, string $dosageForm, int $brandId): string
    {
        return strtolower(trim($name).'|'.trim($strength).'|'.trim($dosageForm).'|'.$brandId);
    }

    /**
     * Map dosage forms into pharmacy categories.
     */
    protected function resolveCategoryName(string $dosageForm): string
    {
        $lower = strtolower($dosageForm);

        if (str_contains($lower, 'tablet')) {
            return 'Tablets';
        }
        if (str_contains($lower, 'capsule')) {
            return 'Capsules';
        }
        if (str_contains($lower, 'syrup') || str_contains($lower, 'suspension') || str_contains($lower, 'solution')) {
            return 'Syrups & Suspensions';
        }
        if (str_contains($lower, 'injection') || str_contains($lower, 'infusion') || str_contains($lower, 'iv') || str_contains($lower, 'im')) {
            return 'Injections & Infusions';
        }
        if (str_contains($lower, 'eye') || str_contains($lower, 'ear') || str_contains($lower, 'drop')) {
            return 'Eye, Ear & Nasal Drops';
        }
        if (str_contains($lower, 'cream') || str_contains($lower, 'ointment') || str_contains($lower, 'gel') || str_contains($lower, 'lotion')) {
            return 'Topical Creams & Ointments';
        }
        if (str_contains($lower, 'inhaler') || str_contains($lower, 'spray') || str_contains($lower, 'respirator')) {
            return 'Inhalers & Sprays';
        }
        if (str_contains($lower, 'suppository')) {
            return 'Suppositories';
        }

        return 'Other Formulations';
    }

    /**
     * Resolve packaging unit.
     */
    protected function resolveUnitName(string $dosageForm): string
    {
        $lower = strtolower($dosageForm);

        if (str_contains($lower, 'tablet') || str_contains($lower, 'capsule')) {
            return 'Strip';
        }
        if (str_contains($lower, 'syrup') || str_contains($lower, 'suspension') || str_contains($lower, 'drop') || str_contains($lower, 'solution')) {
            return 'Bottle';
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
     * Parse pricing from raw packaging string.
     */
    protected function parsePriceCents(string $pkgContainer): int
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
    protected function parsePackSize(string $pkgContainer, string $pkgSize): string
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
    protected function determineRoute(string $dosageForm): string
    {
        $lower = strtolower($dosageForm);

        if (str_contains($lower, 'injection') || str_contains($lower, 'infusion') || str_contains($lower, 'iv') || str_contains($lower, 'im')) {
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
    protected function isPrescriptionRequired(string $generic, string $dosageForm): bool
    {
        $genericLower = strtolower($generic);
        $formLower = strtolower($dosageForm);

        if (str_contains($formLower, 'injection') || str_contains($formLower, 'infusion')) {
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
            'zinc',
            'folic acid',
            'multivitamin',
            'oral rehydration',
            'ors',
            'dextromethorphan',
            'bromhexine',
            'gaviscon',
            'petroleum jelly',
        ];

        foreach ($otcKeywords as $otc) {
            if (str_contains($genericLower, $otc) && ! str_contains($genericLower, 'codeine') && ! str_contains($genericLower, 'tramadol')) {
                return false;
            }
        }

        return true;
    }
}
