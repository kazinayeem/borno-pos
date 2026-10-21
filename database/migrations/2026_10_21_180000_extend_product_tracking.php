<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('slug')->nullable()->after('name');
            $table->string('barcode')->nullable()->after('code');
            $table->foreignId('supplier_id')->nullable()->after('warehouse_id')->constrained()->nullOnDelete();
            $table->unsignedSmallInteger('near_expiry_days')->default(30)->after('alert_qty');
            $table->json('details')->nullable()->after('description');
            $table->unique(['store_id', 'slug']);
            $table->unique(['store_id', 'barcode']);
        });

        Schema::table('batches', function (Blueprint $table) {
            $table->date('manufactured_on')->nullable()->after('batch_no');
            $table->integer('cost_cents')->default(0)->after('qty');
            $table->index(['product_id', 'expiry_date']);
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->foreignId('batch_id')->nullable()->after('product_variant_id')->constrained()->nullOnDelete();
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->string('barcode')->nullable()->after('sku');
            $table->json('attributes')->nullable()->after('stock_qty');
        });

        Schema::create('sale_item_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('batch_id')->constrained()->cascadeOnDelete();
            $table->integer('qty');
            $table->integer('returned_qty')->default(0);
            $table->timestamps();
        });

        Schema::create('product_serials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('purchase_item_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('sale_item_id')->nullable()->constrained()->nullOnDelete();
            $table->string('identifier');
            $table->string('kind')->default('serial');
            $table->string('status')->default('in_stock')->index();
            $table->date('warranty_starts_on')->nullable();
            $table->date('warranty_ends_on')->nullable();
            $table->timestamps();
            $table->unique(['store_id', 'identifier']);
        });

        Schema::create('product_serial_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_serial_id')->constrained()->cascadeOnDelete();
            $table->string('kind');
            $table->string('note')->nullable();
            $table->date('happened_on');
            $table->timestamps();
        });

        Schema::create('product_ingredients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ingredient_id')->constrained('products')->cascadeOnDelete();
            $table->integer('qty');
            $table->timestamps();
            $table->unique(['product_id', 'ingredient_id']);
        });

        Schema::create('installment_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->integer('principal_cents');
            $table->integer('fee_cents')->default(0);
            $table->integer('financed_cents');
            $table->integer('down_payment_cents')->default(0);
            $table->timestamps();
            $table->unique('sale_id');
        });

        Schema::create('installments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('installment_plan_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('sequence');
            $table->date('due_on')->index();
            $table->integer('amount_cents');
            $table->integer('paid_cents')->default(0);
            $table->string('status')->default('open')->index();
            $table->timestamps();
            $table->unique(['installment_plan_id', 'sequence']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('installments');
        Schema::dropIfExists('installment_plans');
        Schema::dropIfExists('product_ingredients');
        Schema::dropIfExists('product_serial_events');
        Schema::dropIfExists('product_serials');
        Schema::dropIfExists('sale_item_batches');

        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn(['barcode', 'attributes']);
        });
        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('batch_id');
        });
        Schema::table('batches', function (Blueprint $table) {
            $table->dropIndex(['product_id', 'expiry_date']);
            $table->dropColumn(['manufactured_on', 'cost_cents']);
        });
        Schema::table('products', function (Blueprint $table) {
            $table->dropUnique(['store_id', 'slug']);
            $table->dropUnique(['store_id', 'barcode']);
            $table->dropConstrainedForeignId('supplier_id');
            $table->dropColumn(['slug', 'barcode', 'near_expiry_days', 'details']);
        });
    }
};
