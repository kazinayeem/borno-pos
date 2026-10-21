<?php

namespace App\Services;

use App\Models\Installment;
use App\Models\InstallmentPlan;
use App\Models\Payment;
use App\Models\Sale;
use App\Models\User;
use App\Support\Money;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InstallmentService
{
    public function __construct(private LedgerService $ledger) {}

    /**
     * @param  array{count:int, first_due:string, fee?:mixed}  $data
     */
    public function schedule(Sale $sale, array $data): InstallmentPlan
    {
        return DB::transaction(function () use ($sale, $data) {
            $sale = Sale::whereKey($sale->id)->lockForUpdate()->firstOrFail();
            if ($sale->status !== 'completed') {
                throw ValidationException::withMessages(['sale' => 'Only a completed sale can have an installment schedule.']);
            }
            if (! $sale->customer_id) {
                throw ValidationException::withMessages(['customer_id' => 'Choose a customer before creating an installment schedule.']);
            }
            if (InstallmentPlan::where('sale_id', $sale->id)->exists()) {
                throw ValidationException::withMessages(['sale' => 'This sale already has an installment schedule.']);
            }

            $count = (int) $data['count'];
            if ($count < 1 || $count > 24) {
                throw ValidationException::withMessages(['count' => 'Use between 1 and 24 installments.']);
            }
            $fee = Money::parse($data['fee'] ?? 0);
            $principal = max(0, (int) $sale->grand_cents - (int) $sale->paid_cents);
            if ($principal < 1 && $fee < 1) {
                throw ValidationException::withMessages(['sale' => 'This sale has no balance left to schedule.']);
            }
            $financed = $principal + $fee;
            $base = intdiv($financed, $count);
            if ($base < 1) {
                throw ValidationException::withMessages(['count' => 'The balance is too small for that many installments.']);
            }
            $extra = $financed - ($base * $count);
            $due = Carbon::parse($data['first_due'])->startOfDay();

            $plan = InstallmentPlan::create([
                'store_id' => $sale->store_id,
                'sale_id' => $sale->id,
                'customer_id' => $sale->customer_id,
                'principal_cents' => $principal,
                'fee_cents' => $fee,
                'financed_cents' => $financed,
                'down_payment_cents' => (int) $sale->paid_cents,
            ]);
            for ($sequence = 1; $sequence <= $count; $sequence++) {
                Installment::create([
                    'store_id' => $sale->store_id,
                    'installment_plan_id' => $plan->id,
                    'sequence' => $sequence,
                    'due_on' => $due->copy()->addMonths($sequence - 1)->toDateString(),
                    'amount_cents' => $base + ($sequence === $count ? $extra : 0),
                    'paid_cents' => 0,
                    'status' => 'open',
                ]);
            }

            return $plan->load('installments', 'customer');
        });
    }

    public function pay(Installment $installment, User $user, int $amountCents, string $method): Installment
    {
        if ($amountCents < 1) {
            throw ValidationException::withMessages(['amount' => 'Enter a payment amount.']);
        }

        return DB::transaction(function () use ($installment, $user, $amountCents, $method) {
            $installment = Installment::whereKey($installment->id)->lockForUpdate()->firstOrFail();
            $room = $installment->dueCents();
            if ($amountCents > $room) {
                throw ValidationException::withMessages(['amount' => 'That payment is more than the installment balance.']);
            }

            $installment->paid_cents = (int) $installment->paid_cents + $amountCents;
            $installment->status = $installment->paid_cents >= $installment->amount_cents ? 'paid' : 'partial';
            $installment->save();

            $plan = $installment->plan()->lockForUpdate()->firstOrFail();
            $sale = Sale::whereKey($plan->sale_id)->lockForUpdate()->firstOrFail();
            $principalRoom = max(0, (int) $sale->grand_cents - (int) $sale->paid_cents);
            $toSale = min($amountCents, $principalRoom);
            if ($toSale > 0) {
                $sale->paid_cents = (int) $sale->paid_cents + $toSale;
                $sale->save();
            }

            $source = 'installment:'.$installment->id.':'.$installment->paid_cents;
            $account = $this->ledger->defaultAccount((int) $installment->store_id);
            Payment::create([
                'store_id' => $installment->store_id,
                'payable_type' => $installment->getMorphClass(),
                'payable_id' => $installment->id,
                'account_id' => $account->id,
                'user_id' => $user->id,
                'method' => $method,
                'amount_cents' => $amountCents,
                'paid_at' => now(),
                'source_key' => $source,
            ]);
            $this->ledger->post(
                $account,
                'debit',
                $amountCents,
                $source,
                'Installment '.$installment->sequence.' for '.$sale->invoice_no,
                $installment,
                now(),
                $user,
            );

            return $installment->fresh('plan.installments');
        });
    }
}
