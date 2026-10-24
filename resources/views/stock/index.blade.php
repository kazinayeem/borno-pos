@extends('layouts.app')
@section('content')
<div class="page-title">
    <div>
        <div class="crumbs">{{ __('Inventory') }} › {{ __('Stock Count') }}</div>
        <h1>{{ __('Physical Stock Count & Reconciliation') }}</h1>
    </div>
</div>

@if(session('status'))
    <div class="card" style="background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;padding:12px 18px;border-radius:14px;margin-bottom:18px;display:flex;align-items:center;gap:10px">
        <span>✅</span>
        <span style="font-weight:700">{{ session('status') }}</span>
    </div>
@endif

<!-- Search & Filtering Toolbar -->
<div class="card" style="padding:16px 20px;border-radius:18px;margin-bottom:18px">
    <form method="get" action="{{ route('stock.index') }}" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">
        <div style="flex:1;min-width:240px;position:relative">
            <input
                type="text"
                name="q"
                value="{{ request('q') }}"
                placeholder="{{ __('Search product name, SKU, barcode, generic...') }}"
                style="width:100%;height:40px;padding:0 12px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--text);font-size:13px"
            >
        </div>

        <div>
            <select name="category_id" style="height:40px;padding:0 10px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--text);font-size:13px">
                <option value="">{{ __('All Categories') }}</option>
                @foreach($categories as $cat)
                    <option value="{{ $cat->id }}" @selected(request('category_id') == $cat->id)>
                        {{ $cat->name }}
                    </option>
                @endforeach
            </select>
        </div>

        <div>
            <select name="warehouse_id" style="height:40px;padding:0 10px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--text);font-size:13px">
                <option value="">{{ __('All Warehouses') }}</option>
                @foreach($warehouses as $wh)
                    <option value="{{ $wh->id }}" @selected(request('warehouse_id') == $wh->id)>
                        {{ $wh->name }}
                    </option>
                @endforeach
            </select>
        </div>

        <button class="btn primary" type="submit" style="height:40px;padding:0 16px;border-radius:10px;font-weight:700">
            🔍 {{ __('Filter Products') }}
        </button>

        @if(request()->hasAny(['q', 'category_id', 'warehouse_id']))
            <a class="btn" href="{{ route('stock.index') }}" style="height:40px;padding:0 14px;border-radius:10px;display:inline-flex;align-items:center;text-decoration:none">
                ✕ {{ __('Reset') }}
            </a>
        @endif
    </form>
</div>

