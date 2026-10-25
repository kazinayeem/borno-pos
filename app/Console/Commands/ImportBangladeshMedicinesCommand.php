<?php

namespace App\Console\Commands;

use App\Services\MedicineImportService;
use Illuminate\Console\Command;

class ImportBangladeshMedicinesCommand extends Command
{
    protected $signature = 'medicine:import-bd
                            {--file=database/data/bangladesh_medicines.csv : Path to CSV dataset}
                            {--store= : Target Store ID (defaults to active pharmacy store)}
                            {--replace : Safely remove disposable seed catalog records and obsolete categories, preserving all transaction data}
                            {--limit=10000 : Maximum number of distinct records to import (0 for all verified records)}
                            {--chunk=500 : Chunk size for database insertion}
                            {--dry-run : Run validation and parsing without committing to database}
                            {--seed-stock : Explicitly seed opening stock quantities (defaults to false / 0 stock)}
                            {--min-stock=20 : Minimum opening stock if seed-stock is enabled}
                            {--max-stock=100 : Maximum opening stock if seed-stock is enabled}';

    protected $description = 'Import verified Bangladesh DGDA allopathic medicines master dataset into pharmacy catalog.';

    public function handle(MedicineImportService $importer): int
    {
        $filePath = base_path((string) $this->option('file'));
        $storeId = $this->option('store') ? (int) $this->option('store') : null;
        $replace = (bool) $this->option('replace');
        $limit = (int) $this->option('limit');
        $chunk = (int) $this->option('chunk');
        $dryRun = (bool) $this->option('dry-run');
        $seedStock = (bool) $this->option('seed-stock');
        $minStock = max(1, (int) $this->option('min-stock'));
        $maxStock = max($minStock, (int) $this->option('max-stock'));

        $this->components->info('Starting Bangladesh Medicine Database Import...');
        $this->components->twoColumnDetail('Source File', $filePath);
        $this->components->twoColumnDetail('Target Limit', $limit > 0 ? (string) $limit : 'All Available Verified Records');
        $this->components->twoColumnDetail('Execution Mode', $dryRun ? 'DRY-RUN (Simulated - No Database Changes)' : 'PRODUCTION IMPORT');
        $this->components->twoColumnDetail('Catalog Replacement', $replace ? 'ENABLED (Safe Replacement Preserving Transactions)' : 'INCREMENTAL (Merge / Update)');
        $this->components->twoColumnDetail('Stock Mode', $seedStock ? "Seeding opening stock ({$minStock}-{$maxStock})" : 'Catalog Master Mode (0 opening stock, no fake batches)');

        $startTime = microtime(true);

        try {
            $stats = $importer->import(
                filePath: $filePath,
                storeId: $storeId,
                replaceExisting: $replace,
                limit: $limit,
                chunkSize: $chunk,
                dryRun: $dryRun,
                seedStock: $seedStock,
                initialStockMin: $minStock,
                initialStockMax: $maxStock,
                enablePos: true
            );
        } catch (\Throwable $e) {
            $this->components->error('Import failed: '.$e->getMessage());

            return self::FAILURE;
        }

        $duration = round(microtime(true) - $startTime, 2);

        $this->newLine();
        $this->components->info("Operation completed successfully in {$duration} seconds!");
        $this->components->twoColumnDetail('Destination Store', "{$stats['store_name']} (ID: {$stats['store_id']})");

        if (! empty($stats['replacement'])) {
            $rep = $stats['replacement'];
            $this->newLine();
            $this->components->warn('Catalog Replacement Summary:');
            $this->components->twoColumnDetail('Original Product Records', number_format($rep['original_total']));
            $this->components->twoColumnDetail('Preserved (Has Real Transactions)', number_format($rep['preserved_count']));
            $this->components->twoColumnDetail('Disposable Seed Records Replaced', number_format($rep['products_deleted']));
            $this->components->twoColumnDetail('Disposable Demo Batches Removed', number_format($rep['batches_deleted']));
        }

        $this->newLine();
        $this->components->info('Import Metrics:');
        $this->components->twoColumnDetail('Total Raw Rows Read', number_format($stats['total_rows_read']));
        $this->components->twoColumnDetail('Distinct Processed', number_format($stats['distinct_processed']));
        $this->components->twoColumnDetail('New Verified Medicines Inserted', number_format($stats['inserted']));
        $this->components->twoColumnDetail('Existing Medicines Updated / Enriched', number_format($stats['updated']));
        $this->components->twoColumnDetail('Duplicate Source Rows Skipped', number_format($stats['skipped']));
        $this->components->twoColumnDetail('Invalid Rows Rejected', number_format($stats['rejected']));
        $this->components->twoColumnDetail('Distinct Generic Ingredients', number_format($stats['unique_generics']));
        $this->components->twoColumnDetail('Distinct Bangladeshi Manufacturers', number_format($stats['unique_manufacturers']));
        $this->components->twoColumnDetail('Records with Verified Unit MRP (৳)', number_format($stats['verified_prices_count']));
        $this->components->twoColumnDetail('Unpriced / Review Required Records', number_format($stats['unpriced_count']));
        $this->components->twoColumnDetail('Therapeutic Categories Created', number_format($stats['categories_created']));
        $this->components->twoColumnDetail('Manufacturer Brands Created', number_format($stats['brands_created']));
        $this->components->twoColumnDetail('Packaging Units Created', number_format($stats['units_created']));

        if (! empty($stats['errors'])) {
            $this->newLine();
            $this->components->warn('Sample Rejected Rows:');
            foreach (array_slice($stats['errors'], 0, 5) as $err) {
                $this->line(" - {$err}");
            }
        }

        $this->newLine();
        $this->components->info('Data Integrity & Source Notice:');
        $this->line(' - Sourced from Directorate General of Drug Administration (DGDA) / MedEx Bangladesh Allopathic Catalog.');
        $this->line(' - No registration numbers (DAR) or barcodes were fabricated; unverified fields remain null for owner review.');
        $this->line(' - Historical sales, purchases, inventory movements, and customer invoices remain 100% intact.');

        return self::SUCCESS;
    }
}
