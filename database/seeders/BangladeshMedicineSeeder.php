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
            storeId: null, // Resolves to pharmacy store (pharmacy@bornopos.test)
            replaceExisting: true,
            limit: 10000,
            chunkSize: 500,
            dryRun: false,
            seedStock: false,
            enablePos: true
        );

        $this->command?->info("Bangladesh Medicines Seeded: {$stats['distinct_processed']} verified medicines cataloged and enabled in POS for {$stats['store_name']}.");
    }
}
