<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\AccountTransaction;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\MoneyTransfer;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Services\LedgerService;
use App\Support\DateRange;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class AccountingController extends Controller
{
    public function accounts(Request $request)
    {
        $accounts = Account::latest()->get()->each(fn ($account) => $account->balance = $account->balanceCents());

        if ($request->expectsJson()) {
            return response()->json([
                'accounts' => $accounts->map(fn ($account) => [
                    'id' => $account->id,
                    'name' => $account->name,
                    'number' => $account->number,
                    'type' => $account->type,
                    'balance_cents' => (int) $account->balanceCents(),
                    'is_default' => (bool) $account->is_default,
                ]),
            ]);
        }

        return view('spa');
    }

    public function storeAccount(Request $request, LedgerService $ledger)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'number' => ['nullable', 'string', 'max:40'],
            'type' => ['required', 'in:cash,bank,mobile'],
            'opening' => ['nullable'],
        ]);
        $opening = Money::parse($data['opening'] ?? 0);
        $account = Account::create([
            'name' => $data['name'],
            'number' => $data['number'] ?? null,
            'type' => $data['type'],
            'opening_cents' => $opening,
            'is_default' => Account::count() === 0,
        ]);

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Account saved successfully.', 'account' => $account]);
        }

        return back()->with('status', 'Account saved.');
    }

    public function updateAccount(Request $request, Account $account)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'number' => ['nullable', 'string', 'max:40'],
            'type' => ['required', 'in:cash,bank,mobile'],
        ]);
        $account->update($data);

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Account updated successfully.', 'account' => $account]);
        }

        return back()->with('status', 'Account updated.');
    }

    public function destroyAccount(Request $request, Account $account)
    {
        if (AccountTransaction::where('account_id', $account->id)->exists()) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Cannot delete account with existing transactions.'], 422);
            }

            return back()->withErrors(['account' => 'Cannot delete account with existing transactions.']);
        }
        $account->delete();

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Account deleted successfully.']);
        }

        return back()->with('status', 'Account deleted.');
    }

    public function transfers(Request $request)
    {
        $transfers = MoneyTransfer::with(['fromAccount', 'toAccount'])->latest('transferred_on')->latest('id')->paginate(15);
        $accounts = Account::orderBy('name')->get();

        if ($request->expectsJson()) {
            return response()->json([
                'transfers' => $transfers->getCollection()->map(fn ($t) => [
                    'id' => $t->id,
                    'from_account' => $t->fromAccount?->name,
                    'to_account' => $t->toAccount?->name,
                    'amount_cents' => (int) $t->amount_cents,
                    'transferred_on' => optional($t->transferred_on)->format('Y-m-d'),
                    'note' => $t->note,
                ]),
                'meta' => [
                    'current_page' => $transfers->currentPage(),
                    'last_page' => $transfers->lastPage(),
                    'total' => $transfers->total(),
                ],
                'accounts' => $accounts->map(fn ($acc) => [
                    'id' => $acc->id,
                    'name' => $acc->name,
                    'balance_cents' => (int) $acc->balanceCents(),
                ]),
            ]);
        }

        return view('spa');
    }

    public function storeTransfer(Request $request, LedgerService $ledger)
    {
        $data = $request->validate([
            'from_account_id' => ['required', 'integer', 'different:to_account_id'],
            'to_account_id' => ['required', 'integer'],
            'amount' => ['required'],
            'transferred_on' => ['required', 'date'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);
        $amount = Money::parse($data['amount']);
        if ($amount < 1) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Enter an amount greater than zero.'], 422);
            }

            return back()->withErrors(['amount' => 'Enter an amount greater than zero.'])->withInput();
        }

        DB::transaction(function () use ($request, $data, $amount, $ledger) {
            $from = Account::findOrFail($data['from_account_id']);
            $to = Account::findOrFail($data['to_account_id']);
            if ($from->balanceCents() < $amount) {
                abort(422, 'The source account does not have enough balance.');
            }
            $transfer = MoneyTransfer::create([
                'from_account_id' => $from->id,
                'to_account_id' => $to->id,
                'user_id' => $request->user()->id,
                'transferred_on' => $data['transferred_on'],
                'amount_cents' => $amount,
                'note' => $data['note'] ?? null,
            ]);
            $ledger->post($from, 'credit', $amount, 'transfer:'.$transfer->id.':out', 'Transfer out', $transfer, $transfer->transferred_on, $request->user());
            $ledger->post($to, 'debit', $amount, 'transfer:'.$transfer->id.':in', 'Transfer in', $transfer, $transfer->transferred_on, $request->user());
        });

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Money transferred successfully.']);
        }

        return back()->with('status', 'Money transferred.');
    }

    public function reverseTransfer(Request $request, MoneyTransfer $transfer, LedgerService $ledger)
    {
        $transfer->load(['fromAccount', 'toAccount']);
        if ($transfer->toAccount->balanceCents() < $transfer->amount_cents) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Destination account does not have enough balance to reverse this transfer.'], 422);
            }

            return back()->withErrors(['transfer' => 'Destination account does not have enough balance to reverse this transfer.']);
        }

        DB::transaction(function () use ($transfer, $request, $ledger) {
            $ledger->post($transfer->toAccount, 'credit', $transfer->amount_cents, 'transfer:'.$transfer->id.':reversal:out', 'Reversal of transfer #'.$transfer->id, $transfer, now()->toDateString(), $request->user());
            $ledger->post($transfer->fromAccount, 'debit', $transfer->amount_cents, 'transfer:'.$transfer->id.':reversal:in', 'Reversal of transfer #'.$transfer->id, $transfer, now()->toDateString(), $request->user());
            $transfer->delete();
        });

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Money transfer reversed and balances restored.']);
        }

        return back()->with('status', 'Money transfer reversed and balances restored.');
    }

    public function balance(Request $request)
    {
        $accounts = Account::get();
        $cash = $accounts->sum(fn ($account) => $account->balanceCents());
        $inventory = Product::get()->sum(fn ($product) => $product->stock_qty * $product->cost_cents);
        $purchaseDue = Purchase::where('status', 'received')->get()->sum(fn ($purchase) => $purchase->dueCents());
        $salesDue = Sale::where('status', 'completed')->get()->sum(fn ($sale) => $sale->dueCents());

        if ($request->expectsJson()) {
            return response()->json([
                'accounts' => $accounts->map(fn ($acc) => [
                    'id' => $acc->id,
                    'name' => $acc->name,
                    'type' => $acc->type,
                    'number' => $acc->number,
                    'balance_cents' => (int) $acc->balanceCents(),
                ]),
                'cash_cents' => (int) $cash,
                'inventory_cents' => (int) $inventory,
                'purchase_due_cents' => (int) $purchaseDue,
                'sales_due_cents' => (int) $salesDue,
                'total_assets_cents' => (int) ($cash + $inventory + $salesDue),
                'total_liabilities_cents' => (int) $purchaseDue,
                'net_equity_cents' => (int) ($cash + $inventory + $salesDue - $purchaseDue),
            ]);
        }

        return view('spa');
    }

    public function expenses(Request $request)
    {
        [$from, $to] = DateRange::fromRequest($request);
        $query = Expense::with(['category', 'account']);
        if ($request->filled('q')) {
            $term = $request->string('q');
            $query->where(function ($q) use ($term) {
                $q->where('note', 'like', "%{$term}%")
                    ->orWhereHas('category', fn ($cq) => $cq->where('name', 'like', "%{$term}%"));
            });
        }
        if ($request->filled('category_id')) {
            $query->where('expense_category_id', $request->integer('category_id'));
        }
        if ($request->filled('from') || $request->filled('to')) {
            $query->whereBetween('spent_on', [$from->toDateString(), $to->toDateString()]);
        }

        $expenses = $query->latest('spent_on')->paginate(15)->withQueryString();
        $categories = ExpenseCategory::orderBy('name')->get();
        $accounts = Account::orderBy('name')->get();

        if ($request->expectsJson()) {
            return response()->json([
                'expenses' => $expenses->getCollection()->map(fn ($exp) => [
                    'id' => $exp->id,
                    'category' => $exp->category?->name,
                    'category_id' => $exp->expense_category_id,
                    'account' => $exp->account?->name,
                    'account_id' => $exp->account_id,
                    'amount_cents' => (int) $exp->amount_cents,
                    'spent_on' => optional($exp->spent_on)->format('Y-m-d'),
                    'note' => $exp->note,
                    'attachment' => $exp->attachment,
                ]),
                'meta' => [
                    'current_page' => $expenses->currentPage(),
                    'last_page' => $expenses->lastPage(),
                    'total' => $expenses->total(),
                ],
                'categories' => $categories,
                'accounts' => $accounts->map(fn ($a) => ['id' => $a->id, 'name' => $a->name, 'balance_cents' => (int) $a->balanceCents()]),
                'total_amount_cents' => (int) $expenses->sum('amount_cents'),
            ]);
        }

        return view('spa');
    }

    public function storeExpense(Request $request, LedgerService $ledger)
    {
        $data = $request->validate([
            'expense_category_id' => ['required', 'integer'],
            'account_id' => ['nullable', 'integer'],
            'spent_on' => ['required', 'date'],
            'amount' => ['required'],
            'note' => ['nullable', 'string', 'max:1000'],
            'attachment' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ]);
        $amount = Money::parse($data['amount']);
        if ($amount < 1) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Enter an amount greater than zero.'], 422);
            }

            return back()->withErrors(['amount' => 'Enter an amount greater than zero.'])->withInput();
        }
        $account = Account::find($data['account_id'] ?? null) ?? $ledger->defaultAccount((int) $request->user()->store_id);
        $expense = Expense::create([
            'expense_category_id' => $data['expense_category_id'],
            'account_id' => $account->id,
            'user_id' => $request->user()->id,
            'spent_on' => $data['spent_on'],
            'amount_cents' => $amount,
            'note' => $data['note'] ?? null,
            'attachment' => $request->file('attachment')?->store('expenses', 'public'),
        ]);
        $ledger->post($account, 'credit', $amount, 'expense:'.$expense->id, 'Expense', $expense, $expense->spent_on, $request->user());

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Expense recorded successfully.', 'expense' => $expense]);
        }

        return back()->with('status', 'Expense recorded.');
    }

    public function destroyExpense(Request $request, Expense $expense, LedgerService $ledger)
    {
        DB::transaction(function () use ($expense, $request, $ledger) {
            $account = Account::find($expense->account_id) ?? $ledger->defaultAccount((int) $request->user()->store_id);
            $ledger->post($account, 'debit', $expense->amount_cents, 'expense:'.$expense->id.':reversal', 'Reversal of expense #'.$expense->id, $expense, now()->toDateString(), $request->user());
            if ($expense->attachment) {
                Storage::disk('public')->delete($expense->attachment);
            }
            $expense->delete();
        });

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Expense deleted and account balance restored.']);
        }

        return back()->with('status', 'Expense deleted and account balance restored.');
    }

    public function transactions(Request $request)
    {
        $query = AccountTransaction::with('account');

        if ($request->filled('q')) {
            $term = $request->string('q');
            $query->where(function ($q) use ($term) {
                $q->where('description', 'like', "%{$term}%")
                    ->orWhere('source_key', 'like', "%{$term}%")
                    ->orWhereHas('account', fn ($aq) => $aq->where('name', 'like', "%{$term}%")->orWhere('number', 'like', "%{$term}%"));
            });
        }

        if ($request->filled('account_id')) {
            $query->where('account_id', $request->integer('account_id'));
        }

        if ($request->filled('direction') && in_array($request->string('direction')->toString(), ['debit', 'credit'], true)) {
            $query->where('direction', $request->string('direction')->toString());
        }

        if ($request->filled('from')) {
            $query->whereDate('transacted_on', '>=', $request->string('from')->toString());
        }
        if ($request->filled('to')) {
            $query->whereDate('transacted_on', '<=', $request->string('to')->toString());
        }

        $totalDebit = (int) (clone $query)->where('direction', 'debit')->sum('amount_cents');
        $totalCredit = (int) (clone $query)->where('direction', 'credit')->sum('amount_cents');

        $transactions = $query->latest('transacted_on')->latest('id')->paginate(15)->withQueryString();
        $accounts = Account::orderBy('name')->get();

        if ($request->expectsJson()) {
            return response()->json([
                'transactions' => $transactions->getCollection()->map(fn ($txn) => [
                    'id' => $txn->id,
                    'account' => $txn->account?->name,
                    'account_id' => $txn->account_id,
                    'direction' => $txn->direction,
                    'amount_cents' => (int) $txn->amount_cents,
                    'transacted_on' => optional($txn->transacted_on)->format('Y-m-d'),
                    'description' => $txn->description,
                    'reference_type' => $txn->reference_type,
                    'reference_id' => $txn->reference_id,
                ]),
                'meta' => [
                    'current_page' => $transactions->currentPage(),
                    'last_page' => $transactions->lastPage(),
                    'total' => $transactions->total(),
                ],
                'accounts' => $accounts->map(fn ($a) => ['id' => $a->id, 'name' => $a->name]),
                'total_debit_cents' => (int) $totalDebit,
                'total_credit_cents' => (int) $totalCredit,
                'net_movement_cents' => (int) ($totalDebit - $totalCredit),
            ]);
        }

        if ($request->query('view') === 'blade') {
            return view('accounting.transactions', compact('transactions', 'accounts', 'totalDebit', 'totalCredit'));
        }

        return view('spa');
    }
}
