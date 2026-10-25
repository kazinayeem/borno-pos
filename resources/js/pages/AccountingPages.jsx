import { useEffect, useState } from 'react';
import { api, money } from '../api';
import { useT } from '../i18n';

export function AccountsPage() {
    const t = useT();
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [name, setName] = useState('');
    const [number, setNumber] = useState('');
    const [type, setType] = useState('cash');
    const [opening, setOpening] = useState('');
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');

    function loadAccounts() {
        setLoading(true);
        api('/accounts')
            .then((res) => {
                setAccounts(res.accounts || []);
            })
            .catch((e) => setErr(e.message))
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        loadAccounts();
    }, []);

    async function handleCreate(e) {
        e.preventDefault();
        setMsg('');
        setErr('');
        try {
            await api('/accounts', {
                method: 'POST',
                body: { name, number, type, opening: opening ? parseFloat(opening) : 0 },
            });
            setShowModal(false);
            setName('');
            setNumber('');
            setOpening('');
            setMsg(t('Account created successfully.'));
            loadAccounts();
        } catch (e) {
            setErr(e.message || t('Failed to create account.'));
        }
    }

    async function handleDelete(id) {
        if (!window.confirm(t('Are you sure you want to delete this account?'))) return;
        try {
            await api(`/accounts/${id}`, { method: 'DELETE' });
            setMsg(t('Account deleted.'));
            loadAccounts();
        } catch (e) {
            setErr(e.message || t('Failed to delete account.'));
        }
    }

    return (
        <div>
            <div className="page-title">
                <div>
                    <h1>{t('Accounts')}</h1>
                    <div className="crumbs">{t('Manage bank accounts, cash registers, and mobile payment accounts')}</div>
                </div>
                <button type="button" className="btn primary" onClick={() => setShowModal(true)}>
                    + {t('Add Account')}
                </button>
            </div>

            {msg && <div className="flash note" style={{ marginBottom: '16px' }}>{msg}<button type="button" onClick={() => setMsg('')}>×</button></div>}
            {err && <div className="errors note" style={{ marginBottom: '16px' }}>{err}</div>}

            <section className="card" data-tour="accounts-table">
                <table className="grid">
                    <thead>
                        <tr>
                            <th>{t('Account Name')}</th>
                            <th>{t('Account Number')}</th>
                            <th>{t('Type')}</th>
                            <th style={{ textAlign: 'right' }}>{t('Balance')}</th>
                            <th style={{ textAlign: 'center' }}>{t('Default')}</th>
                            <th style={{ textAlign: 'right' }}>{t('Actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {accounts.map((acc) => (
                            <tr key={acc.id}>
                                <td><strong>{acc.name}</strong></td>
                                <td>{acc.number || '—'}</td>
                                <td><span className="badge" style={{ textTransform: 'capitalize' }}>{acc.type}</span></td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: acc.balance_cents < 0 ? '#ef4444' : '#10b981' }}>
                                    {money(acc.balance_cents)}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    {acc.is_default ? <span className="chip active">Default</span> : '—'}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    {!acc.is_default && (
                                        <button type="button" className="icon-btn" onClick={() => handleDelete(acc.id)} title={t('Delete')}>🗑</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {loading && <p className="muted" style={{ padding: '16px' }}>{t('Loading accounts…')}</p>}
                {!loading && accounts.length === 0 && <p className="empty">{t('No accounts found.')}</p>}
            </section>

            {showModal && (
                <div className="modal-backdrop" onClick={() => setShowModal(false)}>
                    <div className="modal card" style={{ maxWidth: '480px', margin: '40px auto' }} onClick={(e) => e.stopPropagation()}>
                        <h2>{t('Create New Account')}</h2>
                        <form onSubmit={handleCreate}>
                            <div className="field">
                                <label>{t('Account Name')}</label>
                                <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. City Bank" />
                            </div>
                            <div className="field">
                                <label>{t('Account Number')}</label>
                                <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="e.g. 10203040" />
                            </div>
                            <div className="field">
                                <label>{t('Account Type')}</label>
                                <select value={type} onChange={(e) => setType(e.target.value)}>
                                    <option value="cash">{t('Cash')}</option>
                                    <option value="bank">{t('Bank')}</option>
                                    <option value="mobile">{t('Mobile Banking')}</option>
                                </select>
                            </div>
                            <div className="field">
                                <label>{t('Opening Balance')}</label>
                                <input type="number" step="0.01" value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="0.00" />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                                <button type="button" className="btn" onClick={() => setShowModal(false)}>{t('Cancel')}</button>
                                <button type="submit" className="btn primary">{t('Save Account')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export function MoneyTransfersPage() {
    const t = useT();
    const [transfers, setTransfers] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [fromAccount, setFromAccount] = useState('');
    const [toAccount, setToAccount] = useState('');
    const [amount, setAmount] = useState('');
    const [transferredOn, setTransferredOn] = useState(new Date().toISOString().slice(0, 10));
    const [note, setNote] = useState('');
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');

    function loadData() {
        setLoading(true);
        api('/money-transfers')
            .then((res) => {
                setTransfers(res.transfers || []);
                setAccounts(res.accounts || []);
                if (res.accounts?.length > 1) {
                    setFromAccount(String(res.accounts[0].id));
                    setToAccount(String(res.accounts[1].id));
                }
            })
            .catch((e) => setErr(e.message))
            .finally(() => setLoading(false));
    }

    useEffect(() => { loadData(); }, []);

    async function handleTransfer(e) {
        e.preventDefault();
        setMsg('');
        setErr('');
        try {
            await api('/money-transfers', {
                method: 'POST',
                body: {
                    from_account_id: parseInt(fromAccount),
                    to_account_id: parseInt(toAccount),
                    amount: parseFloat(amount),
                    transferred_on: transferredOn,
                    note,
                },
            });
            setShowModal(false);
            setAmount('');
            setNote('');
            setMsg(t('Money transferred successfully.'));
            loadData();
        } catch (e) {
            setErr(e.message || t('Transfer failed.'));
        }
    }

    async function handleReverse(id) {
        if (!window.confirm(t('Are you sure you want to reverse this money transfer?'))) return;
        try {
            await api(`/money-transfers/${id}/reverse`, { method: 'POST' });
            setMsg(t('Transfer reversed successfully.'));
            loadData();
        } catch (e) {
            setErr(e.message || t('Failed to reverse transfer.'));
        }
    }

    return (
        <div>
            <div className="page-title">
                <div>
                    <h1>{t('Money Transfers')}</h1>
                    <div className="crumbs">{t('Transfer funds between your bank, cash, and mobile payment accounts')}</div>
                </div>
                <button type="button" className="btn primary" onClick={() => setShowModal(true)}>
                    + {t('Transfer Money')}
                </button>
            </div>

            {msg && <div className="flash note" style={{ marginBottom: '16px' }}>{msg}<button type="button" onClick={() => setMsg('')}>×</button></div>}
            {err && <div className="errors note" style={{ marginBottom: '16px' }}>{err}</div>}

            <section className="card" data-tour="transfers-card">
                <table className="grid">
                    <thead>
                        <tr>
                            <th>{t('Date')}</th>
                            <th>{t('From Account')}</th>
                            <th>{t('To Account')}</th>
                            <th style={{ textAlign: 'right' }}>{t('Amount')}</th>
                            <th>{t('Note')}</th>
                            <th style={{ textAlign: 'right' }}>{t('Actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transfers.map((tx) => (
                            <tr key={tx.id}>
                                <td>{tx.transferred_on}</td>
                                <td><strong>{tx.from_account}</strong></td>
                                <td><strong>{tx.to_account}</strong></td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                                    {money(tx.amount_cents)}
                                </td>
                                <td>{tx.note || '—'}</td>
                                <td style={{ textAlign: 'right' }}>
                                    <button type="button" className="btn danger small" onClick={() => handleReverse(tx.id)}>{t('Reverse')}</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {loading && <p className="muted" style={{ padding: '16px' }}>{t('Loading transfers…')}</p>}
                {!loading && transfers.length === 0 && <p className="empty">{t('No money transfers recorded yet.')}</p>}
            </section>

            {showModal && (
                <div className="modal-backdrop" onClick={() => setShowModal(false)}>
                    <div className="modal card" style={{ maxWidth: '480px', margin: '40px auto' }} onClick={(e) => e.stopPropagation()}>
                        <h2>{t('Transfer Money Between Accounts')}</h2>
                        <form onSubmit={handleTransfer}>
                            <div className="field">
                                <label>{t('Source Account (From)')}</label>
                                <select value={fromAccount} onChange={(e) => setFromAccount(e.target.value)} required>
                                    {accounts.map((a) => (
                                        <option key={a.id} value={a.id}>{a.name} ({money(a.balance_cents)})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="field">
                                <label>{t('Destination Account (To)')}</label>
                                <select value={toAccount} onChange={(e) => setToAccount(e.target.value)} required>
                                    {accounts.filter((a) => String(a.id) !== String(fromAccount)).map((a) => (
                                        <option key={a.id} value={a.id}>{a.name} ({money(a.balance_cents)})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="field">
                                <label>{t('Amount')}</label>
                                <input type="number" step="0.01" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="0.00" />
                            </div>
                            <div className="field">
                                <label>{t('Date')}</label>
                                <input type="date" value={transferredOn} onChange={(e) => setTransferredOn(e.target.value)} required />
                            </div>
                            <div className="field">
                                <label>{t('Note')}</label>
                                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. ATM withdrawal" />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                                <button type="button" className="btn" onClick={() => setShowModal(false)}>{t('Cancel')}</button>
                                <button type="submit" className="btn primary">{t('Confirm Transfer')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export function BalanceSheetPage() {
    const t = useT();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');

    useEffect(() => {
        setLoading(true);
        api('/account/balancesheet')
            .then(setData)
            .catch((e) => setErr(e.message))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div>
            <div className="page-title">
                <div>
                    <h1>{t('Balance Sheet')}</h1>
                    <div className="crumbs">{t('Statement of Financial Position: Assets, Liabilities, and Owner Equity')}</div>
                </div>
                <button type="button" className="btn" onClick={() => window.print()}>
                    🖨 {t('Print Statement')}
                </button>
            </div>

            {err && <div className="errors note" style={{ marginBottom: '16px' }}>{err}</div>}

            {loading ? (
                <p className="muted">{t('Calculating financial metrics…')}</p>
            ) : data ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }} data-tour="balancesheet-card">
                    <section className="card">
                        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '14px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#10b981' }}>📊 {t('Assets')}</h2>
                        </div>
                        <table className="grid" style={{ marginBottom: '16px' }}>
                            <tbody>
                                <tr>
                                    <td><strong>{t('Cash & Bank Balances')}</strong></td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(data.cash_cents)}</td>
                                </tr>
                                <tr>
                                    <td><strong>{t('Inventory Valuation (Cost)')}</strong></td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(data.inventory_cents)}</td>
                                </tr>
                                <tr>
                                    <td><strong>{t('Accounts Receivable (Sales Due)')}</strong></td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(data.sales_due_cents)}</td>
                                </tr>
                                <tr style={{ background: 'var(--bg)', borderTop: '2px solid var(--border)' }}>
                                    <td><strong style={{ fontSize: '15px' }}>{t('Total Assets')}</strong></td>
                                    <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '16px', color: '#10b981' }}>
                                        {money(data.total_assets_cents)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    <section className="card">
                        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '14px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ef4444' }}>📉 {t('Liabilities & Equity')}</h2>
                        </div>
                        <table className="grid" style={{ marginBottom: '16px' }}>
                            <tbody>
                                <tr>
                                    <td><strong>{t('Accounts Payable (Purchase Due)')}</strong></td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(data.purchase_due_cents)}</td>
                                </tr>
                                <tr style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
                                    <td><strong>{t('Total Liabilities')}</strong></td>
                                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#ef4444' }}>{money(data.total_liabilities_cents)}</td>
                                </tr>
                                <tr>
                                    <td><strong>{t('Net Owner Equity (Assets − Liabilities)')}</strong></td>
                                    <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '16px', color: '#2563eb' }}>
                                        {money(data.net_equity_cents)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </section>
                </div>
            ) : null}
        </div>
    );
}

export function TransactionsPage() {
    const t = useT();
    const [transactions, setTransactions] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [totalDebit, setTotalDebit] = useState(0);
    const [totalCredit, setTotalCredit] = useState(0);
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState(null);
    const [q, setQ] = useState('');
    const [accountId, setAccountId] = useState('');
    const [direction, setDirection] = useState('');
    const [loading, setLoading] = useState(true);

    function loadData() {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page) });
        if (q) params.set('q', q);
        if (accountId) params.set('account_id', accountId);
        if (direction) params.set('direction', direction);

        api(`/account/transactions?${params.toString()}`)
            .then((res) => {
                setTransactions(res.transactions || []);
                setAccounts(res.accounts || []);
                setTotalDebit(res.total_debit_cents || 0);
                setTotalCredit(res.total_credit_cents || 0);
                setMeta(res.meta || null);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }

    useEffect(() => { loadData(); }, [page, accountId, direction]);

    return (
        <div>
            <div className="page-title">
                <div>
                    <h1>{t('Account Transactions & Ledger')}</h1>
                    <div className="crumbs">{t('Full audit trail of all financial inflows and outflows')}</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div className="card" style={{ padding: '16px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>📥 {t('Total Inflow (Debit)')}</span>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981', marginTop: '6px' }}>+{money(totalDebit)}</div>
                </div>
                <div className="card" style={{ padding: '16px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>📤 {t('Total Outflow (Credit)')}</span>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#ef4444', marginTop: '6px' }}>-{money(totalCredit)}</div>
                </div>
                <div className="card" style={{ padding: '16px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>⚖ {t('Net Movement')}</span>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: totalDebit - totalCredit >= 0 ? '#10b981' : '#ef4444', marginTop: '6px' }}>
                        {money(totalDebit - totalCredit)}
                    </div>
                </div>
            </div>

            <section className="card" style={{ marginBottom: '16px', padding: '16px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    <input
                        style={{ flex: 1, minWidth: '200px' }}
                        placeholder={t('Search description, reference...')}
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && loadData()}
                    />
                    <select value={accountId} onChange={(e) => { setAccountId(e.target.value); setPage(1); }}>
                        <option value="">{t('All Accounts')}</option>
                        {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <select value={direction} onChange={(e) => { setDirection(e.target.value); setPage(1); }}>
                        <option value="">{t('All Directions')}</option>
                        <option value="debit">{t('Inflow (Debit)')}</option>
                        <option value="credit">{t('Outflow (Credit)')}</option>
                    </select>
                    <button type="button" className="btn primary" onClick={loadData}>{t('Filter')}</button>
                </div>
            </section>

            <section className="card" data-tour="transactions-table">
                <table className="grid">
                    <thead>
                        <tr>
                            <th>{t('Date')}</th>
                            <th>{t('Account')}</th>
                            <th>{t('Description')}</th>
                            <th>{t('Direction')}</th>
                            <th style={{ textAlign: 'right' }}>{t('Amount')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map((tx) => (
                            <tr key={tx.id}>
                                <td>{tx.transacted_on}</td>
                                <td><strong>{tx.account}</strong></td>
                                <td>{tx.description}</td>
                                <td>
                                    <span className={`badge ${tx.direction === 'debit' ? 'success' : 'danger'}`}>
                                        {tx.direction === 'debit' ? 'Inflow (Debit)' : 'Outflow (Credit)'}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: tx.direction === 'debit' ? '#10b981' : '#ef4444' }}>
                                    {tx.direction === 'debit' ? '+' : '-'}{money(tx.amount_cents)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {loading && <p className="muted" style={{ padding: '16px' }}>{t('Loading transactions…')}</p>}
                {!loading && transactions.length === 0 && <p className="empty">{t('No transactions found.')}</p>}
                {meta && meta.last_page > 1 && (
                    <div className="actions" style={{ padding: '12px 16px' }}>
                        <button type="button" className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('Previous')}</button>
                        <span className="muted" style={{ alignSelf: 'center', fontSize: '13px' }}>Page {page} of {meta.last_page}</span>
                        <button type="button" className="btn" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>{t('Next')}</button>
                    </div>
                )}
            </section>
        </div>
    );
}

export function ExpensesPage() {
    const t = useT();
    const [expenses, setExpenses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [categoryId, setCategoryId] = useState('');
    const [accountId, setAccountId] = useState('');
    const [amount, setAmount] = useState('');
    const [spentOn, setSpentOn] = useState(new Date().toISOString().slice(0, 10));
    const [note, setNote] = useState('');
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState(null);
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');

    function loadExpenses() {
        setLoading(true);
        api(`/expense?page=${page}`)
            .then((res) => {
                setExpenses(res.expenses || []);
                setCategories(res.categories || []);
                setAccounts(res.accounts || []);
                setMeta(res.meta || null);
                if (res.categories?.length && !categoryId) setCategoryId(String(res.categories[0].id));
                if (res.accounts?.length && !accountId) setAccountId(String(res.accounts[0].id));
            })
            .catch((e) => setErr(e.message))
            .finally(() => setLoading(false));
    }

    useEffect(() => { loadExpenses(); }, [page]);

    async function handleCreate(e) {
        e.preventDefault();
        setMsg('');
        setErr('');
        try {
            await api('/expense', {
                method: 'POST',
                body: {
                    expense_category_id: parseInt(categoryId),
                    account_id: parseInt(accountId),
                    amount: parseFloat(amount),
                    spent_on: spentOn,
                    note,
                },
            });
            setShowModal(false);
            setAmount('');
            setNote('');
            setMsg(t('Expense recorded successfully.'));
            loadExpenses();
        } catch (e) {
            setErr(e.message || t('Failed to save expense.'));
        }
    }

    async function handleDelete(id) {
        if (!window.confirm(t('Are you sure you want to delete this expense? Account balance will be restored.'))) return;
        try {
            await api(`/expense/${id}`, { method: 'DELETE' });
            setMsg(t('Expense deleted.'));
            loadExpenses();
        } catch (e) {
            setErr(e.message || t('Failed to delete expense.'));
        }
    }

    return (
        <div>
            <div className="page-title">
                <div>
                    <h1>{t('Expenses')}</h1>
                    <div className="crumbs">{t('Track everyday business expenses and overheads')}</div>
                </div>
                <button type="button" className="btn primary" onClick={() => setShowModal(true)}>
                    + {t('Add Expense')}
                </button>
            </div>

            {msg && <div className="flash note" style={{ marginBottom: '16px' }}>{msg}<button type="button" onClick={() => setMsg('')}>×</button></div>}
            {err && <div className="errors note" style={{ marginBottom: '16px' }}>{err}</div>}

            <section className="card" data-tour="expenses-table">
                <table className="grid">
                    <thead>
                        <tr>
                            <th>{t('Date')}</th>
                            <th>{t('Category')}</th>
                            <th>{t('Paid From')}</th>
                            <th style={{ textAlign: 'right' }}>{t('Amount')}</th>
                            <th>{t('Note')}</th>
                            <th style={{ textAlign: 'right' }}>{t('Actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {expenses.map((exp) => (
                            <tr key={exp.id}>
                                <td>{exp.spent_on}</td>
                                <td><span className="badge">{exp.category}</span></td>
                                <td>{exp.account}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>
                                    {money(exp.amount_cents)}
                                </td>
                                <td>{exp.note || '—'}</td>
                                <td style={{ textAlign: 'right' }}>
                                    <button type="button" className="icon-btn" onClick={() => handleDelete(exp.id)} title={t('Delete')}>🗑</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {loading && <p className="muted" style={{ padding: '16px' }}>{t('Loading expenses…')}</p>}
                {!loading && expenses.length === 0 && <p className="empty">{t('No expenses recorded yet.')}</p>}
                {meta && meta.last_page > 1 && (
                    <div className="actions" style={{ padding: '12px 16px' }}>
                        <button type="button" className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('Previous')}</button>
                        <span className="muted" style={{ alignSelf: 'center', fontSize: '13px' }}>Page {page} of {meta.last_page}</span>
                        <button type="button" className="btn" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>{t('Next')}</button>
                    </div>
                )}
            </section>

            {showModal && (
                <div className="modal-backdrop" onClick={() => setShowModal(false)}>
                    <div className="modal card" style={{ maxWidth: '480px', margin: '40px auto' }} onClick={(e) => e.stopPropagation()}>
                        <h2>{t('Record New Expense')}</h2>
                        <form onSubmit={handleCreate}>
                            <div className="field">
                                <label>{t('Expense Category')}</label>
                                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="field">
                                <label>{t('Payment Account')}</label>
                                <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
                                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                            <div className="field">
                                <label>{t('Amount')}</label>
                                <input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="0.00" />
                            </div>
                            <div className="field">
                                <label>{t('Date')}</label>
                                <input type="date" value={spentOn} onChange={(e) => setSpentOn(e.target.value)} required />
                            </div>
                            <div className="field">
                                <label>{t('Note / Description')}</label>
                                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Utility bill" />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                                <button type="button" className="btn" onClick={() => setShowModal(false)}>{t('Cancel')}</button>
                                <button type="submit" className="btn primary">{t('Save Expense')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
