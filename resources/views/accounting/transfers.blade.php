@extends('layouts.app')
@section('content')
<div class="page-title">
    <div>
        <h1>Money Transfer</h1>
        <p class="muted">Transfer funds between cash drawers, bank accounts, and mobile wallets</p>
    </div>
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
    <h2 style="margin-top: 0;">New Fund Transfer</h2>
    <form method="post" action="{{ route('transfers.store') }}" data-once>@csrf
        <div class="field">
            <label>Source Account (From)</label>
            <select name="from_account_id" required>
                @foreach($accounts as $account)
                    <option value="{{ $account->id }}">{{ $account->name }} (Balance: @money($account->balanceCents()))</option>
                @endforeach
            </select>
        </div>
        <div class="field">
            <label>Destination Account (To)</label>
            <select name="to_account_id" required>
                @foreach($accounts as $account)
                    <option value="{{ $account->id }}">{{ $account->name }}</option>
                @endforeach
            </select>
        </div>
        <div class="field">
            <label>Transfer Amount</label>
            <input name="amount" placeholder="0.00" required>
        </div>
        <div class="field">
            <label>Transfer Date</label>
            <input type="date" name="transferred_on" value="{{ now()->toDateString() }}" required>
        </div>
        <div class="field">
            <label>Reference / Note</label>
            <input name="note" placeholder="Reason or bank reference">
        </div>
        <button class="btn primary">Execute Transfer</button>
    </form>
</section>

<section class="card table-card">
    <h2 style="margin-top: 0; padding: 16px 16px 0;">Transfer Log</h2>
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>From</th>
                <th>To</th>
                <th>Amount</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody>
            @forelse($transfers as $transfer)
                <tr>
                    <td>{{ $transfer->transferred_on->format('d M Y') }}</td>
                    <td><strong>{{ $transfer->fromAccount->name ?? '—' }}</strong></td>
                    <td><strong>{{ $transfer->toAccount->name ?? '—' }}</strong></td>
                    <td style="font-weight: 600;">@money($transfer->amount_cents)</td>
                    <td>
                        <form method="post" action="{{ route('transfers.reverse', $transfer) }}" onsubmit="return confirm('Reverse this transfer? Funds will be refunded back to source account.');" style="display: inline;">
                            @csrf
                            <button type="submit" class="btn" style="color: #ef4444; padding: 2px 8px; font-size: 0.8rem;">Reverse</button>
                        </form>
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="5" class="empty">No transfers recorded yet.</td>
                </tr>
            @endforelse
        </tbody>
    </table>
    <div style="padding: 12px 16px;">
        {{ $transfers->links() }}
    </div>
</section>
</div>
@endsection

