import { useState } from 'react';
import { Link } from 'react-router-dom';
import { money } from '../api';
import { useGetInstallmentsQuery, usePayInstallmentMutation } from '../services/bornoposApi';
import { Pagination, SearchInput, Modal, PrimaryButton, SecondaryButton } from '../components/ui';
import { useUrlQueryState } from '../hooks/useUrlQueryState';

export default function Installments() {
    const { queryState, setQuery, setPage, setPerPage } = useUrlQueryState({
        search: '',
        status: '',
        page: 1,
        per_page: 15,
    });

    const { data, isFetching, isError, refetch } = useGetInstallmentsQuery({
        search: queryState.search,
        status: queryState.status,
        page: queryState.page,
        per_page: queryState.per_page,
    });

    const [payInstallment, { isLoading: isPaying }] = usePayInstallmentMutation();

    const [payingTarget, setPayingTarget] = useState(null);
    const [payAmount, setPayAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [msg, setMsg] = useState('');
    const [modalErr, setModalErr] = useState('');

    function openPayModal(row) {
        setPayingTarget(row);
        setPayAmount((row.due_cents / 100).toFixed(2));
        setPaymentMethod('Cash');
        setModalErr('');
    }

    async function handlePayment(e) {
        e.preventDefault();
        if (!payingTarget) return;
        setModalErr('');
        try {
            const res = await payInstallment({
                id: payingTarget.id,
                body: {
                    amount: parseFloat(payAmount),
                    payment_method: paymentMethod,
                },
            }).unwrap();
            setPayingTarget(null);
            setMsg(res.message || 'Installment payment recorded successfully.');
            refetch();
        } catch (err) {
            setModalErr(err.data?.message || err.message || 'Failed to record installment payment.');
        }
    }

    return (
        <>
            <div className="page-title" style={{ flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1>Installments</h1>
                    <div className="crumbs">Outstanding payment schedules. BornoPos records the plan and the payments. It does not approve credit or send money to a bank.</div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                        value={queryState.status}
                        onChange={(e) => setQuery({ status: e.target.value, page: 1 })}
                        style={{ height: '38px', borderRadius: '8px', padding: '0 10px', borderColor: 'var(--border)' }}
                    >
                        <option value="">Pending / Due (Active)</option>
                        <option value="pending">Pending</option>
                        <option value="due">Due</option>
                        <option value="overdue">Overdue</option>
                        <option value="paid">Paid</option>
                        <option value="all">All Statuses</option>
                    </select>
                    <SearchInput
                        value={queryState.search}
                        onChange={(val) => setQuery({ search: val, page: 1 })}
                        placeholder="Search customer or invoice..."
                        style={{ width: '240px' }}
                    />
                </div>
            </div>

            {msg && (
                <div className="flash note" style={{ marginBottom: '16px' }}>
                    {msg}
                    <button type="button" onClick={() => setMsg('')}>×</button>
                </div>
            )}

            <section className="card">
                {isError && <p className="error">The installment report could not be loaded.</p>}
                <table className="grid">
                    <thead>
                        <tr>
                            <th>Invoice</th>
                            <th>Customer</th>
                            <th>Due</th>
                            <th style={{ textAlign: 'right' }}>Amount</th>
                            <th style={{ textAlign: 'right' }}>Paid</th>
                            <th style={{ textAlign: 'right' }}>Balance</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data?.data || []).map((row) => (
                            <tr key={row.id}>
                                <td>{row.sale_id ? <Link to={`/sales/${row.sale_id}`}>{row.invoice_no}</Link> : row.invoice_no}</td>
                                <td>{row.customer}</td>
                                <td>{row.due_on}</td>
                                <td style={{ textAlign: 'right' }}>{money(row.amount_cents)}</td>
                                <td style={{ textAlign: 'right', color: '#10b981' }}>{money(row.paid_cents)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: row.due_cents > 0 ? '#ef4444' : 'var(--muted)' }}>{money(row.due_cents)}</td>
                                <td><span className="badge">{row.status}</span>{row.sequence ? ` · #${row.sequence}` : ''}</td>
                                <td style={{ textAlign: 'right' }}>
                                    {row.status !== 'paid' && row.due_cents > 0 && (
                                        <button
                                            type="button"
                                            className="btn primary small"
                                            style={{ fontSize: '12px', padding: '4px 10px' }}
                                            onClick={() => openPayModal(row)}
                                        >
                                            Collect
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {isFetching && <p className="muted" style={{ padding: '16px' }}>Loading installments...</p>}
                {!isFetching && !(data?.data || []).length && <p className="empty" style={{ padding: '24px' }}>No installments found matching criteria.</p>}
                {data?.meta && (
                    <Pagination
                        meta={data.meta}
                        page={queryState.page}
                        perPage={queryState.per_page}
                        onPageChange={setPage}
                        onPerPageChange={setPerPage}
                    />
                )}
            </section>

            {/* Modal: Pay Installment */}
            <Modal
                isOpen={!!payingTarget}
                onClose={() => setPayingTarget(null)}
                title="Record Installment Payment"
                subtitle={payingTarget ? `Invoice: ${payingTarget.invoice_no} • Customer: ${payingTarget.customer}` : ''}
                icon="💳"
                size="sm"
                footer={
                    <>
                        <SecondaryButton type="button" onClick={() => setPayingTarget(null)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton type="submit" form="pay-installment-form" disabled={isPaying}>
                            {isPaying ? 'Recording...' : 'Save Payment'}
                        </PrimaryButton>
                    </>
                }
            >
                {modalErr && (
                    <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                        {modalErr}
                    </div>
                )}
                <form id="pay-installment-form" onSubmit={handlePayment}>
                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>Remaining Due:</span>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#ef4444' }}>
                            {payingTarget ? money(payingTarget.due_cents) : ''}
                        </span>
                    </div>
                    <div className="field" style={{ marginBottom: '14px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                            Payment Amount *
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="1"
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                            required
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="field">
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                            Payment Method *
                        </label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            style={{ width: '100%' }}
                        >
                            <option value="Cash">Cash</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="bKash">bKash</option>
                            <option value="Nagad">Nagad</option>
                            <option value="Rocket">Rocket</option>
                            <option value="Card">Card</option>
                            <option value="Cheque">Cheque</option>
                        </select>
                    </div>
                </form>
            </Modal>
        </>
    );
}
