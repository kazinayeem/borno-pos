<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->unsignedInteger('duration_days')->default(30)->after('interval');
            $table->unsignedInteger('trial_days')->default(0)->after('duration_days');
            $table->unsignedInteger('max_users')->default(5)->after('trial_days');
            $table->unsignedInteger('max_stores')->default(1)->after('max_users');
            $table->unsignedInteger('max_products')->default(500)->after('max_stores');
            $table->json('allowed_modules')->nullable()->after('features');
        });

        Schema::table('stores', function (Blueprint $table) {
            $table->string('subscription_status')->default('active')->after('is_active');
            $table->timestamp('subscription_expires_at')->nullable()->after('subscription_status');
            $table->timestamp('suspended_at')->nullable()->after('subscription_expires_at');
            $table->text('suspension_reason')->nullable()->after('suspended_at');
            $table->foreignId('active_plan_id')->nullable()->after('suspension_reason')->constrained('plans')->nullOnDelete();
            $table->json('module_overrides')->nullable()->after('active_plan_id');
        });

        Schema::create('subscription_invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_no')->unique();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subscription_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('plan_id')->nullable()->constrained()->nullOnDelete();
            $table->string('billing_period')->default('month');
            $table->date('starts_on')->nullable();
            $table->date('ends_on')->nullable();
            $table->integer('subtotal_cents')->default(0);
            $table->integer('discount_cents')->default(0);
            $table->integer('tax_cents')->default(0);
            $table->integer('total_cents')->default(0);
            $table->integer('paid_cents')->default(0);
            $table->integer('due_cents')->default(0);
            $table->string('status')->default('unpaid');
            $table->date('due_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('subscription_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('subscription_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('invoice_id')->nullable()->constrained('subscription_invoices')->nullOnDelete();
            $table->foreignId('plan_id')->nullable()->constrained()->nullOnDelete();
            $table->string('payment_method')->default('bkash');
            $table->string('account_type')->nullable();
            $table->integer('amount_cents')->default(0);
            $table->string('transaction_id')->index();
            $table->string('sender_phone')->nullable();
            $table->date('payment_date')->nullable();
            $table->string('screenshot_path')->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('pending');
            $table->text('rejection_reason')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscription_payments');
        Schema::dropIfExists('subscription_invoices');

        Schema::table('stores', function (Blueprint $table) {
            $table->dropForeign(['active_plan_id']);
            $table->dropColumn([
                'subscription_status',
                'subscription_expires_at',
                'suspended_at',
                'suspension_reason',
                'active_plan_id',
                'module_overrides',
            ]);
        });

        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn([
                'duration_days',
                'trial_days',
                'max_users',
                'max_stores',
                'max_products',
                'allowed_modules',
            ]);
        });
    }
};