<!-- Stock Count Form -->
<section class="card" style="border-radius:18px;overflow:hidden;padding:20px;margin-bottom:24px">
    <form method="post" action="{{ route('stock.store') }}" data-once>
        @csrf

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--line)">
            <h3 style="margin:0;font-size:16px;font-weight:800;display:flex;align-items:center;gap:8px">
                <span>📋</span> {{ __('Enter Physical Count') }}
            </h3>
            <span style="font-size:12px;color:var(--muted)">
                {{ __('Showing') }} {{ $products->count() }} {{ __('of') }} {{ $products->total() }} {{ __('products') }}
            </span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:14px;margin-bottom:18px">
            <div>
                <label style="display:block;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:4px">
                    {{ __('Audited Warehouse') }} <span style="color:#ef4444">*</span>
                </label>
                <select name="warehouse_id" required style="width:100%;height:40px;padding:0 10px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--text);font-size:13px">
                    @foreach($warehouses as $wh)
                        <option value="{{ $wh->id }}" @selected(request('warehouse_id') == $wh->id)>{{ $wh->name }}</option>
                    @endforeach
                </select>
            </div>

            <div>
                <label style="display:block;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:4px">
                    {{ __('Count Date') }} <span style="color:#ef4444">*</span>
                </label>
                <input
                    type="date"
                    name="counted_on"
                    value="{{ now()->toDateString() }}"
                    required
                    style="width:100%;height:40px;padding:0 10px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--text);font-size:13px"
                >
            </div>

            <div>
                <label style="display:block;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:4px">
                    {{ __('Audit Note / Remarks') }}
                </label>
                <input
                    type="text"
                    name="note"
                    placeholder="{{ __('e.g. Month-end physical verification') }}"
                    style="width:100%;height:40px;padding:0 10px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--text);font-size:13px"
                >
            </div>
        </div>

        <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:13px">
                <thead>
                    <tr style="background:var(--bg);border-bottom:1px solid var(--line)">
                        <th style="width:50px;padding:12px 10px;text-align:center;color:var(--muted);font-weight:600">SL</th>
                        <th style="padding:12px 10px;text-align:left;color:var(--muted);font-weight:600">{{ __('Product & Spec') }}</th>
                        <th style="width:140px;padding:12px 10px;text-align:left;color:var(--muted);font-weight:600">{{ __('Category') }}</th>
                        <th style="width:130px;padding:12px 10px;text-align:center;color:var(--muted);font-weight:600">{{ __('Expected System Stock') }}</th>
                        <th style="width:150px;padding:12px 10px;text-align:center;color:var(--muted);font-weight:600">{{ __('Physical Counted') }}</th>
                        <th style="width:130px;padding:12px 10px;text-align:center;color:var(--muted);font-weight:600">{{ __('Variance') }}</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($products as $product)
                        <tr style="border-bottom:1px solid var(--line)">
                            <td style="padding:12px 10px;text-align:center;color:var(--muted);font-weight:600">
                                {{ $loop->iteration + ($products->currentPage() - 1) * $products->perPage() }}
                            </td>
                            <td style="padding:12px 10px">
                                <div style="font-weight:700;color:var(--text)">{{ $product->name }}</div>
                                <div style="font-size:11px;color:var(--muted);display:flex;gap:6px;flex-wrap:wrap">
                                    @if($product->code) <span>SKU: {{ $product->code }}</span> @endif
                                    @if($product->barcode) <span>• Barcode: {{ $product->barcode }}</span> @endif
                                    @if($product->generic_name) <span style="color:#059669">• {{ $product->generic_name }}</span> @endif
                                    @if($product->strength) <span>• {{ $product->strength }}</span> @endif
                                </div>
                            </td>
                            <td style="padding:12px 10px;color:var(--muted)">
                                {{ $product->category?->name ?? '—' }}
                            </td>
                            <td style="padding:12px 10px;text-align:center">
                                <span class="badge" style="font-size:12px;padding:4px 10px;background:var(--bg);color:var(--text);font-weight:700">
                                    {{ $product->stock_qty }}
                                </span>
                            </td>
                            <td style="padding:12px 10px;text-align:center">
                                <input
                                    type="number"
                                    min="0"
                                    id="count-input-{{ $product->id }}"
                                    name="counted[{{ $product->id }}]"
                                    value="{{ $product->stock_qty }}"
                                    data-expected="{{ $product->stock_qty }}"
                                    oninput="updateVariance(this, '{{ $product->id }}')"
                                    style="width:90px;height:36px;text-align:center;padding:0 8px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--text);font-weight:800;font-size:13px"
                                >
                            </td>
                            <td style="padding:12px 10px;text-align:center">
                                <span
                                    id="variance-badge-{{ $product->id }}"
                                    class="badge"
                                    style="font-size:11px;padding:3px 8px;background:#f1f5f9;color:#64748b;font-weight:700"
                                >
                                    0 (Match)
                                </span>
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="6" class="empty" style="padding:36px;text-align:center;color:var(--muted)">
                                <div style="font-size:32px;margin-bottom:8px">📦</div>
                                <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px">{{ __('No products found') }}</div>
                                <div style="font-size:12px">{{ __('Try searching with another keyword or resetting filters.') }}</div>
                            </td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        <!-- Pager for Products -->
        <div class="pager" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-top:16px;padding-top:12px;border-top:1px solid var(--line)">
            <span style="font-size:13px;color:var(--muted)">
                {{ __('Showing') }} {{ $products->firstItem() ?? 0 }} {{ __('to') }} {{ $products->lastItem() ?? 0 }} {{ __('of') }} {{ $products->total() }} {{ __('products') }}
            </span>
            <div>
                {{ $products->links() }}
            </div>
        </div>

        <div style="margin-top:18px;display:flex;justify-content:flex-end">
            <button class="btn primary" type="submit" style="height:44px;padding:0 24px;border-radius:12px;font-size:14px;font-weight:800">
                ⚡ {{ __('Apply Count & Reconcile Inventory') }}
            </button>
        </div>
    </form>
