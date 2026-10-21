@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>Subscription Purchase</h1></div></div>
<div class="cards-3">
@foreach($plans as $plan)
    <section class="card">
        <h2>{{ $plan->name }}</h2>
        <strong>@money($plan->price_cents)</strong>
        <p>{{ $plan->features }}</p>
        <form method="post" action="{{ route('subscriptions.buy') }}">@csrf
            <input type="hidden" name="plan_id" value="{{ $plan->id }}">
            <button class="btn primary">Request plan</button>
        </form>
    </section>
@endforeach
</div>
<section class="card" style="margin-top:14px"><h2>Recent requests</h2>
<table><thead><tr><th>Plan</th><th>Status</th><th>Payment</th></tr></thead>
<tbody>@forelse($current as $row)<tr><td>{{ $row->plan->name }}</td><td>{{ $row->status }}</td><td>{{ $row->payment_status }}</td></tr>@empty<tr><td colspan="3" class="empty">No subscription requests.</td></tr>@endforelse</tbody></table>
</section>
@endsection
