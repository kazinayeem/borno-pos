import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { api } from '../api';
import { useT } from '../i18n';
import { useUrlQueryState } from '../hooks/useUrlQueryState';
import { Pagination, SearchInput, Modal, ConfirmModal } from '../components/ui';

export default function StaffManagement() {
    const t = useT();
    const currentUser = useSelector((state) => state.session.user);

    const {
        params,
        setQuery,
        setPage,
        setPerPage,
        resetFilters,
    } = useUrlQueryState({
        search: '',
        role_id: '',
        status: '',
        sort: 'latest',
        page: 1,
        per_page: 15,
    });

    const [staff, setStaff] = useState([]);
    const [roles, setRoles] = useState([]);
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [loading, setLoading] = useState(true);

    const [alertMessage, setAlertMessage] = useState({ type: '', text: '' });

    // Modals state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [activeStaff, setActiveStaff] = useState(null);

    // Form inputs
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        username: '',
        phone: '',
        password: '',
        role_id: '',
        is_active: true,
    });
    const [passwordData, setPasswordData] = useState({
        password: '',
        password_confirmation: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const isOwnerOrAdmin = currentUser?.role === 'owner' || currentUser?.role === 'super_admin' || currentUser?.role === 'admin';
    const canCreate = isOwnerOrAdmin || currentUser?.permissions?.includes('staff.create');
    const canEdit = isOwnerOrAdmin || currentUser?.permissions?.includes('staff.edit');
    const canDelete = isOwnerOrAdmin || currentUser?.permissions?.includes('staff.delete');

    async function loadStaff() {
        setLoading(true);
        try {
            const qp = new URLSearchParams({
                page: String(params.page),
                sort: params.sort,
            });
            if (params.search) qp.set('search', params.search);
            if (params.role_id) qp.set('role_id', params.role_id);
            if (params.status) qp.set('status', params.status);
            if (params.per_page) qp.set('per_page', params.per_page);

            const res = await api(`/api/staff?${qp.toString()}`);
            setStaff(res.staff || res.data || []);
            setRoles(res.roles || []);
            setMeta(res.meta || { current_page: 1, last_page: 1, total: 0 });
        } catch (err) {
            setAlertMessage({ type: 'error', text: err.payload?.message || 'Failed to load staff records.' });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadStaff();
    }, [params.page, params.per_page, params.search, params.role_id, params.status, params.sort]);

    function openCreate() {
        setFormData({
            name: '',
            email: '',
            username: '',
            phone: '',
            password: '',
            role_id: roles[0]?.id || '',
            is_active: true,
        });
        setFormErrors({});
        setShowCreateModal(true);
    }

    function openEdit(member) {
        setActiveStaff(member);
        setFormData({
            name: member.name || '',
            email: member.email || '',
            username: member.username || '',
            phone: member.phone || '',
            password: '',
            role_id: member.role_id || '',
            is_active: !!member.is_active,
        });
        setFormErrors({});
        setShowEditModal(true);
    }

    function openPasswordReset(member) {
        setActiveStaff(member);
        setPasswordData({ password: '', password_confirmation: '' });
        setFormErrors({});
        setShowPasswordModal(true);
    }

    function openDelete(member) {
        setActiveStaff(member);
        setShowDeleteModal(true);
    }

    async function handleCreate(e) {
        e.preventDefault();
        setSubmitting(true);
        setFormErrors({});
        try {
            await api('/api/staff', { method: 'POST', body: formData });
            setShowCreateModal(false);
            setAlertMessage({ type: 'success', text: 'Staff member created successfully.' });
            loadStaff(1);
        } catch (err) {
            setFormErrors(err.payload?.errors || {});
            setAlertMessage({ type: 'error', text: err.payload?.message || 'Failed to create staff member.' });
        } finally {
            setSubmitting(false);
        }
    }

    async function handleUpdate(e) {
        e.preventDefault();
        if (!activeStaff) return;
        setSubmitting(true);
        setFormErrors({});
        try {
            await api(`/api/staff/${activeStaff.id}`, { method: 'PUT', body: formData });
            setShowEditModal(false);
            setAlertMessage({ type: 'success', text: 'Staff member updated successfully.' });
            loadStaff();
        } catch (err) {
            setFormErrors(err.payload?.errors || {});
            setAlertMessage({ type: 'error', text: err.payload?.message || 'Failed to update staff member.' });
        } finally {
            setSubmitting(false);
        }
    }

    async function handleToggleStatus(member) {
        try {
            const res = await api(`/api/staff/${member.id}/toggle-status`, { method: 'POST' });
            setAlertMessage({ type: 'success', text: res.message || 'Status updated.' });
            setStaff((prev) => prev.map((item) => (item.id === member.id ? { ...item, is_active: res.is_active } : item)));
        } catch (err) {
            setAlertMessage({ type: 'error', text: err.payload?.message || 'Failed to toggle status.' });
        }
    }

    async function handlePasswordReset(e) {
        e.preventDefault();
        if (!activeStaff) return;
        setSubmitting(true);
        setFormErrors({});
        try {
            await api(`/api/staff/${activeStaff.id}/password`, { method: 'POST', body: passwordData });
            setShowPasswordModal(false);
            setAlertMessage({ type: 'success', text: 'Password reset successfully.' });
        } catch (err) {
            setFormErrors(err.payload?.errors || {});
            setAlertMessage({ type: 'error', text: err.payload?.message || 'Failed to reset password.' });
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete() {
        if (!activeStaff) return;
        setSubmitting(true);
        try {
            await api(`/api/staff/${activeStaff.id}`, { method: 'DELETE' });
            setShowDeleteModal(false);
            setAlertMessage({ type: 'success', text: 'Staff member deleted.' });
            loadStaff();
        } catch (err) {
            setAlertMessage({ type: 'error', text: err.payload?.message || 'Failed to delete staff member.' });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <section className="card staff-page">
            <div className="section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '22px' }}>{t('Staff Management')}</h1>
                    <p className="muted" style={{ margin: '4px 0 0', fontSize: '13px' }}>
                        {t('Manage staff members, roles, credentials, and access statuses for your store.')}
                    </p>
                </div>
                {canCreate && (
                    <button type="button" className="btn primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>+</span> {t('Add Staff Member')}
                    </button>
                )}
            </div>

            {alertMessage.text && (
                <div className={`flash ${alertMessage.type === 'error' ? 'error' : 'note'}`} style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{alertMessage.text}</span>
                    <button type="button" onClick={() => setAlertMessage({ type: '', text: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✕</button>
                </div>
            )}

            {/* Filter and Search Bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
                <SearchInput
                    value={params.search}
                    onChange={(e) => setQuery({ search: e.target.value })}
                    onClear={() => setQuery({ search: '' })}
                    placeholder={t('Search by name, email, username, phone...')}
                    style={{ flex: '1 1 240px', minWidth: '220px' }}
                />

                <select
                    value={params.role_id}
                    onChange={(e) => setQuery({ role_id: e.target.value })}
                    style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--text)' }}
                >
                    <option value="">{t('All Roles')}</option>
                    {roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                </select>

                <select
                    value={params.status}
                    onChange={(e) => setQuery({ status: e.target.value })}
                    style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--text)' }}
                >
                    <option value="">{t('All Statuses')}</option>
                    <option value="active">{t('Active')}</option>
                    <option value="inactive">{t('Inactive')}</option>
                </select>

                <select
                    value={params.sort}
                    onChange={(e) => setQuery({ sort: e.target.value })}
                    style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--text)' }}
                >
                    <option value="latest">{t('Newest First')}</option>
                    <option value="name_asc">{t('Name (A-Z)')}</option>
                    <option value="name_desc">{t('Name (Z-A)')}</option>
                </select>

                {(params.search || params.role_id || params.status || params.sort !== 'latest') && (
                    <button type="button" className="btn" onClick={() => resetFilters()}>
                        {t('Reset')}
                    </button>
                )}
            </div>

            {/* Staff Table */}
            <div className="table-responsive" style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: '10px' }} data-tour="staff-table">
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--line)' }}>
                            <th style={{ padding: '12px' }}>{t('Staff Member')}</th>
                            <th style={{ padding: '12px' }}>{t('Contact')}</th>
                            <th style={{ padding: '12px' }}>{t('Assigned Role')}</th>
                            <th style={{ padding: '12px' }}>{t('Status')}</th>
                            <th style={{ padding: '12px' }}>{t('Last Login')}</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>{t('Actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && staff.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ padding: '36px', textAlign: 'center', color: 'var(--muted)' }}>
                                    {t('Loading staff records...')}
                                </td>
                            </tr>
                        ) : staff.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ padding: '36px', textAlign: 'center', color: 'var(--muted)' }}>
                                    {t('No staff members found matching your search.')}
                                </td>
                            </tr>
                        ) : (
                            staff.map((member) => {
                                const isOwner = member.role === 'owner';
                                const isSelf = member.id === currentUser?.id;

                                return (
                                    <tr key={member.id} style={{ borderBottom: '1px solid var(--line)' }}>
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '50%',
                                                    background: isOwner ? '#f59e0b' : '#3b82f6',
                                                    color: '#fff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 'bold',
                                                    fontSize: '14px',
                                                    flexShrink: 0,
                                                }}>
                                                    {member.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <strong style={{ display: 'block', color: 'var(--text)' }}>
                                                        {member.name} {isSelf && <span style={{ fontSize: '11px', opacity: 0.7 }}>(You)</span>}
                                                    </strong>
                                                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>@{member.username || 'n/a'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <div>{member.email}</div>
                                            {member.phone && <small style={{ color: 'var(--muted)' }}>{member.phone}</small>}
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                padding: '3px 8px',
                                                borderRadius: '12px',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                background: isOwner ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.12)',
                                                color: isOwner ? '#b45309' : '#2563eb',
                                            }}>
                                                {member.shop_role?.name || (isOwner ? 'Store Owner' : member.role)}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                padding: '3px 8px',
                                                borderRadius: '12px',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                background: member.is_active ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                color: member.is_active ? '#15803d' : '#b91c1c',
                                            }}>
                                                {member.is_active ? t('Active') : t('Inactive')}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', color: 'var(--muted)', fontSize: '12px' }}>
                                            {member.last_login_at ? new Date(member.last_login_at).toLocaleDateString() : t('Never')}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>
                                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                                                {canEdit && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="btn"
                                                            onClick={() => openEdit(member)}
                                                            title={t('Edit Details & Role')}
                                                            style={{ padding: '5px 8px', fontSize: '12px' }}
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn"
                                                            onClick={() => openPasswordReset(member)}
                                                            title={t('Reset Password')}
                                                            style={{ padding: '5px 8px', fontSize: '12px' }}
                                                        >
                                                            🔑
                                                        </button>
                                                        {!isOwner && !isSelf && (
                                                            <button
                                                                type="button"
                                                                className="btn"
                                                                onClick={() => handleToggleStatus(member)}
                                                                title={member.is_active ? t('Deactivate') : t('Activate')}
                                                                style={{ padding: '5px 8px', fontSize: '12px', color: member.is_active ? '#b91c1c' : '#15803d' }}
                                                            >
                                                                {member.is_active ? '⏸' : '▶'}
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                                {canDelete && !isOwner && !isSelf && (
                                                    <button
                                                        type="button"
                                                        className="btn danger"
                                                        onClick={() => openDelete(member)}
                                                        title={t('Delete Staff Account')}
                                                        style={{ padding: '5px 8px', fontSize: '12px', color: '#ef4444' }}
                                                    >
                                                        🗑
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            <Pagination
                currentPage={meta.current_page || params.page}
                lastPage={meta.last_page || 1}
                total={meta.total || 0}
                from={meta.from || 0}
                to={meta.to || 0}
                perPage={params.per_page}
                onPageChange={setPage}
                onPerPageChange={setPerPage}
                perPageOptions={[10, 15, 25, 50]}
            />

            {/* Modal: Create Staff Member */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title={t('Add New Staff Member')}
                subtitle={t('Provision credentials and assign system roles.')}
                size="md"
            >
                <form onSubmit={handleCreate}>
                    <label className="field" style={{ display: 'block', marginBottom: '12px' }}>
                        <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>{t('Full Name')} *</span>
                        <input
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder={t('e.g. John Doe')}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                        />
                        {formErrors.name && <small style={{ color: '#ef4444' }}>{formErrors.name[0]}</small>}
                    </label>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                        <label className="field">
                            <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>{t('Email Address')} *</span>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder={t('john@example.com')}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                            />
                            {formErrors.email && <small style={{ color: '#ef4444' }}>{formErrors.email[0]}</small>}
                        </label>

                        <label className="field">
                            <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>{t('Username')}</span>
                            <input
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                placeholder={t('johndoe')}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                            />
                            {formErrors.username && <small style={{ color: '#ef4444' }}>{formErrors.username[0]}</small>}
                        </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                        <label className="field">
                            <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>{t('Phone')}</span>
                            <input
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder={t('+88017...')}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                            />
                        </label>

                        <label className="field">
                            <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>{t('Role')} *</span>
                            <select
                                required
                                value={formData.role_id}
                                onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                            >
                                <option value="">{t('Select a role...')}</option>
                                {roles.map((r) => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                            {formErrors.role_id && <small style={{ color: '#ef4444' }}>{formErrors.role_id[0]}</small>}
                        </label>
                    </div>

                    <label className="field" style={{ display: 'block', marginBottom: '16px' }}>
                        <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>{t('Password')} *</span>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder={t('Minimum 6 characters')}
                                style={{ width: '100%', padding: '9px 12px', paddingRight: '40px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                👁
                            </button>
                        </div>
                        {formErrors.password && <small style={{ color: '#ef4444' }}>{formErrors.password[0]}</small>}
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={formData.is_active}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        />
                        <span>{t('Account is Active and authorized to log in')}</span>
                    </label>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
                        <button type="button" className="btn" onClick={() => setShowCreateModal(false)}>{t('Cancel')}</button>
                        <button type="submit" className="btn primary" disabled={submitting}>
                            {submitting ? t('Saving...') : t('Create Staff Member')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Edit Staff Member */}
            <Modal
                isOpen={showEditModal && !!activeStaff}
                onClose={() => setShowEditModal(false)}
                title={t('Edit Staff Member')}
                subtitle={activeStaff?.name}
                size="md"
            >
                {activeStaff && (
                    <form onSubmit={handleUpdate}>
                        <label className="field" style={{ display: 'block', marginBottom: '12px' }}>
                            <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>{t('Full Name')} *</span>
                            <input
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                            />
                            {formErrors.name && <small style={{ color: '#ef4444' }}>{formErrors.name[0]}</small>}
                        </label>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                            <label className="field">
                                <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>{t('Email Address')} *</span>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                                />
                                {formErrors.email && <small style={{ color: '#ef4444' }}>{formErrors.email[0]}</small>}
                            </label>

                            <label className="field">
                                <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>{t('Username')}</span>
                                <input
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                                />
                                {formErrors.username && <small style={{ color: '#ef4444' }}>{formErrors.username[0]}</small>}
                            </label>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                            <label className="field">
                                <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>{t('Phone')}</span>
                                <input
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                                />
                            </label>

                            <label className="field">
                                <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>{t('Role')} *</span>
                                <select
                                    required
                                    disabled={activeStaff.role === 'owner'}
                                    value={formData.role_id}
                                    onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                                >
                                    {roles.map((r) => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                                {activeStaff.role === 'owner' && <small style={{ color: 'var(--muted)' }}>{t('Owner role cannot be changed.')}</small>}
                                {formErrors.role_id && <small style={{ color: '#ef4444' }}>{formErrors.role_id[0]}</small>}
                            </label>
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                disabled={activeStaff.role === 'owner'}
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            />
                            <span>{t('Account is Active and authorized to log in')}</span>
                        </label>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
                            <button type="button" className="btn" onClick={() => setShowEditModal(false)}>{t('Cancel')}</button>
                            <button type="submit" className="btn primary" disabled={submitting}>
                                {submitting ? t('Saving...') : t('Update Staff Member')}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Modal: Reset Password */}
            <Modal
                isOpen={showPasswordModal && !!activeStaff}
                onClose={() => setShowPasswordModal(false)}
                title={`${t('Reset Password')}: ${activeStaff?.name}`}
                size="sm"
            >
                {activeStaff && (
                    <form onSubmit={handlePasswordReset}>
                        <label className="field" style={{ display: 'block', marginBottom: '12px' }}>
                            <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>{t('New Password')} *</span>
                            <input
                                type="password"
                                required
                                value={passwordData.password}
                                onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
                                placeholder={t('Minimum 6 characters')}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                            />
                            {formErrors.password && <small style={{ color: '#ef4444' }}>{formErrors.password[0]}</small>}
                        </label>

                        <label className="field" style={{ display: 'block', marginBottom: '20px' }}>
                            <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>{t('Confirm New Password')} *</span>
                            <input
                                type="password"
                                required
                                value={passwordData.password_confirmation}
                                onChange={(e) => setPasswordData({ ...passwordData, password_confirmation: e.target.value })}
                                placeholder={t('Repeat new password')}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                            />
                        </label>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
                            <button type="button" className="btn" onClick={() => setShowPasswordModal(false)}>{t('Cancel')}</button>
                            <button type="submit" className="btn primary" disabled={submitting}>
                                {submitting ? t('Saving...') : t('Save New Password')}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Modal: Delete Confirmation */}
            <ConfirmModal
                isOpen={showDeleteModal && !!activeStaff}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title={t('Confirm Staff Deletion')}
                message={activeStaff ? `${t('Are you sure you want to permanently delete staff account')} "${activeStaff.name}" (${activeStaff.email})? ${t('This action cannot be undone. Historical sales and transactions logged by this user will remain preserved in audit records.')}` : ''}
                confirmText={t('Yes, Delete Account')}
                isLoading={submitting}
            />
        </section>
    );
}
