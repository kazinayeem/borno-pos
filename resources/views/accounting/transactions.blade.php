@extends('layouts.app')
@section('content')
<div class="page-title">
    <div>
        <div class="crumbs">{{ __('Accounting') }} › {{ __('Transactions') }}</div>
        <h1>{{ __('Account Transactions & Ledger') }}</h1>
    </div>
</div>

<!-- Financial Summary KPIs -->
<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:14px;margin-bottom:18px">
    <div class="card" style="padding:16px 20px;border-radius:16px;position:relative;overflow:hidden">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em">{{ __('Total Inflow (Debit)') }}</span>
            <span style="font-size:18px">📥</span>
        </div>
        <div style="font-size:24px;font-weight:800;color:#15803d">
            + @money($totalDebit)
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px">{{ __('Cash, deposits & customer collections') }}</div>
    </div>

    <div class="card" style="padding:16px 20px;border-radius:16px;position:relative;overflow:hidden">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em">{{ __('Total Outflow (Credit)') }}</span>
            <span style="font-size:18px">📤</span>
        </div>
        <div style="font-size:24px;font-weight:800;color:#be123c">
            - @money($totalCredit)
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px">{{ __('Expenses, payments & supplier payouts') }}</div>
    </div>

    <div class="card" style="padding:16px 20px;border-radius:16px;position:relative;overflow:hidden">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em">{{ __('Net Movement') }}</span>
            <span style="font-size:18px">⚖️</span>
        </div>
        <div style="font-size:24px;font-weight:800;color:{{ ($totalDebit - $totalCredit) >= 0 ? 'var(--blue)' : '#be123c' }}">
            {{ ($totalDebit - $totalCredit) >= 0 ? '+' : '-' }} @money(abs($totalDebit - $totalCredit))
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px">{{ __('Filtered ledger net delta') }}</div>
    </div>

    <div class="card" style="padding:16px 20px;border-radius:16px;position:relative;overflow:hidden">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em">{{ __('Records Found') }}</span>
            <span style="font-size:18px">📑</span>
        </div>
        <div style="font-size:24px;font-weight:800;color:var(--text)">
            {{ number_format($transactions->total()) }}
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px">{{ __('Matching active search filters') }}</div>
    </div>
</div>

