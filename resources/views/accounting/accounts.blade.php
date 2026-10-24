@extends('layouts.app')
@section('content')
<div class="page-title">
    <div>
        <h1>Financial Accounts</h1>
        <p class="muted">Manage cash drawers, bank accounts, and mobile banking payment endpoints</p>
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
<section class="card table-card">
    <h2 style="margin-top: 0; padding: 16px 16px 0;">Existing Accounts</h2>
    <table>
        <thead>
            <tr>
                <th>Name</th>
                <th>Number</th>
                <th>Type</th>
                <th>Balance</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody>
            @forelse($accounts as $account)
                <tr>
                    <td><strong>{{ $account->name }}</strong></td>
                    <td>{{ $account->number ?: '—' }}</td>
                    <td><span class="cap" style="padding: 2px 8px; border-radius: 4px; background: #f1f5f9; font-size: 0.8rem;">{{ $account->type }}</span></td>
                    <td style="font-weight: 600; color: #047857;">@money($account->balance)</td>
                    <td>
                        <form method="post" action="{{ route('accounts.destroy', $account) }}" onsubmit="return confirm('Delete this account? Only accounts without transactions can be removed.');" style="display: inline;">
                            @csrf
                            @method('DELETE')
                            <button type="submit" class="btn" style="color: #ef4444; padding: 2px 8px; font-size: 0.8rem;">Delete</button>
                        </form>
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="5" class="empty">No accounts found.</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</section>

<section class="card">
    <h2 style="margin-top: 0;">Create Account</h2>
    <form method="post" action="{{ route('accounts.store') }}" data-once>@csrf
        <div class="field">
            <label>Account Name</label>
            <input name="name" placeholder="e.g. Main Cash Drawer, City Bank, bKash Merchant" required>
        </div>
        <div class="field">
            <label>Account / Wallet Number</label>
            <input name="number" placeholder="Optional account/phone number">
        </div>
        <div class="field">
            <label>Type</label>
            <select name="type">
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="mobile">Mobile Money (bKash/Nagad)</option>
            </select>
        </div>
        <div class="field">
            <label>Opening Balance</label>
            <input name="opening" value="0.00">
        </div>
        <button class="btn primary">Save Account</button>
    </form>
</section>
</div>
@endsection

