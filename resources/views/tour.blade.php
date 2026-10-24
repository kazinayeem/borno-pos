@extends('layouts.app')
@section('content')
<div class="page-title">
    <div>
        <h1>System Guided Tour & Onboarding</h1>
        <p class="muted">Follow these 6 core workflows to master BornoPos Pharmacy & Retail Management</p>
    </div>
    <div style="display: flex; gap: 8px;">
        <a class="btn primary" href="{{ route('pos') }}">Launch POS Screen</a>
    </div>
</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 24px;">
    <!-- Step 1 -->
    <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; border-top: 4px solid #3b82f6;">
        <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <span style="display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; border-radius: 50%; background: #dbeafe; color: #1e40af; font-weight: 700; font-size: 0.9rem;">1</span>
                <span class="muted" style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase;">Product Catalog</span>
            </div>
            <h3 style="margin: 0 0 8px; font-size: 1.15rem;">Add & Manage Products</h3>
            <p class="muted" style="font-size: 0.9rem; line-height: 1.5;">Create medicines, retail items, brand & unit definitions, set selling prices, purchase costs, batch tracking, and print professional barcodes.</p>
        </div>
        <div style="margin-top: 16px; display: flex; gap: 8px; flex-wrap: wrap;">
            <a class="btn" href="{{ route('products.create') }}">+ Add Product</a>
            <a class="btn" href="{{ route('products.index') }}">View Catalog</a>
            <a class="btn" href="{{ route('barcode.print') }}">Print Barcodes</a>
        </div>
    </div>

    <!-- Step 2 -->
    <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; border-top: 4px solid #10b981;">
        <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <span style="display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; border-radius: 50%; background: #d1fae5; color: #065f46; font-weight: 700; font-size: 0.9rem;">2</span>
                <span class="muted" style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase;">Procurement</span>
            </div>
            <h3 style="margin: 0 0 8px; font-size: 1.15rem;">Purchase Stock & Batches</h3>
            <p class="muted" style="font-size: 0.9rem; line-height: 1.5;">Receive medicines from suppliers with batch numbers and expiration dates. Inventory counts automatically increment, and supplier balances update in real time.</p>
        </div>
        <div style="margin-top: 16px; display: flex; gap: 8px; flex-wrap: wrap;">
            <a class="btn" href="{{ route('purchases.create') }}">+ New Purchase</a>
            <a class="btn" href="{{ route('purchases.index') }}">Purchase List</a>
            <a class="btn" href="{{ route('stock.count') }}">Stock Count</a>
        </div>
    </div>

    <!-- Step 3 -->
    <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; border-top: 4px solid #f59e0b;">
        <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <span style="display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; border-radius: 50%; background: #fef3c7; color: #92400e; font-weight: 700; font-size: 0.9rem;">3</span>
                <span class="muted" style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase;">Fast Point of Sale</span>
            </div>
            <h3 style="margin: 0 0 8px; font-size: 1.15rem;">Lightning POS Checkout</h3>
            <p class="muted" style="font-size: 0.9rem; line-height: 1.5;">Use keyboard shortcuts, instant barcode scanning, prescription search, discounts, customer selection, draft orders, and multi-payment settlement.</p>
        </div>
        <div style="margin-top: 16px; display: flex; gap: 8px; flex-wrap: wrap;">
            <a class="btn primary" href="{{ route('pos') }}">Open POS Register</a>
            <a class="btn" href="{{ route('sales.drafts') }}">Draft Orders</a>
        </div>
    </div>

    <!-- Step 4 -->
    <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; border-top: 4px solid #8b5cf6;">
        <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <span style="display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; border-radius: 50%; background: #ede9fe; color: #5b21b6; font-weight: 700; font-size: 0.9rem;">4</span>
                <span class="muted" style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase;">Sales & Returns</span>
            </div>
            <h3 style="margin: 0 0 8px; font-size: 1.15rem;">Invoices, Receipts & Returns</h3>
            <p class="muted" style="font-size: 0.9rem; line-height: 1.5;">Review customer invoices, print thermal or A4 receipts, handle partial product returns safely, and manage customer installment payment schedules.</p>
        </div>
        <div style="margin-top: 16px; display: flex; gap: 8px; flex-wrap: wrap;">
            <a class="btn" href="{{ route('sales.index') }}">Sales Invoices</a>
            <a class="btn" href="{{ route('reports.installments') }}">Installments</a>
        </div>
    </div>

    <!-- Step 5 -->
    <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; border-top: 4px solid #06b6d4;">
        <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <span style="display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; border-radius: 50%; background: #cffafe; color: #0e7490; font-weight: 700; font-size: 0.9rem;">5</span>
                <span class="muted" style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase;">Double-Entry Accounting</span>
            </div>
            <h3 style="margin: 0 0 8px; font-size: 1.15rem;">Accounts, Expenses & Balance Sheet</h3>
            <p class="muted" style="font-size: 0.9rem; line-height: 1.5;">Track cash in hand, bank accounts, money transfers with safe reversal, categorized store expenses, transaction ledgers, and formal balance sheet.</p>
        </div>
        <div style="margin-top: 16px; display: flex; gap: 8px; flex-wrap: wrap;">
            <a class="btn" href="{{ route('accounts.index') }}">Bank Accounts</a>
            <a class="btn" href="{{ route('expenses.index') }}">Expenses</a>
            <a class="btn" href="{{ route('accounting.balance') }}">Balance Sheet</a>
        </div>
    </div>

    <!-- Step 6 -->
    <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; border-top: 4px solid #ec4899;">
        <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <span style="display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; border-radius: 50%; background: #fce7f3; color: #9d174d; font-weight: 700; font-size: 0.9rem;">6</span>
                <span class="muted" style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase;">HRM & Staff Control</span>
            </div>
            <h3 style="margin: 0 0 8px; font-size: 1.15rem;">Staff Roles, Attendance & Payroll</h3>
            <p class="muted" style="font-size: 0.9rem; line-height: 1.5;">Assign granular permissions to Cashiers and Managers, log daily employee attendance, calculate monthly payrolls, and review staff performance.</p>
        </div>
        <div style="margin-top: 16px; display: flex; gap: 8px; flex-wrap: wrap;">
            <a class="btn" href="{{ route('attendance.index') }}">Attendance</a>
            <a class="btn" href="{{ route('payrolls.index') }}">Payrolls</a>
            <a class="btn" href="{{ route('reports.center') }}">Reports Center</a>
        </div>
    </div>
</div>

<section class="card" style="padding: 24px;">
    <h3 style="margin: 0 0 16px;">POS Quick Keyboard Reference</h3>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
        <div style="padding: 10px; background: #f8fafc; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
            <span>Search Products</span>
            <kbd style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.85rem;">F2</kbd>
        </div>
        <div style="padding: 10px; background: #f8fafc; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
            <span>Fast Cash Checkout</span>
            <kbd style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.85rem;">F4</kbd>
        </div>
        <div style="padding: 10px; background: #f8fafc; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
            <span>Save as Draft</span>
            <kbd style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.85rem;">F7</kbd>
        </div>
        <div style="padding: 10px; background: #f8fafc; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
            <span>Clear / Reset Cart</span>
            <kbd style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.85rem;">Esc</kbd>
        </div>
    </div>
</section>
@endsection

