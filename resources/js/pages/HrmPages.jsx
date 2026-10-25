import { useEffect, useState } from 'react';
import { api, money } from '../api';
import { useT } from '../i18n';
import { Modal, ConfirmModal, PrimaryButton, SecondaryButton, Pagination, SearchInput } from '../components/ui';
import { useUrlQueryState } from '../hooks/useUrlQueryState';

export function AttendancePage() {
    const t = useT();
    const {
        params,
        setQuery,
        setPage,
        setPerPage,
        resetFilters,
    } = useUrlQueryState({
        search: '',
        employee_id: '',
        status: '',
        page: 1,
        per_page: 15,
    });

    const [rows, setRows] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [targetEmp, setTargetEmp] = useState('');
    const [attendedOn, setAttendedOn] = useState(new Date().toISOString().slice(0, 10));
    const [attStatus, setAttStatus] = useState('present');
    const [checkIn, setCheckIn] = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');
    const [modalErr, setModalErr] = useState('');

    function loadData() {
        setLoading(true);
        const qp = new URLSearchParams({ page: String(params.page) });
        if (params.search) qp.set('search', params.search);
        if (params.employee_id) qp.set('employee_id', params.employee_id);
        if (params.status) qp.set('status', params.status);
        if (params.per_page) qp.set('per_page', params.per_page);

        api(`/attendance?${qp.toString()}`)
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

    useEffect(() => {
        loadData();
    }, [params.page, params.per_page, params.search, params.employee_id, params.status]);

    function openAddModal() {
        setEditingRecord(null);
        setModalErr('');
        setAttendedOn(new Date().toISOString().slice(0, 10));
        setAttStatus('present');
        setCheckIn('');
        setCheckOut('');
        if (employees.length && !targetEmp) {
            setTargetEmp(String(employees[0].id));
        }
        setShowModal(true);
    }

    function openEditModal(record) {
        setEditingRecord(record);
        setModalErr('');
        setTargetEmp(String(record.employee_id));
        setAttendedOn(record.attended_on || new Date().toISOString().slice(0, 10));
        setAttStatus(record.status || 'present');
        setCheckIn(record.check_in || '');
        setCheckOut(record.check_out || '');
        setShowModal(true);
    }

    async function handleSave(e) {
        e.preventDefault();
        setMsg('');
        setModalErr('');
        const empId = parseInt(targetEmp || (employees[0] ? employees[0].id : 0), 10);
        if (!empId) {
            setModalErr(t('Please select an employee.'));
            return;
        }

        setIsSaving(true);
        try {
            await api('/attendance', {
                method: 'POST',
                body: {
                    employee_id: empId,
                    attended_on: attendedOn,
                    status: attStatus,
                    check_in: checkIn || null,
                    check_out: checkOut || null,
                },
            });
            setShowModal(false);
            setMsg(editingRecord ? t('Attendance record updated successfully.') : t('Attendance record saved successfully.'));
            loadData();
        } catch (e) {
            setModalErr(e.message || t('Failed to save attendance.'));
        } finally {
            setIsSaving(false);
        }
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await api(`/attendance/${deleteTarget.id}`, { method: 'DELETE' });
            setMsg(t('Attendance record deleted.'));
            setDeleteTarget(null);
            loadData();
        } catch (e) {
            setErr(e.message || t('Failed to delete attendance.'));
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <div>
            <div className="page-title">
                <div>
                    <h1>{t('Attendance')}</h1>
                    <div className="crumbs">{t('Staff daily check-ins, leaves, and attendance logs')}</div>
                </div>
                <button type="button" className="btn primary" onClick={openAddModal}>
                    + {t('Add Attendance')}
                </button>
            </div>

            {msg && <div className="flash note" style={{ marginBottom: '16px' }}>{msg}<button type="button" onClick={() => setMsg('')}>×</button></div>}
            {err && <div className="errors note" style={{ marginBottom: '16px' }}>{err}</div>}

            <section className="card" style={{ marginBottom: '16px', padding: '16px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                    <SearchInput
                        value={params.search}
                        placeholder={t('Search employee...')}
                        onChange={(e) => setQuery({ search: e.target.value })}
                        onClear={() => setQuery({ search: '' })}
                        style={{ flex: 1, minWidth: '200px' }}
                    />
                    <select value={params.employee_id} onChange={(e) => setQuery({ employee_id: e.target.value })}>
                        <option value="">{t('All Employees')}</option>
                        {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                    <select value={params.status} onChange={(e) => setQuery({ status: e.target.value })}>
                        <option value="">{t('All Statuses')}</option>
                        <option value="present">{t('Present')}</option>
                        <option value="absent">{t('Absent')}</option>
                        <option value="leave">{t('Leave')}</option>
                    </select>
                    {(params.search || params.employee_id || params.status) && (
                        <button type="button" className="btn" onClick={() => resetFilters()}>
                            {t('Reset')}
                        </button>
                    )}
                </div>
            </section>

            <section className="card" data-tour="attendance-card">
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
                                <td style={{ textAlign: 'right', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                    <button
                                        type="button"
                                        className="icon-btn"
                                        onClick={() => openEditModal(r)}
                                        title={t('Edit Attendance')}
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        type="button"
                                        className="icon-btn"
                                        onClick={() => setDeleteTarget(r)}
                                        title={t('Delete Attendance')}
                                    >
                                        🗑
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {loading && <p className="muted" style={{ padding: '16px' }}>{t('Loading attendance…')}</p>}
                {!loading && rows.length === 0 && <p className="empty">{t('No attendance records found.')}</p>}
                <Pagination
                    currentPage={meta?.current_page || params.page}
                    lastPage={meta?.last_page || 1}
                    total={meta?.total || 0}
                    from={meta?.from || 0}
                    to={meta?.to || 0}
                    perPage={params.per_page}
                    onPageChange={setPage}
                    onPerPageChange={setPerPage}
                    perPageOptions={[10, 15, 25, 50]}
                />
            </section>

            {/* Modal: Add or Edit Staff Attendance */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingRecord ? t('Edit Staff Attendance') : t('Record Staff Attendance')}
                subtitle={editingRecord ? t('Update attendance record for staff member.') : t('Log employee daily attendance status.')}
                icon="🕒"
                size="md"
                footer={
                    <>
                        <SecondaryButton type="button" onClick={() => setShowModal(false)}>
                            {t('Cancel')}
                        </SecondaryButton>
                        <PrimaryButton type="submit" form="attendance-modal-form" disabled={isSaving}>
                            {isSaving ? t('Saving...') : (editingRecord ? t('Update Attendance') : t('Save Attendance'))}
                        </PrimaryButton>
                    </>
                }
            >
                {modalErr && (
                    <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                        {modalErr}
                    </div>
                )}
                <form id="attendance-modal-form" onSubmit={handleSave}>
                    <div className="field" style={{ marginBottom: '14px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                            {t('Employee')} *
                        </label>
                        <select
                            value={targetEmp}
                            onChange={(e) => setTargetEmp(e.target.value)}
                            required
                            style={{ width: '100%' }}
                        >
                            {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                        <div className="field">
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                                {t('Date')} *
                            </label>
                            <input
                                type="date"
                                value={attendedOn}
                                onChange={(e) => setAttendedOn(e.target.value)}
                                required
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div className="field">
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                                {t('Status')} *
                            </label>
                            <select
                                value={attStatus}
                                onChange={(e) => setAttStatus(e.target.value)}
                                required
                                style={{ width: '100%' }}
                            >
                                <option value="present">{t('Present')}</option>
                                <option value="absent">{t('Absent')}</option>
                                <option value="leave">{t('Leave')}</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div className="field">
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                                {t('Check In (HH:MM)')}
                            </label>
                            <input
                                type="time"
                                value={checkIn}
                                onChange={(e) => setCheckIn(e.target.value)}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div className="field">
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                                {t('Check Out (HH:MM)')}
                            </label>
                            <input
                                type="time"
                                value={checkOut}
                                onChange={(e) => setCheckOut(e.target.value)}
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Modal: Delete Confirmation */}
            <ConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDelete}
                title={t('Delete Attendance Record')}
                message={t('Are you sure you want to delete the attendance log for {name} on {date}? This action cannot be undone.', {
                    name: deleteTarget?.employee_name || t('this employee'),
                    date: deleteTarget?.attended_on || '',
                })}
                confirmText={t('Delete')}
                cancelText={t('Cancel')}
                variant="danger"
                isLoading={isDeleting}
            />
        </div>
    );
}

export function PayrollsPage() {
    const t = useT();
    const {
        params,
        setQuery,
        setPage,
        setPerPage,
        resetFilters,
    } = useUrlQueryState({
        search: '',
        employee_id: '',
        month: '',
        page: 1,
        per_page: 15,
    });

    const [rows, setRows] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [targetEmp, setTargetEmp] = useState('');
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [amount, setAmount] = useState('');
    const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
    const [note, setNote] = useState('');
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');
    const [modalErr, setModalErr] = useState('');

    function loadData() {
        setLoading(true);
        const qp = new URLSearchParams({ page: String(params.page) });
        if (params.search) qp.set('search', params.search);
        if (params.employee_id) qp.set('employee_id', params.employee_id);
        if (params.month) qp.set('month', params.month);
        if (params.per_page) qp.set('per_page', params.per_page);

        api(`/payrolls?${qp.toString()}`)
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

    useEffect(() => {
        loadData();
    }, [params.page, params.per_page, params.search, params.employee_id, params.month]);

    function onSelectEmployee(empId) {
        setTargetEmp(empId);
        const emp = employees.find((e) => String(e.id) === String(empId));
        if (emp && emp.salary_cents) {
            setAmount(String(emp.salary_cents / 100));
        }
    }

    function openModal() {
        setModalErr('');
        if (employees.length && !targetEmp) {
            setTargetEmp(String(employees[0].id));
            if (employees[0].salary_cents) {
                setAmount(String(employees[0].salary_cents / 100));
            }
        }
        setShowModal(true);
    }

    async function handleSave(e) {
        e.preventDefault();
        setMsg('');
        setModalErr('');
        const empId = parseInt(targetEmp || (employees[0] ? employees[0].id : 0), 10);
        if (!empId) {
            setModalErr(t('Please select an employee.'));
            return;
        }

        setIsSaving(true);
        try {
            await api('/payrolls', {
                method: 'POST',
                body: {
                    employee_id: empId,
                    month,
                    amount: parseFloat(amount),
                    paid_on: paidOn,
                    note,
                },
            });
            setShowModal(false);
            setMsg(t('Payroll recorded and posted to staff salary ledger.'));
            loadData();
        } catch (e) {
            setModalErr(e.message || t('Failed to save payroll.'));
        } finally {
            setIsSaving(false);
        }
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await api(`/payrolls/${deleteTarget.id}`, { method: 'DELETE' });
            setMsg(t('Payroll deleted and ledger reversed.'));
            setDeleteTarget(null);
            loadData();
        } catch (e) {
            setErr(e.message || t('Failed to delete payroll.'));
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <div>
            <div className="page-title">
                <div>
                    <h1>{t('Payrolls')}</h1>
                    <div className="crumbs">{t('Staff salaries, monthly disbursements, and accounting records')}</div>
                </div>
                <button type="button" className="btn primary" onClick={openModal}>
                    + {t('Add Payroll')}
                </button>
            </div>

            {msg && <div className="flash note" style={{ marginBottom: '16px' }}>{msg}<button type="button" onClick={() => setMsg('')}>×</button></div>}
            {err && <div className="errors note" style={{ marginBottom: '16px' }}>{err}</div>}

            <section className="card" style={{ marginBottom: '16px', padding: '16px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                    <SearchInput
                        value={params.search}
                        placeholder={t('Search employee...')}
                        onChange={(e) => setQuery({ search: e.target.value })}
                        onClear={() => setQuery({ search: '' })}
                        style={{ flex: 1, minWidth: '200px' }}
                    />
                    <select value={params.employee_id} onChange={(e) => setQuery({ employee_id: e.target.value })}>
                        <option value="">{t('All Employees')}</option>
                        {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                    <input
                        type="month"
                        value={params.month}
                        onChange={(e) => setQuery({ month: e.target.value })}
                        placeholder="YYYY-MM"
                    />
                    {(params.search || params.employee_id || params.month) && (
                        <button type="button" className="btn" onClick={() => resetFilters()}>
                            {t('Reset')}
                        </button>
                    )}
                </div>
            </section>

            <section className="card" data-tour="payrolls-card">
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
                                    <button
                                        type="button"
                                        className="icon-btn"
                                        onClick={() => setDeleteTarget(p)}
                                        title={t('Delete')}
                                    >
                                        🗑
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {loading && <p className="muted" style={{ padding: '16px' }}>{t('Loading payrolls…')}</p>}
                {!loading && rows.length === 0 && <p className="empty">{t('No payroll records found.')}</p>}
                <Pagination
                    currentPage={meta?.current_page || params.page}
                    lastPage={meta?.last_page || 1}
                    total={meta?.total || 0}
                    from={meta?.from || 0}
                    to={meta?.to || 0}
                    perPage={params.per_page}
                    onPageChange={setPage}
                    onPerPageChange={setPerPage}
                    perPageOptions={[10, 15, 25, 50]}
                />
            </section>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={t('Disburse Staff Salary')}
                subtitle={t('Record staff payroll and disburse funds from business ledger.')}
                icon="💵"
                size="md"
                footer={
                    <>
                        <SecondaryButton type="button" onClick={() => setShowModal(false)}>
                            {t('Cancel')}
                        </SecondaryButton>
                        <PrimaryButton type="submit" form="payroll-modal-form" disabled={isSaving}>
                            {isSaving ? t('Processing...') : t('Record Payment')}
                        </PrimaryButton>
                    </>
                }
            >
                {modalErr && (
                    <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                        {modalErr}
                    </div>
                )}
                <form id="payroll-modal-form" onSubmit={handleSave}>
                    <div className="field" style={{ marginBottom: '14px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                            {t('Employee')} *
                        </label>
                        <select
                            value={targetEmp}
                            onChange={(e) => onSelectEmployee(e.target.value)}
                            required
                            style={{ width: '100%' }}
                        >
                            {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                        <div className="field">
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                                {t('Salary Month')} *
                            </label>
                            <input
                                type="month"
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                                required
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div className="field">
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                                {t('Amount')} *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="1"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>
                    <div className="field" style={{ marginBottom: '14px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                            {t('Payment Date')} *
                        </label>
                        <input
                            type="date"
                            value={paidOn}
                            onChange={(e) => setPaidOn(e.target.value)}
                            required
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="field">
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                            {t('Note')}
                        </label>
                        <input
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="e.g. Bank transfer reference or bonus breakdown"
                            style={{ width: '100%' }}
                        />
                    </div>
                </form>
            </Modal>

            {/* Modal: Delete Confirmation */}
            <ConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDelete}
                title={t('Delete Payroll Entry')}
                message={t('Are you sure you want to delete the payroll record for {name} ({month})? The corresponding ledger transaction will be reversed.', {
                    name: deleteTarget?.employee_name || t('this employee'),
                    month: deleteTarget?.month || '',
                })}
                confirmText={t('Delete & Reverse')}
                cancelText={t('Cancel')}
                variant="danger"
                isLoading={isDeleting}
            />
        </div>
    );
}
