<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('generic_name')->nullable()->after('name');
            $table->string('strength')->nullable()->after('generic_name');
            $table->string('dosage_form')->nullable()->after('strength');
            $table->string('pack_size')->nullable()->after('dosage_form');
            $table->string('dar_no')->nullable()->after('pack_size');
            $table->string('route')->nullable()->after('dar_no');
            $table->boolean('prescription_required')->default(false)->after('route');
            $table->string('therapeutic_class')->nullable()->after('prescription_required');

            $table->index(['store_id', 'generic_name']);
            $table->index(['store_id', 'dosage_form']);
            $table->index(['store_id', 'dar_no']);
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['store_id', 'generic_name']);
            $table->dropIndex(['store_id', 'dosage_form']);
            $table->dropIndex(['store_id', 'dar_no']);
            $table->dropColumn([
                'generic_name',
                'strength',
                'dosage_form',
                'pack_size',
                'dar_no',
                'route',
                'prescription_required',
                'therapeutic_class',
            ]);
        });
    }
};