</section>

<!-- Past Stock Count Audits History -->
<section class="card" style="border-radius:18px;overflow:hidden;padding:20px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <h3 style="margin:0;font-size:15px;font-weight:800">
            📜 {{ __('Recent Stock Count History & Audits') }}
        </h3>
        <span style="font-size:12px;color:var(--muted)">
            {{ $counts->total() }} {{ __('audits recorded') }}
        </span>
    </div>

    <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
                <tr style="background:var(--bg);border-bottom:1px solid var(--line)">
                    <th style="width:130px;padding:10px;text-align:left;color:var(--muted);font-weight:600">{{ __('Audited On') }}</th>
                    <th style="width:180px;padding:10px;text-align:left;color:var(--muted);font-weight:600">{{ __('Warehouse') }}</th>
                    <th style="width:150px;padding:10px;text-align:left;color:var(--muted);font-weight:600">{{ __('Audited By') }}</th>
                    <th style="padding:10px;text-align:left;color:var(--muted);font-weight:600">{{ __('Remarks') }}</th>
                    <th style="width:110px;padding:10px;text-align:center;color:var(--muted);font-weight:600">{{ __('Status') }}</th>
                </tr>
            </thead>
            <tbody>
                @forelse($counts as $count)
                    <tr style="border-bottom:1px solid var(--line)">
                        <td style="padding:10px;font-weight:600;color:var(--text)">
                            {{ optional($count->counted_on)->format('d M Y') }}
                        </td>
                        <td style="padding:10px;color:var(--text)">
                            {{ $count->warehouse?->name ?? '—' }}
                        </td>
                        <td style="padding:10px;color:var(--muted)">
                            {{ $count->user?->name ?? 'System' }}
                        </td>
                        <td style="padding:10px;color:var(--muted)">
                            {{ $count->note ?: 'Physical count reconciliation' }}
                        </td>
                        <td style="padding:10px;text-align:center">
                            <span class="badge ok" style="font-size:11px;padding:3px 8px;border-radius:999px">
                                {{ ucfirst($count->status) }}
                            </span>
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="5" class="empty" style="padding:24px;text-align:center;color:var(--muted)">
                            {{ __('No previous stock count audits found.') }}
                        </td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    @if($counts->hasPages())
        <div class="pager" style="margin-top:14px">
            {{ $counts->links() }}
        </div>
    @endif
</section>

<script>
function updateVariance(input, id) {
    const expected = parseInt(input.dataset.expected, 10) || 0;
    const counted = parseInt(input.value, 10);
    const badge = document.getElementById('variance-badge-' + id);
    if (!badge) return;

    if (isNaN(counted)) {
        badge.textContent = 'Skip';
        badge.style.background = '#f1f5f9';
        badge.style.color = '#94a3b8';
        return;
    }

    const delta = counted - expected;
    if (delta === 0) {
        badge.textContent = '0 (Match)';
        badge.style.background = '#f1f5f9';
        badge.style.color = '#64748b';
    } else if (delta > 0) {
        badge.textContent = '+' + delta + ' (Surplus)';
        badge.style.background = '#dbeafe';
        badge.style.color = '#1d4ed8';
    } else {
        badge.textContent = delta + ' (Shortage)';
        badge.style.background = '#ffe4e6';
        badge.style.color = '#e11d48';
    }
}
</script>
@endsection
