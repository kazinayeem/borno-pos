@extends('layouts.app')
@section('content')
<div class="page-title no-print">
    <div>
        <h1>Balance Sheet</h1>
        <p class="muted">Financial position snapshot as of {{ now()->format('F d, Y') }}</p>
    </div>
    <div style="display: flex; gap: 8px;">
        <button type="button" class="btn primary" onclick="window.print()">Print Statement</button>
    </div>
</div>

<div class="kpi-grid no-print" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
    <div class="card" style="border-left: 4px solid #10b981; padding: 16px;">
        <span class="muted" style="font-size: 0.85rem; text-transform: uppercase;">Total Assets</span>
        <h2 style="margin: 6px 0 0; color: #047857;">@money($cash + $inventory + $salesDue)</h2>
    </div>
    <div class="card" style="border-left: 4px solid #ef4444; padding: 16px;">
        <span class="muted" style="font-size: 0.85rem; text-transform: uppercase;">Total Liabilities</span>
        <h2 style="margin: 6px 0 0; color: #b91c1c;">@money($purchaseDue)</h2>
    </div>
    <div class="card" style="border-left: 4px solid #3b82f6; padding: 16px;">
        <span class="muted" style="font-size: 0.85rem; text-transform: uppercase;">Net Equity</span>
        <h2 style="margin: 6px 0 0; color: #1d4ed8;">@money($cash + $inventory + $salesDue - $purchaseDue)</h2>
    </div>
    <div class="card" style="border-left: 4px solid #8b5cf6; padding: 16px;">
        <span class="muted" style="font-size: 0.85rem; text-transform: uppercase;">Cash & Bank</span>
        <h2 style="margin: 6px 0 0; color: #6d28d9;">@money($cash)</h2>
    </div>
</div>

<section class="card" style="max-width: 900px; margin: 0 auto; padding: 32px;">
    <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px;">
        <h2 style="margin: 0; font-size: 1.5rem;">Statement of Financial Position (Balance Sheet)</h2>
        <p class="muted" style="margin: 4px 0 0;">As of {{ now()->format('F d, Y - h:i A') }}</p>
    </div>

    <!-- ASSETS -->
    <div style="margin-bottom: 24px;">
        <h3 style="color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 12px;">1. Assets</h3>
        <table style="width: 100%; border-collapse: collapse;">
            <tbody>
                <tr style="background: #f8fafc;">
                    <td colspan="2" style="padding: 8px 12px; font-weight: 600; color: #334155;">Current Assets: Cash & Cash Equivalents</td>
                </tr>
                @foreach($accounts as $acc)
                <tr>
                    <td style="padding: 6px 24px; color: #475569;">{{ $acc->name }} ({{ ucfirst($acc->type) }}{{ $acc->number ? ' - '.$acc->number : '' }})</td>
                    <td style="padding: 6px 12px; text-align: right; font-family: monospace;">@money($acc->balanceCents())</td>
                </tr>
                @endforeach
                <tr style="border-top: 1px dashed #cbd5e1; font-weight: 600;">
                    <td style="padding: 6px 12px 12px 12px;">Total Cash & Bank</td>
                    <td style="padding: 6px 12px 12px 12px; text-align: right; font-family: monospace;">@money($cash)</td>
                </tr>

                <tr style="background: #f8fafc;">
                    <td colspan="2" style="padding: 8px 12px; font-weight: 600; color: #334155;">Inventories & Receivables</td>
                </tr>
                <tr>
                    <td style="padding: 6px 24px; color: #475569;">Merchandise Inventory (at cost valuation)</td>
                    <td style="padding: 6px 12px; text-align: right; font-family: monospace;">@money($inventory)</td>
                </tr>
                <tr>
                    <td style="padding: 6px 24px; color: #475569;">Accounts Receivable (Customer Due)</td>
                    <td style="padding: 6px 12px; text-align: right; font-family: monospace;">@money($salesDue)</td>
                </tr>
                <tr style="border-top: 2px solid #0f172a; font-weight: 700; background: #ecfdf5;">
                    <td style="padding: 10px 12px; color: #065f46; font-size: 1.05rem;">TOTAL ASSETS</td>
                    <td style="padding: 10px 12px; text-align: right; font-family: monospace; color: #065f46; font-size: 1.05rem;">@money($cash + $inventory + $salesDue)</td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- LIABILITIES -->
    <div style="margin-bottom: 24px;">
        <h3 style="color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 12px;">2. Liabilities</h3>
        <table style="width: 100%; border-collapse: collapse;">
            <tbody>
                <tr style="background: #f8fafc;">
                    <td colspan="2" style="padding: 8px 12px; font-weight: 600; color: #334155;">Current Liabilities</td>
                </tr>
                <tr>
                    <td style="padding: 6px 24px; color: #475569;">Accounts Payable (Supplier Purchase Dues)</td>
                    <td style="padding: 6px 12px; text-align: right; font-family: monospace;">@money($purchaseDue)</td>
                </tr>
                <tr style="border-top: 2px solid #0f172a; font-weight: 700; background: #fef2f2;">
                    <td style="padding: 10px 12px; color: #991b1b; font-size: 1.05rem;">TOTAL LIABILITIES</td>
                    <td style="padding: 10px 12px; text-align: right; font-family: monospace; color: #991b1b; font-size: 1.05rem;">@money($purchaseDue)</td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- EQUITY -->
    <div style="margin-bottom: 16px;">
        <h3 style="color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 12px;">3. Owner Equity</h3>
        <table style="width: 100%; border-collapse: collapse;">
            <tbody>
                <tr>
                    <td style="padding: 6px 24px; color: #475569;">Owner Retained Earnings / Net Equity (Assets - Liabilities)</td>
                    <td style="padding: 6px 12px; text-align: right; font-family: monospace;">@money($cash + $inventory + $salesDue - $purchaseDue)</td>
                </tr>
                <tr style="border-top: 2px solid #0f172a; border-bottom: 4px double #0f172a; font-weight: 700; background: #eff6ff;">
                    <td style="padding: 10px 12px; color: #1e40af; font-size: 1.05rem;">TOTAL LIABILITIES & EQUITY</td>
                    <td style="padding: 10px 12px; text-align: right; font-family: monospace; color: #1e40af; font-size: 1.05rem;">@money($cash + $inventory + $salesDue)</td>
                </tr>
            </tbody>
        </table>
    </div>

    <div style="margin-top: 32px; padding: 12px; background: #f8fafc; border-radius: 6px; font-size: 0.85rem; color: #64748b;">
        <strong>Accounting Note:</strong> Merchandise Inventory is valued based on current stock multiplied by purchase cost. Accounts Receivable includes all completed sales balances due. Accounts Payable includes all approved purchases balances due.
    </div>
</section>
@endsection