<!-- Transactions Table with Filter Toolbar -->
<section class="card" style="border-radius:18px;overflow:hidden;padding:20px">
    <form method="get" action="{{ route('transactions') }}" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:16px">
        <div style="flex:1;min-width:220px;position:relative">
            <input
                type="text"
                name="q"
                value="{{ request('q') }}"
                placeholder="{{ __('Search description, reference, account...') }}"
                style="width:100%;height:40px;padding:0 12px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--text);font-size:13px"
            >
        </div>

        <div>
            <select name="account_id" style="height:40px;padding:0 10px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--text);font-size:13px">
                <option value="">{{ __('All Accounts') }}</option>
                @foreach($accounts as $acc)
                    <option value="{{ $acc->id }}" @selected(request('account_id') == $acc->id)>
                        {{ $acc->name }} ({{ ucfirst($acc->type) }})
                    </option>
                @endforeach
            </select>
        </div>

        <div>
            <select name="direction" style="height:40px;padding:0 10px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--text);font-size:13px">
                <option value="">{{ __('All Directions') }}</option>
                <option value="debit" @selected(request('direction') === 'debit')>{{ __('Inflow (Debit)') }}</option>
                <option value="credit" @selected(request('direction') === 'credit')>{{ __('Outflow (Credit)') }}</option>
            </select>
        </div>

        <div style="display:flex;align-items:center;gap:6px">
            <input
                type="date"
                name="from"
                value="{{ request('from') }}"
                title="{{ __('From date') }}"
                style="height:40px;padding:0 10px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--text);font-size:13px"
            >
            <span style="color:var(--muted)">–</span>
            <input
                type="date"
                name="to"
                value="{{ request('to') }}"
                title="{{ __('To date') }}"
                style="height:40px;padding:0 10px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--text);font-size:13px"
            >
        </div>

        <button class="btn primary" type="submit" style="height:40px;padding:0 16px;border-radius:10px;font-weight:700">
            🔍 {{ __('Filter') }}
        </button>

        @if(request()->hasAny(['q', 'account_id', 'direction', 'from', 'to']))
            <a class="btn" href="{{ route('transactions') }}" style="height:40px;padding:0 14px;border-radius:10px;display:inline-flex;align-items:center;text-decoration:none">
                ✕ {{ __('Reset') }}
            </a>
        @endif
    </form>

    <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
                <tr style="background:var(--bg);border-bottom:1px solid var(--line)">
                    <th style="width:50px;padding:12px 10px;text-align:center;color:var(--muted);font-weight:600">SL</th>
                    <th style="width:120px;padding:12px 10px;text-align:left;color:var(--muted);font-weight:600">{{ __('Date') }}</th>
                    <th style="width:180px;padding:12px 10px;text-align:left;color:var(--muted);font-weight:600">{{ __('Account') }}</th>
                    <th style="padding:12px 10px;text-align:left;color:var(--muted);font-weight:600">{{ __('Description / Reference') }}</th>
                    <th style="width:140px;padding:12px 10px;text-align:center;color:var(--muted);font-weight:600">{{ __('Direction') }}</th>
                    <th style="width:130px;padding:12px 10px;text-align:right;color:var(--muted);font-weight:600">{{ __('Amount') }}</th>
                </tr>
            </thead>
            <tbody>
                @forelse($transactions as $row)
                    <tr style="border-bottom:1px solid var(--line)">
                        <td style="padding:12px 10px;text-align:center;color:var(--muted);font-weight:600">
                            {{ $loop->iteration + ($transactions->currentPage() - 1) * $transactions->perPage() }}
                        </td>
                        <td style="padding:12px 10px;color:var(--text);white-space:nowrap">
                            <div style="font-weight:600">{{ optional($row->transacted_on)->format('d M Y') }}</div>
                            <div style="font-size:11px;color:var(--muted)">{{ optional($row->created_at)->format('h:i A') }}</div>
                        </td>
                        <td style="padding:12px 10px">
                            @if($row->account)
                                <div style="font-weight:700;color:var(--text);display:flex;align-items:center;gap:6px">
                                    <span>
                                        @if($row->account->type === 'bank') 🏦
                                        @elseif($row->account->type === 'mobile') 📱
                                        @else 💵
                                        @endif
                                    </span>
                                    <span>{{ $row->account->name }}</span>
                                </div>
                                @if($row->account->number)
                                    <div style="font-size:11px;color:var(--muted)">No: {{ $row->account->number }}</div>
                                @endif
                            @else
                                <span style="color:var(--muted)">—</span>
                            @endif
                        </td>
                        <td style="padding:12px 10px">
                            <div style="font-weight:600;color:var(--text)">{{ $row->description }}</div>
                            @if($row->reference)
                                <div style="font-size:11px;color:var(--muted)">Ref: {{ $row->reference }}</div>
                            @endif
                        </td>
                        <td style="padding:12px 10px;text-align:center">
                            @if($row->direction === 'debit')
                                <span class="badge ok" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 10px">
                                    <span>↓</span> {{ __('Inflow (Debit)') }}
                                </span>
                            @else
                                <span class="badge bad" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 10px">
                                    <span>↑</span> {{ __('Outflow (Credit)') }}
                                </span>
                            @endif
                        </td>
                        <td style="padding:12px 10px;text-align:right">
                            @if($row->direction === 'debit')
                                <span style="color:#15803d;font-weight:800;font-size:14px">
                                    + @money($row->amount_cents)
                                </span>
                            @else
                                <span style="color:#be123c;font-weight:800;font-size:14px">
                                    - @money($row->amount_cents)
                                </span>
                            @endif
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="6" class="empty" style="padding:36px;text-align:center;color:var(--muted)">
                            <div style="font-size:32px;margin-bottom:8px">💳</div>
                            <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px">{{ __('No transactions found') }}</div>
                            <div style="font-size:12px">{{ __('Try clearing filters or adjusting your date range.') }}</div>
                        </td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    <!-- Pager Navigation -->
    <div class="pager" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-top:16px;padding-top:12px;border-top:1px solid var(--line)">
        <span style="font-size:13px;color:var(--muted)">
            {{ __('Showing') }} {{ $transactions->firstItem() ?? 0 }} {{ __('to') }} {{ $transactions->lastItem() ?? 0 }} {{ __('of') }} {{ $transactions->total() }} {{ __('entries') }}
        </span>
        <div>
            {{ $transactions->links() }}
        </div>
    </div>
</section>
@endsection
