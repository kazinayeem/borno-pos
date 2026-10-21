import { Link } from 'react-router-dom';
import { money } from '../api';
import { useGetInstallmentsQuery } from '../services/bornoposApi';

export default function Installments() {
    const { data, isFetching, isError } = useGetInstallmentsQuery();

    return (
        <>
            <div className="page-title">
                <div>
                    <h1>Installments</h1>
                    <div className="crumbs">Outstanding payment schedules. BornoPos records the plan and the payments. It does not approve credit or send money to a bank.</div>
                </div>
            </div>
            <section className="card">
                {isError && <p className="error">The installment report could not be loaded.</p>}
                <table className="grid">
                    <thead><tr><th>Invoice</th><th>Customer</th><th>Due</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
                    <tbody>
                        {(data?.data || []).map((row) => (
                            <tr key={row.id}>
                                <td>{row.sale_id ? <Link to={`/sales/${row.sale_id}`}>{row.invoice_no}</Link> : row.invoice_no}</td>
                                <td>{row.customer}</td>
                                <td>{row.due_on}</td>
                                <td>{money(row.amount_cents)}</td>
                                <td>{money(row.paid_cents)}</td>
                                <td>{money(row.due_cents)}</td>
                                <td>{row.status}{row.sequence ? ` · #${row.sequence}` : ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {isFetching && <p className="muted">Loading</p>}
                {!isFetching && !(data?.data || []).length && <p className="empty">No outstanding installments.</p>}
            </section>
        </>
    );
}
