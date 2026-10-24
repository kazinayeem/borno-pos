<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Purchase Invoice {{ $purchase->reference }}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #0284c7;
            --primary-dark: #0369a1;
            --text: #0f172a;
            --muted: #64748b;
            --border: #e2e8f0;
            --bg: #f8fafc;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            padding: 0;
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
            color: var(--text);
            background: #e2e8f0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        /* Top Bar for Screen Navigation */
        .no-print-bar {
            background: #0f172a;
            color: #fff;
            padding: 12px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .format-toggle {
            display: inline-flex;
            background: #1e293b;
            border-radius: 8px;
            padding: 3px;
            gap: 4px;
        }
        .format-btn {
            background: transparent;
            border: 0;
            color: #94a3b8;
            padding: 6px 14px;
            font-size: 13px;
            font-weight: 600;
            border-radius: 6px;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
        }
        .format-btn:hover { color: #fff; }
        .format-btn.active {
            background: var(--primary);
            color: #fff;
        }
        .action-btns {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .btn-print {
            background: #0284c7;
            color: #fff;
            border: 0;
            padding: 8px 18px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 2px 8px rgba(2, 132, 199, 0.4);
        }
        .btn-print:hover { background: #0369a1; }
        .btn-close {
            background: #334155;
            color: #fff;
            border: 0;
            padding: 8px 14px;
            border-radius: 8px;
            font-size: 13px;
            cursor: pointer;
            text-decoration: none;
        }
        .btn-close:hover { background: #475569; }

        .invoice-wrapper {
            padding: 30px 16px;
            display: flex;
            justify-content: center;
        }

        /* ========================================================
           FORMAT: POS RECEIPT (80mm Thermal Printer)
           ======================================================== */
        .pos-receipt {
            width: 80mm;
            max-width: 100%;
            background: #fff;
            padding: 16px 12px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.08);
            border-radius: 6px;
            font-family: 'Space Mono', monospace, sans-serif;
            font-size: 11px;
            line-height: 1.35;
        }
        .pos-header {
            text-align: center;
            margin-bottom: 12px;
        }
        .pos-logo {
            max-height: 48px;
            max-width: 140px;
            object-fit: contain;
            margin: 0 auto 6px;
            display: block;
        }
        .pos-header h1 {
            font-size: 16px;
            margin: 4px 0 2px;
            font-weight: 700;
            letter-spacing: -0.5px;
        }
        .pos-header p {
            margin: 2px 0;
            color: #475569;
            font-size: 10px;
        }
        .pos-divider {
            border-top: 1px dashed #64748b;
            margin: 8px 0;
        }
        .pos-meta {
            margin-bottom: 8px;
        }
        .pos-meta-row {
            display: flex;
            justify-content: space-between;
            font-size: 10.5px;
            margin: 2px 0;
        }
        .pos-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10.5px;
            margin: 6px 0;
        }
        .pos-table th {
            text-align: left;
            border-bottom: 1px dashed #64748b;
            padding: 4px 0;
        }
        .pos-table th:last-child, .pos-table td:last-child {
            text-align: right;
        }
        .pos-table td {
            padding: 4px 0;
            vertical-align: top;
        }
        .pos-totals {
            margin-top: 6px;
        }
        .pos-total-row {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
            font-size: 11px;
        }
        .pos-total-row.grand {
            font-size: 14px;
            font-weight: 700;
            border-top: 1px dashed #1e293b;
            border-bottom: 1px dashed #1e293b;
            padding: 4px 0;
            margin: 6px 0;
        }
        .pos-footer {
            text-align: center;
            font-size: 9.5px;
            color: #64748b;
            margin-top: 12px;
        }

        /* ========================================================
           FORMAT: A4 CORPORATE INVOICE
           ======================================================== */
        .a4-invoice {
            width: 210mm;
            min-height: 297mm;
            background: #fff;
            padding: 20mm;
            box-shadow: 0 8px 30px rgba(0,0,0,0.08);
            border-radius: 4px;
            position: relative;
            display: flex;
            flex-direction: column;
        }
        .a4-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid var(--primary);
            padding-bottom: 20px;
            margin-bottom: 24px;
        }
        .a4-brand {
            display: flex;
            align-items: center;
            gap: 14px;
        }
        .a4-logo {
            max-height: 56px;
            max-width: 180px;
            object-fit: contain;
        }
        .a4-brand-text h1 {
            margin: 0;
            font-size: 22px;
            font-weight: 800;
            color: #0f172a;
        }
        .a4-brand-text p {
            margin: 3px 0 0;
            color: var(--muted);
            font-size: 12px;
        }
        .a4-inv-meta {
            text-align: right;
        }
        .a4-inv-title {
            font-size: 26px;
            font-weight: 900;
            color: var(--primary);
            letter-spacing: -0.5px;
            margin: 0;
            line-height: 1;
        }
        .a4-inv-no {
            font-size: 14px;
            font-weight: 700;
            color: #334155;
            margin: 6px 0 2px;
        }
        .a4-status-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 6px;
        }
        .badge-paid { background: #dcfce7; color: #15803d; }
        .badge-partial { background: #fef3c7; color: #b45309; }
        .badge-due { background: #fee2e2; color: #b91c1c; }
        .badge-cancelled { background: #f1f5f9; color: #64748b; }

        .a4-parties {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-bottom: 28px;
            background: var(--bg);
            padding: 16px 20px;
            border-radius: 10px;
            border: 1px solid var(--border);
        }
        .a4-party h4 {
            margin: 0 0 8px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: var(--muted);
        }
        .a4-party strong {
            display: block;
            font-size: 15px;
            color: #0f172a;
            margin-bottom: 4px;
        }
        .a4-party p {
            margin: 2px 0;
            font-size: 13px;
            color: #475569;
        }

        .a4-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
        }
        .a4-table th {
            background: #f1f5f9;
            color: #334155;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 10px 14px;
            border-top: 1px solid var(--border);
            border-bottom: 1px solid var(--border);
            text-align: left;
        }
        .a4-table td {
            padding: 12px 14px;
            font-size: 13px;
            border-bottom: 1px solid var(--border);
            color: #1e293b;
        }
        .a4-table th.num, .a4-table td.num { text-align: right; }
        .a4-table tr:last-child td { border-bottom: 2px solid var(--border); }

        .a4-bottom {
            display: grid;
            grid-template-columns: 1fr 290px;
            gap: 32px;
            margin-top: auto;
            padding-top: 20px;
        }
        .a4-notes h4 {
            margin: 0 0 6px;
            font-size: 12px;
            color: #334155;
        }
        .a4-notes p {
            margin: 0;
            font-size: 12px;
            color: var(--muted);
            line-height: 1.5;
        }
        .a4-signature-box {
            margin-top: 40px;
            display: inline-block;
            border-top: 1px solid #cbd5e1;
            padding-top: 6px;
            min-width: 180px;
            font-size: 12px;
            color: var(--muted);
        }

        .a4-summary {
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 14px 18px;
        }
        .a4-summary-row {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            margin: 5px 0;
            color: #475569;
        }
        .a4-summary-row.grand {
            border-top: 2px solid #cbd5e1;
            margin-top: 10px;
            padding-top: 10px;
            font-size: 16px;
            font-weight: 800;
            color: var(--primary-dark);
        }
        .a4-summary-row.paid {
            font-weight: 700;
            color: #16a34a;
        }
        .a4-summary-row.due {
            font-weight: 700;
            color: #ef4444;
        }

        /* Print Media Styles */
        @media print {
            body { background: #fff !important; }
            .no-print, .no-print-bar { display: none !important; }
            .invoice-wrapper { padding: 0 !important; }

            @if(($format ?? 'a4') === 'pos')
                @page {
                    size: 80mm auto;
                    margin: 0;
                }
                .pos-receipt {
                    width: 100% !important;
                    max-width: 80mm !important;
                    box-shadow: none !important;
                    border-radius: 0 !important;
                    padding: 8px 6px !important;
                }
            @else
                @page {
                    size: A4 portrait;
                    margin: 10mm;
                }
                .a4-invoice {
                    width: 100% !important;
                    min-height: auto !important;
                    box-shadow: none !important;
                    border-radius: 0 !important;
                    padding: 0 !important;
                }
            @endif
        }
    </style>
</head>
<body>

    <!-- On-Screen Navigation & Print Switcher -->
    <div class="no-print-bar">
        <div style="display: flex; align-items: center; gap: 12px;">
            <strong style="font-size: 15px; letter-spacing: -0.3px;">🖨️ Purchase Invoice Print Preview</strong>
            <div class="format-toggle">
                <a href="{{ request()->fullUrlWithQuery(['format' => 'a4']) }}" class="format-btn {{ ($format ?? 'a4') === 'a4' ? 'active' : '' }}">
                    📄 Standard A4
                </a>
                <a href="{{ request()->fullUrlWithQuery(['format' => 'pos']) }}" class="format-btn {{ ($format ?? 'a4') === 'pos' ? 'active' : '' }}">
                    🧾 POS (80mm)
                </a>
            </div>
        </div>
        <div class="action-btns">
            <button class="btn-print" onclick="window.print()">
                <span>🖨️</span> Print Invoice
            </button>
            <a href="javascript:window.close()" class="btn-close">Close</a>
        </div>
    </div>

    <div class="invoice-wrapper">
        @php
            $isCancelled = $purchase->status === 'cancelled';
            $isPaid = !$isCancelled && $purchase->paid_cents >= $purchase->grand_cents;
            $isPartial = !$isCancelled && $purchase->paid_cents > 0 && $purchase->paid_cents < $purchase->grand_cents;
            $isDue = !$isCancelled && $purchase->paid_cents <= 0;
        @endphp

        @if(($format ?? 'a4') === 'pos')
            <!-- ================= POS RECEIPT VIEW ================= -->
            <div class="pos-receipt">
                <div class="pos-header">
                    @if($store?->logo)
                        <img src="/storage/{{ $store->logo }}" alt="Logo" class="pos-logo">
                    @endif
                    <h1>{{ $store->name ?? 'BornoPos Pharmacy' }}</h1>
                    @if($store?->address)<p>{{ $store->address }}</p>@endif
                    @if($store?->phone)<p>Tel: {{ $store->phone }}</p>@endif
                    <p style="font-weight: 700; margin-top: 4px; text-transform: uppercase;">PURCHASE RECEIPT</p>
                </div>

                <div class="pos-divider"></div>

                <div class="pos-meta">
                    <div class="pos-meta-row">
                        <span>PO Ref:</span>
                        <strong>#{{ $purchase->reference }}</strong>
                    </div>
                    <div class="pos-meta-row">
                        <span>Date:</span>
                        <span>{{ optional($purchase->purchased_on)->format('d M Y') }}</span>
                    </div>
                    <div class="pos-meta-row">
                        <span>Supplier:</span>
                        <strong>{{ $purchase->supplier?->name ?? 'Direct Purchase' }}</strong>
                    </div>
                    @if($purchase->warehouse)
                        <div class="pos-meta-row">
                            <span>Warehouse:</span>
                            <span>{{ $purchase->warehouse->name }}</span>
                        </div>
                    @endif
                    <div class="pos-meta-row">
                        <span>Received By:</span>
                        <span>{{ $purchase->user?->name ?? 'Admin' }}</span>
                    </div>
                    <div class="pos-meta-row">
                        <span>Status:</span>
                        <span>{{ strtoupper($purchase->status) }}</span>
                    </div>
                </div>

                <div class="pos-divider"></div>

                <table class="pos-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th style="text-align: center; width: 34px;">Qty</th>
                            <th style="text-align: right; width: 55px;">Cost</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($purchase->items as $item)
                            <tr>
                                <td>
                                    {{ $item->product?->name ?? 'Item' }}
                                    @if($item->batch_no)
                                        <div style="font-size: 9px; color: #64748b;">Batch: {{ $item->batch_no }}</div>
                                    @endif
                                </td>
                                <td style="text-align: center;">{{ $item->qty }}</td>
                                <td style="text-align: right;">@money($item->cost_cents)</td>
                                <td>@money($item->subtotal_cents)</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>

                <div class="pos-divider"></div>

                <div class="pos-totals">
                    <div class="pos-total-row">
                        <span>Subtotal:</span>
                        <span>@money($purchase->subtotal_cents)</span>
                    </div>
                    @if($purchase->tax_cents > 0)
                        <div class="pos-total-row">
                            <span>Tax:</span>
                            <span>@money($purchase->tax_cents)</span>
                        </div>
                    @endif
                    @if($purchase->shipping_cents > 0)
                        <div class="pos-total-row">
                            <span>Shipping:</span>
                            <span>@money($purchase->shipping_cents)</span>
                        </div>
                    @endif
                    @if($purchase->discount_cents > 0)
                        <div class="pos-total-row">
                            <span>Discount:</span>
                            <span>− @money($purchase->discount_cents)</span>
                        </div>
                    @endif
                    <div class="pos-total-row grand">
                        <span>GRAND TOTAL:</span>
                        <span>@money($purchase->grand_cents)</span>
                    </div>
                    <div class="pos-total-row">
                        <span>Total Paid:</span>
                        <span>@money($purchase->paid_cents)</span>
                    </div>
                    @if($purchase->dueCents() > 0)
                        <div class="pos-total-row" style="color: #ef4444; font-weight: 700;">
                            <span>Balance Due:</span>
                            <span>@money($purchase->dueCents())</span>
                        </div>
                    @else
                        <div class="pos-total-row" style="color: #16a34a; font-weight: 700;">
                            <span>Payment Status:</span>
                            <span>FULLY PAID</span>
                        </div>
                    @endif
                </div>

                <div class="pos-footer">
                    <p>BornoPos Purchase Inventory System</p>
                </div>
            </div>
        @else
            <!-- ================= A4 INVOICE VIEW ================= -->
            <div class="a4-invoice">
                <div class="a4-top">
                    <div class="a4-brand">
                        @if($store?->logo)
                            <img src="/storage/{{ $store->logo }}" alt="Logo" class="a4-logo">
                        @else
                            <svg width="48" height="48" viewBox="0 0 36 36" fill="none">
                                <rect width="36" height="36" rx="10" fill="#0284C7"/>
                                <path d="M10 13h13l-1.2 8.2a2 2 0 0 1-2 1.7H14a2 2 0 0 1-2-1.6L10 13Z" stroke="white" stroke-width="2"/>
                                <path d="M10 13 8.8 9H7" stroke="white" stroke-width="2" stroke-linecap="round"/>
                                <circle cx="15" cy="26" r="1.5" fill="white"/>
                                <circle cx="21" cy="26" r="1.5" fill="white"/>
                            </svg>
                        @endif
                        <div class="a4-brand-text">
                            <h1>{{ $store->name ?? 'BornoPos Store' }}</h1>
                            @if($store?->address)<p>{{ $store->address }}</p>@endif
                            @if($store?->phone)<p>Phone: {{ $store->phone }} @if($store?->email) · Email: {{ $store->email }} @endif</p>@endif
                        </div>
                    </div>
                    <div class="a4-inv-meta">
                        <h2 class="a4-inv-title">PURCHASE INVOICE</h2>
                        <div class="a4-inv-no">#{{ $purchase->reference }}</div>
                        <div style="font-size: 13px; color: var(--muted); margin-top: 4px;">
                            Date: {{ optional($purchase->purchased_on)->format('d F Y') }}
                        </div>
                        @if($isCancelled)
                            <span class="a4-status-badge badge-cancelled">CANCELLED</span>
                        @elseif($isPaid)
                            <span class="a4-status-badge badge-paid">PAID</span>
                        @elseif($isPartial)
                            <span class="a4-status-badge badge-partial">PARTIALLY PAID</span>
                        @else
                            <span class="a4-status-badge badge-due">PAYABLE DUE</span>
                        @endif
                    </div>
                </div>

                <div class="a4-parties">
                    <div class="a4-party">
                        <h4>SUPPLIER DETAILS</h4>
                        <strong>{{ $purchase->supplier?->name ?? 'General Supplier' }}</strong>
                        @if($purchase->supplier?->company)<p>🏢 {{ $purchase->supplier->company }}</p>@endif
                        @if($purchase->supplier?->phone)<p>📞 {{ $purchase->supplier->phone }}</p>@endif
                        @if($purchase->supplier?->email)<p>✉️ {{ $purchase->supplier->email }}</p>@endif
                        @if($purchase->supplier?->address)<p>📍 {{ $purchase->supplier->address }}</p>@endif
                    </div>
                    <div class="a4-party">
                        <h4>RECEIVING & DESTINATION</h4>
                        <p><strong>Warehouse / Store:</strong> {{ $purchase->warehouse?->name ?? 'Main Warehouse' }}</p>
                        <p><strong>Payment Method:</strong> {{ ucfirst($purchase->payment_method) }}</p>
                        <p><strong>Received By:</strong> {{ $purchase->user?->name ?? 'Staff' }}</p>
                        <p><strong>Stock Status:</strong> {{ ucfirst($purchase->status) }}</p>
                    </div>
                </div>

                <table class="a4-table">
                    <thead>
                        <tr>
                            <th style="width: 36px;">#</th>
                            <th>Product Description</th>
                            <th style="width: 110px;">Batch / Expiry</th>
                            <th class="num" style="width: 100px;">Unit Cost</th>
                            <th class="num" style="width: 60px;">Qty</th>
                            <th class="num" style="width: 110px;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($purchase->items as $index => $item)
                            <tr>
                                <td>{{ $index + 1 }}</td>
                                <td>
                                    <strong>{{ $item->product?->name ?? 'Item' }}</strong>
                                    @if($item->product?->code)
                                        <span style="font-size: 11px; color: var(--muted); margin-left: 6px;">[SKU: {{ $item->product->code }}]</span>
                                    @endif
                                    @if($item->serial)
                                        <div style="font-size: 11px; color: var(--primary); margin-top: 2px;">Serial/IMEI: {{ $item->serial }}</div>
                                    @endif
                                </td>
                                <td>
                                    @if($item->batch_no)
                                        <div><strong>{{ $item->batch_no }}</strong></div>
                                        @if($item->expiry_date)
                                            <div style="font-size: 11px; color: var(--muted);">Exp: {{ optional($item->expiry_date)->format('d M Y') }}</div>
                                        @endif
                                    @else
                                        <span style="color: var(--muted); font-size: 11px;">—</span>
                                    @endif
                                </td>
                                <td class="num">@money($item->cost_cents)</td>
                                <td class="num">{{ $item->qty }}</td>
                                <td class="num">@money($item->subtotal_cents)</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>

                <div class="a4-bottom">
                    <div class="a4-notes">
                        @if($purchase->note)
                            <h4>Purchase Notes</h4>
                            <p>{{ $purchase->note }}</p>
                        @endif

                        @if($purchase->payments->isNotEmpty())
                            <h4 style="margin-top: 14px;">Payment History</h4>
                            <table style="width: 100%; font-size: 11px; border-collapse: collapse; margin-top: 4px;">
                                <thead>
                                    <tr style="border-bottom: 1px solid var(--border); text-align: left; color: var(--muted);">
                                        <th style="padding: 4px 0;">Date</th>
                                        <th style="padding: 4px 0;">Method</th>
                                        <th style="padding: 4px 0;">Account</th>
                                        <th style="padding: 4px 0; text-align: right;">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @foreach($purchase->payments as $payment)
                                        <tr style="border-bottom: 1px dashed var(--border);">
                                            <td style="padding: 4px 0;">{{ optional($payment->paid_at)->format('d M Y') }}</td>
                                            <td style="padding: 4px 0;">{{ $payment->method }}</td>
                                            <td style="padding: 4px 0;">{{ $payment->account?->name ?? 'Default' }}</td>
                                            <td style="padding: 4px 0; text-align: right; font-weight: 600;">@money($payment->amount_cents)</td>
                                        </tr>
                                    @endforeach
                                </tbody>
                            </table>
                        @endif

                        <div class="a4-signature-box">
                            Authorized Signature / Warehouse Receiver
                        </div>
                    </div>

                    <div class="a4-summary">
                        <div class="a4-summary-row">
                            <span>Subtotal:</span>
                            <span>@money($purchase->subtotal_cents)</span>
                        </div>
                        @if($purchase->tax_cents > 0)
                            <div class="a4-summary-row">
                                <span>Tax:</span>
                                <span>@money($purchase->tax_cents)</span>
                            </div>
                        @endif
                        @if($purchase->shipping_cents > 0)
                            <div class="a4-summary-row">
                                <span>Shipping:</span>
                                <span>@money($purchase->shipping_cents)</span>
                            </div>
                        @endif
                        @if($purchase->discount_cents > 0)
                            <div class="a4-summary-row" style="color: #16a34a;">
                                <span>Discount:</span>
                                <span>− @money($purchase->discount_cents)</span>
                            </div>
                        @endif
                        <div class="a4-summary-row grand">
                            <span>Grand Total:</span>
                            <span>@money($purchase->grand_cents)</span>
                        </div>
                        <div class="a4-summary-row paid">
                            <span>Amount Paid:</span>
                            <span>@money($purchase->paid_cents)</span>
                        </div>
                        @if($purchase->dueCents() > 0)
                            <div class="a4-summary-row due">
                                <span>Outstanding Due:</span>
                                <span>@money($purchase->dueCents())</span>
                            </div>
                        @else
                            <div class="a4-summary-row paid" style="font-size: 11px; text-transform: uppercase;">
                                <span>Status:</span>
                                <span>Fully Settled</span>
                            </div>
                        @endif
                    </div>
                </div>
            </div>
        @endif
    </div>

    @if(!empty($auto))
        <script>
            window.onload = function() {
                window.print();
            };
        </script>
    @endif
</body>
</html>
