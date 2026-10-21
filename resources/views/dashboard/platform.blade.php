@extends('layouts.app')
@section('content')
<div class="page-title">
    <div>
        <h1>Welcome back, {{ auth()->user()->name }} 👋</h1>
        <div class="muted">Here's what's happening with your business today.</div>
    </div>
    @include('partials.range')
</div>
<div class="kpis">
    @foreach ([
        ['Total Subscription Sale', $data['subscription_sale'], true],
        ['Total Subscriber', $data['subscribers'], false],
        ['Total Main Shop', $data['shops'], false],
        ['Total Store', $data['stores'], false],
    ] as [$labelText, $value, $isMoney])
        <article class="kpi">
            <div class="label">{{ $labelText }}</div>
            <strong>{{ $isMoney ? '' : '' }}@if($isMoney) @money($value) @else {{ $value }} @endif</strong>
            <em>{{ $label }}</em>
        </article>
    @endforeach
</div>
<section class="card" style="margin-top:14px">
    <div class="card-head"><h2>Recent Shop</h2><a href="{{ route('shops.index') }}">View all</a></div>
    <table>
        <thead><tr><th>#</th><th>Shop</th><th>Type</th><th>Status</th></tr></thead>
        <tbody>
        @forelse($data['recent_shops'] as $shop)
            <tr><td>{{ $loop->iteration }}</td><td>{{ $shop->name }}</td><td>{{ str_replace('_',' ', $shop->business_type) }}</td><td><span class="badge {{ $shop->is_active ? 'ok' : 'bad' }}">{{ $shop->is_active ? 'Active' : 'Inactive' }}</span></td></tr>
        @empty
            <tr><td colspan="4" class="empty">No data found</td></tr>
        @endforelse
        </tbody>
    </table>
</section>
<section class="card" style="margin-top:14px">
    <div class="card-head"><h2>Recent Transaction</h2></div>
    <table>
        <thead><tr><th>Shop</th><th>Plan</th><th>Status</th><th>Payment</th><th>Ends</th></tr></thead>
        <tbody>
        @forelse($data['recent_subscriptions'] as $row)
            <tr>
                <td>{{ $row->store->name ?? '—' }}</td>
                <td>{{ $row->plan->name ?? '—' }}</td>
                <td>{{ $row->status }}</td>
                <td>{{ $row->payment_status }}</td>
                <td>{{ optional($row->ends_on)->format('d M Y') ?: '—' }}</td>
            </tr>
        @empty
            <tr><td colspan="5" class="empty">No data found</td></tr>
        @endforelse
        </tbody>
    </table>
</section>
@endsection
