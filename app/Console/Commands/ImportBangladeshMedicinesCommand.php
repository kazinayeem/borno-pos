<?php

namespace App\Console\Commands;

use App\Services\MedicineImportService;
use Illuminate\Console\Command;

class ImportBangladeshMedicinesCommand extends Command
{
    protected $signature = 'medicine:import-bd
                            {--file=database/data/bangladesh_medicines.csv : Path to CSV dataset}
                            {--store= : Target Store ID (defaults to active pharmacy store)}
                            {--limit=10000 : Maximum number of distinct records to import}
                            {--chunk=500 : Chunk size for database insertion}
                            {--dry-run : Run validation and parsing without committing to database}';

    protected $description = 'Import verified Bangladesh DGDA allopathic medicines master dataset into pharmacy catalog.';

    public function handle(MedicineImportService $importer): int
    {
        $filePath = base_path((string) $this->option('file'));
        $storeId = $this->option('store') ? (int) $this->option('store') : null;
        $limit = (int) $this->option('limit');
        $chunk = (int) $this->option('chunk');
        $dryRun = (bool) $this->option('dry-run');

        $this->components->info('Starting Bangladesh Medicine Database Import...');
        $this->components->twoColumnDetail('Source File', $filePath);
        $this->components->twoColumnDetail('Target Limit', (string) $limit);
        $this->components->twoColumnDetail('Execution Mode', $dryRun ? 'DRY-RUN (Simulated)' : 'PRODUCTION IMPORT');

        $startTime = microtime(true);

        try {
            $stats = $importer->import($filePath, $storeId, $limit, $chunk, $dryRun);
        } catch (\Throwable $e) {
            $this->components->error('Import failed: '.$e->getMessage());

            return self::FAILURE;
        }

        $duration = round(microtime(true) - $startTime, 2);

        $this->newLine();
        $this->components->info("Import completed successfully in {$duration} seconds!");
        $this->components->twoColumnDetail('Destination Store', "{$stats['store_name']} (ID: {$stats['store_id']})");
        $this->components->twoColumnDetail('Total Raw Rows Read', number_format($stats['total_rows_read']));
        $this->components->twoColumnDetail('Distinct Processed', number_format($stats['distinct_processed']));
        $this->components->twoColumnDetail('New Medicines Inserted', number_format($stats['inserted']));
        $this->components->twoColumnDetail('Existing Medicines Updated', number_format($stats['updated']));
        $this->components->twoColumnDetail('Duplicate Source Rows Skipped', number_format($stats['skipped']));
        $this->components->twoColumnDetail('Invalid Rows Rejected', number_format($stats['rejected']));
        $this->components->twoColumnDetail('Distinct Generics', number_format($stats['unique_generics']));
        $this->components->twoColumnDetail('Distinct Manufacturers', number_format($stats['unique_manufacturers']));
        $this->components->twoColumnDetail('Records with Verified Unit MRP', number_format($stats['verified_prices_count']));
        $this->components->twoColumnDetail('Unpriced / Safe Default Records', number_format($stats['unpriced_count']));
        $this->components->twoColumnDetail('Dosage Categories Created', number_format($stats['categories_created']));
        $this->components->twoColumnDetail('Manufacturer Brands Created', number_format($stats['brands_created']));

        if (! empty($stats['errors'])) {
            $this->newLine();
            $this->components->warn('Sample Rejected Rows:');
            foreach (array_slice($stats['errors'], 0, 5) as $err) {
                $this->line(" - {$err}");
            }
        }

        return self::SUCCESS;
    }
}
