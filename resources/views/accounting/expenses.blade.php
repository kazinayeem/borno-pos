@extends('layouts.app')
@section('content')
<div class="page-title">
    <div>
        <h1>Expense Management</h1>
        <p class="muted">Track operational costs, categorize store expenses, and record payment methods</p>
    </div>
    @include('partials.range')
</div>

@if(session('status'))
    <div class="card" style="margin-bottom: 16px; background: #ecfdf5; color: #065f46; border-left: 4px solid #10b981; padding: 12px 16px;">
        {{ session('status') }}
    </div>
@endif

@if($errors->any())
    <div class="card" style="margin-bottom: 16px; background: #fef2f2; color: #991b1b; border-left: 4px solid #ef4444; padding: 12px 16px;">
        <ul style="margin: 0; padding-left: 20px;">
            @foreach($errors->all() as $err)
                <li>{{ $err }}</li>
            @endforeach
        </ul>
    </div>
@endif

<div class="grid-2">
<section class="card">
    <h2 style="margin-top: 0;">Record Store Expense</h2>
    <form method="post" action="{{ route('expenses.store') }}" enctype="multipart/form-data" data-once>@csrf
        <div class="field">
            <label>Category</label>
            <select name="expense_category_id" required>
                @foreach($categories as $category)
                    <option value="{{ $category->id }}">{{ $category->name }}</option>
                @endforeach
            </select>
        </div>
        <div class="field">
            <label>Payment Account</label>
            <select name="account_id">
                <option value="">Default Store Cash Drawer</option>
                @foreach($accounts as $account)
                    <option value="{{ $account->id }}">{{ $account->name }} (Balance: @money($account->balanceCents()))</option>
                @endforeach
            </select>
        </div>
        <div class="field">
            <label>Expense Date</label>
            <input type="date" name="spent_on" value="{{ now()->toDateString() }}" required>
        </div>
        <div class="field">
            <label>Amount</label>
            <input name="amount" placeholder="0.00" required>
        </div>
        <div class="field">
            <label>Purpose / Note</label>
            <input name="note" placeholder="Rent, utility, packaging, etc.">
        </div>
        <div class="field">
            <label>Receipt Attachment (optional)</label>
            <input type="file" name="attachment" accept=".jpg,.jpeg,.png,.pdf">
        </div>
        <button class="btn primary">Save Expense</button>
    </form>
</section>

<section class="card table-card">
    <h2 style="margin-top: 0; padding: 16px 16px 0;">Expense Records</h2>
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Note</th>
                <th>Amount</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody>
            @forelse($expenses as $expense)
                <tr>
                    <td>{{ $expense->spent_on->format('d M Y') }}</td>
                    <td><strong>{{ $expense->category->name ?? '—' }}</strong></td>
                    <td>
                        {{ $expense->note ?: '—' }}
                        @if($expense->attachment)
                            <div>
                                <a href="{{ asset('storage/' . $expense->attachment) }}" target="_blank" style="font-size: 0.8rem; color: #3b82f6;">View Receipt</a>
                            </div>
                        @endif
                    </td>
                    <td style="font-weight: 600; color: #b91c1c;">@money($expense->amount_cents)</td>
                    <td>
                        <form method="post" action="{{ route('expenses.destroy', $expense) }}" onsubmit="return confirm('Delete this expense? The associated account debit will be reversed.');" style="display: inline;">
                            @csrf
                            @method('DELETE')
                            <button type="submit" class="btn" style="color: #ef4444; padding: 2px 8px; font-size: 0.8rem;">Delete</button>
                        </form>
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="5" class="empty">No expenses recorded in this period.</td>
                </tr>
            @endforelse
        </tbody>
    </table>
    <div style="padding: 12px 16px;">
        {{ $expenses->links() }}
    </div>
</section>
</div>
@endsection

