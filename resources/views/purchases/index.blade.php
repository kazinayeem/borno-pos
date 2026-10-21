@extends('layouts.app')
@section('content')
<div class="page-title"><div><div class="crumbs">Purchase › Purchases</div><h1>Purchases</h1></div><a class="btn primary" href="{{ route('purchases.create') }}">+ Add Purchase</a></div>
<section class="card">
    <form method="get"><input name="q" value="{{ request('q') }}" placeholder="Search reference or supplier"></form>
    <table>
        <thead><tr><th>SL</th><th>Date</th><th>Reference</th><th>Supplier</th><th>Total</th><th>Paid</th><th>Due</th><th></th></tr></thead>
        <tbody>
        @forelse($purchases as $purchase)
            <tr>
                <td>{{ $loop->iteration }}</td>
                <td>{{ $purchase->purchased_on->format('d-m-Y') }}</td>
                <td><a href="{{ route('purchases.show', $purchase) }}">{{ $purchase->reference }}</a></td>
                <td>{{ $purchase->supplier->name ?? '—' }}</td>
                <td>@money($purchase->grand_cents)</td>
                <td>@money($purchase->paid_cents)</td>
                <td>@money($purchase->dueCents())</td>
                <td><a href="{{ route('purchases.show', $purchase) }}">View</a></td>
            </tr>
        @empty
            <tr><td colspan="8" class="empty">No purchases yet.</td></tr>
        @endforelse
        </tbody>
    </table>
    <div class="pager">{{ $purchases->links() }}</div>
</section>
@endsection
