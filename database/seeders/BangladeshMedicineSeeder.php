<?php

namespace Database\Seeders;

use App\Services\MedicineImportService;
use Illuminate\Database\Seeder;

class BangladeshMedicineSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $filePath = database_path('data/bangladesh_medicines.csv');

        $importer = app(MedicineImportService::class);
        $stats = $importer->import(
            filePath: $filePath,
            storeId: null, // Resolves to pharmacy store
            limit: 10000,
            chunkSize: 500,
            dryRun: false,
            initialStockMin: 20,
            initialStockMax: 100,
            enablePos: true
        );

        $importer->enablePosAndSeedStock($stats['store_id'], 20, 100);

        $this->command?->info("Bangladesh Medicines Seeded: {$stats['distinct_processed']} total, stock seeded (20-100) and enabled in POS for {$stats['store_name']}.");
    }
}
