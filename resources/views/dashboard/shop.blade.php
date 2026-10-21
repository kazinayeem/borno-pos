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
        ['Total Sales', $data['total_sales'], '#e8f1ff', '#2f80ed', '🛒'],
        ['Net Profit', $data['net_profit'], '#e7f8ee', '#16a34a', '$'],
        ['Gross Profit', $data['gross_profit'], '#fff6e5', '#d97706', '📊'],
        ['Sales Return', $data['sales_return'], '#ffecec', '#ef4444', '↩'],
        ['Purchase', $data['purchase'], '#f3e8ff', '#7c3aed', '🛍'],
        ['Purchase Due', $data['purchase_due'], '#e8f4ff', '#0284c7', '📄'],
        ['Expense', $data['expense'], '#f4e9ff', '#9333ea', '💳'],
        ['Salary Cost', $data['salary'], '#e8f8ef', '#059669', '💵'],
    ] as [$kpi, $value, $bg, $color, $icon])
        <article class="kpi">
            <div class="label"><span class="mark" style="background:{{ $bg }};color:{{ $color }}">{{ $icon }}</span> {{ $kpi }}</div>
            <strong>@money($value)</strong>
            <em>{{ $label }}</em>
            <svg class="wave" viewBox="0 0 300 40" preserveAspectRatio="none"><path d="M0 28 C 50 8, 90 36, 140 22 S 230 6, 300 24 V40 H0Z" fill="{{ $bg }}"/></svg>
        </article>
    @endforeach
</div>
<div class="grid-2">
    <section class="card">
        <div class="card-head"><h2>Purchase and Sale Flow</h2><span class="muted">{{ $label }}</span></div>
        <canvas id="flow" height="120"></canvas>
    </section>
    <section class="card">
        <div class="card-head"><h2>Sales in {{ $from->format('F') }}</h2><a href="{{ route('sales.index', request()->query()) }}">View all →</a></div>
        <table>
            <thead><tr><th>#</th><th>Product details</th><th>QTY</th><th>Total</th></tr></thead>
            <tbody>
            @forelse($data['sales']->take(8) as $sale)
                <tr>
                    <td>{{ $loop->iteration }}</td>
                    <td><a href="{{ route('sales.show', $sale) }}">{{ $sale->invoice_no }}</a><div class="muted">{{ $sale->sold_at->format('d M Y H:i') }}</div></td>
                    <td>{{ $sale->items()->count() }}</td>
                    <td>@money($sale->grand_cents)</td>
                </tr>
            @empty
                <tr><td colspan="4" class="empty">No data found</td></tr>
            @endforelse
            </tbody>
        </table>
    </section>
</div>
<div class="grid-3">
    <section class="card">
        <div class="card-head"><h2>Top Selling Products</h2><a href="{{ route('products.index') }}">View all</a></div>
        <table>
            <thead><tr><th>#</th><th>Product</th><th>QTY</th><th>Total</th></tr></thead>
            <tbody>
            @forelse($data['top_products'] as $row)
                <tr>
                    <td>{{ $loop->iteration }}</td>
                    <td>{{ $row['product']->name }}</td>
                    <td>{{ $row['qty'] }}</td>
                    <td>@money($row['total'])</td>
                </tr>
            @empty
                <tr><td colspan="4" class="empty">No data found</td></tr>
            @endforelse
            </tbody>
        </table>
    </section>
    <section class="card">
        <div class="card-head"><h2>Sales by Category</h2><span class="muted">{{ $label }}</span></div>
        <div class="donut-wrap">
            <canvas id="donut" height="180"></canvas>
            <div class="donut-center">@money($data['total_sales'])<small>Total Sales</small></div>
        </div>
    </section>
    <section class="card">
        <div class="card-head"><h2>Purchase in {{ $from->format('F') }}</h2><a href="{{ route('purchases.index') }}">View all →</a></div>
        <table>
            <thead><tr><th>#</th><th>Reference</th><th>Total</th></tr></thead>
            <tbody>
            @forelse($data['purchases']->take(8) as $purchase)
                <tr><td>{{ $loop->iteration }}</td><td><a href="{{ route('purchases.show', $purchase) }}">{{ $purchase->reference }}</a></td><td>@money($purchase->grand_cents)</td></tr>
            @empty
                <tr><td colspan="3" class="empty">No data found</td></tr>
            @endforelse
            </tbody>
        </table>
    </section>
</div>
<section class="card" style="margin-top:14px">
    <div class="card-head"><h2>Cash Flow</h2></div>
    <canvas id="cash" height="90"></canvas>
</section>
<section class="card" style="margin-top:14px">
    <div class="card-head"><h2>Recent Transaction</h2></div>
    <table>
        <thead><tr><th>#</th><th>Date</th><th>Description</th><th>Status</th><th>Amount</th></tr></thead>
        <tbody>
        @forelse($transactions as $row)
            <tr>
                <td>{{ $loop->iteration }}</td>
                <td>{{ $row->transacted_on->format('d-m-Y') }}</td>
                <td>{{ $row->description }}</td>
                <td><span class="badge {{ $row->direction === 'debit' ? 'bad' : 'ok' }}">{{ ucfirst($row->direction) }}</span></td>
                <td>@money($row->amount_cents)</td>
            </tr>
        @empty
            <tr><td colspan="5" class="empty">No data found</td></tr>
        @endforelse
        </tbody>
    </table>
</section>
@endsection
@push('scripts')
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<script>
const flow = @json($data['chart']);
const cash = @json($data['cashflow']);
const cats = @json($data['categories']);
const axis = { plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, grid: { color: '#eef2f7' } }, x: { grid: { display: false } } } };
new Chart(document.getElementById('flow'), { type: 'line', data: { labels: flow.labels, datasets: [
  { label: 'Sales', data: flow.sales, borderColor: '#22c55e', backgroundColor: 'transparent', tension: .35, pointRadius: 0 },
  { label: 'Purchase', data: flow.purchases, borderColor: '#3b82f6', backgroundColor: 'transparent', tension: .35, pointRadius: 0 }
]}, options: axis });
new Chart(document.getElementById('cash'), { type: 'line', data: { labels: cash.labels, datasets: [
  { label: 'Debit', data: cash.debits, borderColor: '#ef4444', tension: .35, pointRadius: 0 },
  { label: 'Credit', data: cash.credits, borderColor: '#6366f1', tension: .35, pointRadius: 0 }
]}, options: axis });
if (document.getElementById('donut')) {
  new Chart(document.getElementById('donut'), { type: 'doughnut', data: {
    labels: cats.map(c => c.name),
    datasets: [{ data: cats.map(c => c.percent), backgroundColor: ['#3b82f6','#22c55e','#f59e0b','#a855f7','#ef4444','#06b6d4'], borderWidth: 0 }]
  }, options: { cutout: '72%', plugins: { legend: { position: 'right' } } } });
}
</script>
@endpush
