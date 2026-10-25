import { useEffect, useState } from 'react';
import { api, money } from '../api';
import { useT } from '../i18n';

export function AttendancePage() {
    const t = useT();
    const [rows, setRows] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [employeeId, setEmployeeId] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [targetEmp, setTargetEmp] = useState('');
    const [attendedOn, setAttendedOn] = useState(new Date().toISOString().slice(0, 10));
    const [attStatus, setAttStatus] = useState('present');
    const [checkIn, setCheckIn] = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');

    function loadData() {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page) });
        if (employeeId) params.set('employee_id', employeeId);
        if (statusFilter) params.set('status', statusFilter);

        api(`/attendance?${params.toString()}`)
            .then((res) => {
                setRows(res.rows || []);
                setEmployees(res.employees || []);
                setMeta(res.meta || null);
                if (res.employees?.length && !targetEmp) {
                    setTargetEmp(String(res.employees[0].id));
                }
            })
            .catch((e) => setErr(e.message))
            .finally(() => setLoading(false));
    }

    useEffect(() => { loadData(); }, [page, employeeId, statusFilter]);

    async function handleSave(e) {
        e.preventDefault();
        setMsg('');
        setErr('');
        try {
            await api('/attendance', {
                method: 'POST',
                body: {
                    employee_id: parseInt(targetEmp),
                    attended_on: attendedOn,
                    status: attStatus,
                    check_in: checkIn || null,
                    check_out: checkOut || null,
                },
            });
            setShowModal(false);
            setMsg(t('Attendance record saved.'));
            loadData();
        } catch (e) {
            setErr(e.message || t('Failed to save attendance.'));
        }
    }

    async function handleDelete(id) {
        if (!window.confirm(t('Delete this attendance entry?'))) return;
        try {
            await api(`/attendance/${id}`, { method: 'DELETE' });
            setMsg(t('Attendance record deleted.'));
            loadData();
        } catch (e) {
            setErr(e.message || t('Failed to delete attendance.'));
        }
    }

    return (
        <div>
            <div className="page-title">
                <div>
                    <h1>{t('Attendance')}</h1>
                    <div className="crumbs">{t('Staff daily check-ins, leaves, and attendance logs')}</div>
                </div>
                <button type="button" className="btn primary" onClick={() => setShowModal(true)}>
                    + {t('Mark Attendance')}
                </button>
            </div>

            {msg && <div className="flash note" style={{ marginBottom: '16px' }}>{msg}<button type="button" onClick={() => setMsg('')}>×</button></div>}
            {err && <div className="errors note" style={{ marginBottom: '16px' }}>{err}</div>}

            <section className="card" style={{ marginBottom: '16px', padding: '16px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    <select value={employeeId} onChange={(e) => { setEmployeeId(e.target.value); setPage(1); }}>
                        <option value="">{t('All Employees')}</option>
                        {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                    <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                        <option value="">{t('All Statuses')}</option>
                        <option value="present">{t('Present')}</option>
                        <option value="absent">{t('Absent')}</option>
                        <option value="leave">{t('Leave')}</option>
                    </select>
                </div>
            </section>

            <section className="card">
                <table className="grid">
                    <thead>
                        <tr>
                            <th>{t('Date')}</th>
                            <th>{t('Employee')}</th>
                            <th style={{ textAlign: 'center' }}>{t('Status')}</th>
                            <th>{t('Check In')}</th>
                            <th>{t('Check Out')}</th>
                            <th style={{ textAlign: 'right' }}>{t('Actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.id}>
                                <td>{r.attended_on}</td>
                                <td><strong>{r.employee_name || '—'}</strong></td>
                                <td style={{ textAlign: 'center' }}>
                                    <span className={`badge ${r.status === 'present' ? 'success' : r.status === 'absent' ? 'danger' : 'blue'}`}>
                                        {r.status}
                                    </span>
                                </td>
                                <td>{r.check_in || '—'}</td>
                                <td>{r.check_out || '—'}</td>
                                <td style={{ textAlign: 'right' }}>
                                    <button type="button" className="icon-btn" onClick={() => handleDelete(r.id)} title={t('Delete')}>🗑</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {loading && <p className="muted" style={{ padding: '16px' }}>{t('Loading attendance…')}</p>}
                {!loading && rows.length === 0 && <p className="empty">{t('No attendance records found.')}</p>}
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
                        <h2>{t('Record Staff Attendance')}</h2>
                        <form onSubmit={handleSave}>
                            <div className="field">
                                <label>{t('Employee')}</label>
                                <select value={targetEmp} onChange={(e) => setTargetEmp(e.target.value)} required>
                                    {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                                </select>
                            </div>
                            <div className="field">
                                <label>{t('Date')}</label>
                                <input type="date" value={attendedOn} onChange={(e) => setAttendedOn(e.target.value)} required />
                            </div>
                            <div className="field">
                                <label>{t('Status')}</label>
                                <select value={attStatus} onChange={(e) => setAttStatus(e.target.value)} required>
                                    <option value="present">{t('Present')}</option>
                                    <option value="absent">{t('Absent')}</option>
                                    <option value="leave">{t('Leave')}</option>
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="field">
                                    <label>{t('Check In (HH:MM)')}</label>
                                    <input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
                                </div>
                                <div className="field">
                                    <label>{t('Check Out (HH:MM)')}</label>
                                    <input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                                <button type="button" className="btn" onClick={() => setShowModal(false)}>{t('Cancel')}</button>
                                <button type="submit" className="btn primary">{t('Save Attendance')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export function PayrollsPage() {
    const t = useT();
    const [rows, setRows] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [employeeId, setEmployeeId] = useState('');
    const [monthFilter, setMonthFilter] = useState('');
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [targetEmp, setTargetEmp] = useState('');
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [amount, setAmount] = useState('');
    const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
    const [note, setNote] = useState('');
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');

    function loadData() {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page) });
        if (employeeId) params.set('employee_id', employeeId);
        if (monthFilter) params.set('month', monthFilter);

        api(`/payrolls?${params.toString()}`)
            .then((res) => {
                setRows(res.rows || []);
                setEmployees(res.employees || []);
                setMeta(res.meta || null);
                if (res.employees?.length && !targetEmp) {
                    setTargetEmp(String(res.employees[0].id));
                    if (res.employees[0].salary_cents) {
                        setAmount(String(res.employees[0].salary_cents / 100));
                    }
                }
            })
            .catch((e) => setErr(e.message))
            .finally(() => setLoading(false));
    }

    useEffect(() => { loadData(); }, [page, employeeId, monthFilter]);

    function onSelectEmployee(empId) {
        setTargetEmp(empId);
        const emp = employees.find((e) => String(e.id) === String(empId));
        if (emp && emp.salary_cents) {
            setAmount(String(emp.salary_cents / 100));
        }
    }

    async function handleSave(e) {
        e.preventDefault();
        setMsg('');
        setErr('');
        try {
            await api('/payrolls', {
                method: 'POST',
                body: {
                    employee_id: parseInt(targetEmp),
                    month,
                    amount: parseFloat(amount),
                    paid_on: paidOn,
                    note,
                },
            });
            setShowModal(false);
            setMsg(t('Payroll recorded. It is posted to staff salary ledger.'));
            loadData();
        } catch (e) {
            setErr(e.message || t('Failed to save payroll.'));
        }
    }

    async function handleDelete(id) {
        if (!window.confirm(t('Delete this payroll entry? Ledger entry will be reversed.'))) return;
        try {
            await api(`/payrolls/${id}`, { method: 'DELETE' });
            setMsg(t('Payroll deleted and ledger reversed.'));
            loadData();
        } catch (e) {
            setErr(e.message || t('Failed to delete payroll.'));
        }
    }

    return (
        <div>
            <div className="page-title">
                <div>
                    <h1>{t('Payrolls')}</h1>
                    <div className="crumbs">{t('Staff salaries, monthly disbursements, and accounting records')}</div>
                </div>
                <button type="button" className="btn primary" onClick={() => setShowModal(true)}>
                    + {t('Record Payroll')}
                </button>
            </div>

            {msg && <div className="flash note" style={{ marginBottom: '16px' }}>{msg}<button type="button" onClick={() => setMsg('')}>×</button></div>}
            {err && <div className="errors note" style={{ marginBottom: '16px' }}>{err}</div>}

            <section className="card" style={{ marginBottom: '16px', padding: '16px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    <select value={employeeId} onChange={(e) => { setEmployeeId(e.target.value); setPage(1); }}>
                        <option value="">{t('All Employees')}</option>
                        {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                    <input
                        type="month"
                        value={monthFilter}
                        onChange={(e) => { setMonthFilter(e.target.value); setPage(1); }}
                        placeholder="YYYY-MM"
                    />
                </div>
            </section>

            <section className="card">
                <table className="grid">
                    <thead>
                        <tr>
                            <th>{t('Month')}</th>
                            <th>{t('Employee')}</th>
                            <th style={{ textAlign: 'right' }}>{t('Salary Paid')}</th>
                            <th>{t('Disbursed On')}</th>
                            <th>{t('Remarks')}</th>
                            <th style={{ textAlign: 'right' }}>{t('Actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((p) => (
                            <tr key={p.id}>
                                <td><strong>{p.month}</strong></td>
                                <td>{p.employee_name || '—'}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                                    {money(p.amount_cents)}
                                </td>
                                <td>{p.paid_on}</td>
                                <td>{p.note || '—'}</td>
                                <td style={{ textAlign: 'right' }}>
                                    <button type="button" className="icon-btn" onClick={() => handleDelete(p.id)} title={t('Delete')}>🗑</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {loading && <p className="muted" style={{ padding: '16px' }}>{t('Loading payrolls…')}</p>}
                {!loading && rows.length === 0 && <p className="empty">{t('No payroll records found.')}</p>}
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
                        <h2>{t('Disburse Staff Salary')}</h2>
                        <form onSubmit={handleSave}>
                            <div className="field">
                                <label>{t('Employee')}</label>
                                <select value={targetEmp} onChange={(e) => onSelectEmployee(e.target.value)} required>
                                    {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                                </select>
                            </div>
                            <div className="field">
                                <label>{t('Salary Month')}</label>
                                <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} required />
                            </div>
                            <div className="field">
                                <label>{t('Amount')}</label>
                                <input type="number" step="0.01" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                            </div>
                            <div className="field">
                                <label>{t('Payment Date')}</label>
                                <input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} required />
                            </div>
                            <div className="field">
                                <label>{t('Note')}</label>
                                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Bank transfer reference" />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                                <button type="button" className="btn" onClick={() => setShowModal(false)}>{t('Cancel')}</button>
                                <button type="submit" className="btn primary">{t('Record Payment')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
