<?php

namespace App\Services;

use App\Models\Account;
use App\Models\AccountTransaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class LedgerService
{
    public function defaultAccount(int $storeId): Account
    {
        $account = Account::withoutGlobalScopes()->where('store_id', $storeId)->where('is_default', true)->first();

        if ($account) {
            return $account;
        }

        $any = Account::withoutGlobalScopes()->where('store_id', $storeId)->first();
        if ($any) {
            return $any;
        }

        return Account::withoutGlobalScopes()->create([
            'store_id' => $storeId,
            'name' => 'Cash',
            'number' => 'CASH-001',
            'type' => 'cash',
            'is_default' => true,
        ]);
    }

    public function post(
        Account $account,
        string $direction,
        int $amountCents,
        string $sourceKey,
        string $description,
        ?Model $reference,
        Carbon|string $date,
        ?User $user = null,
    ): AccountTransaction {
        if ($amountCents <= 0) {
            throw new \InvalidArgumentException('Ledger amounts must be positive.');
        }

        $existing = AccountTransaction::withoutGlobalScopes()->where('source_key', $sourceKey)->first();
        if ($existing) {
            return $existing;
        }

        return AccountTransaction::create([
            'store_id' => $account->store_id,
            'account_id' => $account->id,
            'user_id' => $user?->id,
            'transacted_on' => Carbon::parse($date)->toDateString(),
            'direction' => $direction,
            'amount_cents' => $amountCents,
            'description' => $description,
            'reference_type' => $reference ? $reference->getMorphClass() : null,
            'reference_id' => $reference?->getKey(),
            'source_key' => $sourceKey,
        ]);
    }
}
