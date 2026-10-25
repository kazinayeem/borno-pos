import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { api } from '../api';
import { useT } from '../i18n';

export default function RoleManagement() {
    const t = useT();
    const currentUser = useSelector((state) => state.session.user);

    const [roles, setRoles] = useState([]);
    const [modules, setModules] = useState([]);
    const [allPermissionSlugs, setAllPermissionSlugs] = useState([]);
    const [loading, setLoading] = useState(true);

    const [alertMessage, setAlertMessage] = useState({ type: '', text: '' });

    // Modals
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [activeRole, setActiveRole] = useState(null);

    // Form inputs
    const [roleForm, setRoleForm] = useState({
        name: '',
        description: '',
        permissions: [],
    });
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const isOwnerOrAdmin = currentUser?.role === 'owner' || currentUser?.role === 'super_admin' || currentUser?.role === 'admin';
    const canCreate = isOwnerOrAdmin || currentUser?.permissions?.includes('roles.create');
    const canEdit = isOwnerOrAdmin || currentUser?.permissions?.includes('roles.edit');
    const canDelete = isOwnerOrAdmin || currentUser?.permissions?.includes('roles.delete');

    async function loadRoles() {
        setLoading(true);
        try {
            const res = await api('/api/roles');
            setRoles(res.roles || []);
            setModules(res.modules || []);
            setAllPermissionSlugs(res.all_permissions || []);
        } catch (err) {
            setAlertMessage({ type: 'error', text: err.payload?.message || 'Failed to load roles.' });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadRoles();
    }, []);

    function openCreate() {
        setActiveRole(null);
        setRoleForm({
            name: '',
            description: '',
            permissions: [],
        });
        setFormErrors({});
        setShowModal(true);
    }

    function openEdit(role) {
        setActiveRole(role);
        setRoleForm({
            name: role.name || '',
            description: role.description || '',
            permissions: Array.isArray(role.permissions) ? [...role.permissions] : [],
        });
        setFormErrors({});
        setShowModal(true);
    }

    function openDelete(role) {
        setActiveRole(role);
        setShowDeleteModal(true);
    }

    function togglePermission(slug) {
        setRoleForm((prev) => {
            const exists = prev.permissions.includes(slug);
            const permissions = exists
                ? prev.permissions.filter((p) => p !== slug)
                : [...prev.permissions, slug];

            return { ...prev, permissions };
        });
    }

    function toggleModule(mod) {
        const moduleSlugs = Object.values(mod.actions || {});
        const allIncluded = moduleSlugs.every((slug) => roleForm.permissions.includes(slug));

        setRoleForm((prev) => {
            let permissions;
            if (allIncluded) {
                // Remove all from this module
                permissions = prev.permissions.filter((p) => !moduleSlugs.includes(p));
            } else {
                // Add all from this module
                permissions = Array.from(new Set([...prev.permissions, ...moduleSlugs]));
            }

            return { ...prev, permissions };
        });
    }

    function selectAllGlobal() {
        setRoleForm((prev) => ({ ...prev, permissions: [...allPermissionSlugs] }));
    }

    function deselectAllGlobal() {
        setRoleForm((prev) => ({ ...prev, permissions: [] }));
    }

    async function handleSave(e) {
        e.preventDefault();
        setSubmitting(true);
        setFormErrors({});
        try {
            if (activeRole) {
                await api(`/api/roles/${activeRole.id}`, { method: 'PUT', body: roleForm });
                setAlertMessage({ type: 'success', text: `Role '${roleForm.name}' updated successfully.` });
            } else {
                await api('/api/roles', { method: 'POST', body: roleForm });
                setAlertMessage({ type: 'success', text: `Role '${roleForm.name}' created successfully.` });
            }
            setShowModal(false);
            loadRoles();
        } catch (err) {
            setFormErrors(err.payload?.errors || {});
            setAlertMessage({ type: 'error', text: err.payload?.message || 'Failed to save role.' });
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete() {
        if (!activeRole) return;
        setSubmitting(true);
        try {
            await api(`/api/roles/${activeRole.id}`, { method: 'DELETE' });
            setShowDeleteModal(false);
            setAlertMessage({ type: 'success', text: `Role '${activeRole.name}' deleted.` });
            loadRoles();
        } catch (err) {
            setAlertMessage({ type: 'error', text: err.payload?.message || 'Failed to delete role.' });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <section className="card role-page">
            <div className="section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '22px' }}>{t('Role & Permission Management')}</h1>
                    <p className="muted" style={{ margin: '4px 0 0', fontSize: '13px' }}>
                        {t('Define custom roles and assign granular View, Create, Edit, and Delete permissions.')}
                    </p>
                </div>
                {canCreate && (
                    <button type="button" className="btn primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>+</span> {t('Create Custom Role')}
                    </button>
                )}
            </div>

            {alertMessage.text && (
                <div className={`flash ${alertMessage.type === 'error' ? 'error' : 'note'}`} style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{alertMessage.text}</span>
                    <button type="button" onClick={() => setAlertMessage({ type: '', text: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✕</button>
                </div>
            )}

            {/* Roles Table */}
            <div className="table-responsive" style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: '10px' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--line)' }}>
                            <th style={{ padding: '12px' }}>{t('Role Name')}</th>
                            <th style={{ padding: '12px' }}>{t('Description')}</th>
                            <th style={{ padding: '12px' }}>{t('Type')}</th>
                            <th style={{ padding: '12px' }}>{t('Assigned Staff')}</th>
                            <th style={{ padding: '12px' }}>{t('Granted Permissions')}</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>{t('Actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && roles.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ padding: '36px', textAlign: 'center', color: 'var(--muted)' }}>
                                    {t('Loading roles...')}
                                </td>
                            </tr>
                        ) : roles.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ padding: '36px', textAlign: 'center', color: 'var(--muted)' }}>
                                    {t('No roles found.')}
                                </td>
                            </tr>
                        ) : (
                            roles.map((role) => {
                                const permCount = Array.isArray(role.permissions) ? role.permissions.length : 0;
                                const isAll = permCount >= allPermissionSlugs.length && allPermissionSlugs.length > 0;

                                return (
                                    <tr key={role.id} style={{ borderBottom: '1px solid var(--line)' }}>
                                        <td style={{ padding: '12px' }}>
                                            <strong style={{ color: 'var(--text)' }}>{role.name}</strong>
                                        </td>
                                        <td style={{ padding: '12px', color: 'var(--muted)', maxWidth: '280px' }}>
                                            {role.description || t('Standard store role')}
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                background: role.is_system ? 'rgba(99, 102, 241, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                                color: role.is_system ? '#4f46e5' : '#059669',
                                            }}>
                                                {role.is_system ? t('System Role') : t('Custom Role')}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{ fontWeight: 600 }}>{role.users_count || 0}</span> {t('members')}
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                padding: '3px 8px',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                background: isAll ? '#dbeafe' : 'var(--bg)',
                                                color: isAll ? '#1e40af' : 'var(--text)',
                                                fontWeight: 600,
                                            }}>
                                                {isAll ? t('All Permissions') : `${permCount} ${t('permissions')}`}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>
                                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                                                {canEdit && (
                                                    <button
                                                        type="button"
                                                        className="btn"
                                                        onClick={() => openEdit(role)}
                                                        title={t('Edit Permissions & Role')}
                                                        style={{ padding: '5px 10px', fontSize: '12px' }}
                                                    >
                                                        ⚙️ {t('Permissions')}
                                                    </button>
                                                )}
                                                {canDelete && !role.is_system && (
                                                    <button
                                                        type="button"
                                                        className="btn danger"
                                                        disabled={role.users_count > 0}
                                                        onClick={() => openDelete(role)}
                                                        title={role.users_count > 0 ? t('Cannot delete role with assigned staff') : t('Delete Role')}
                                                        style={{ padding: '5px 8px', fontSize: '12px', color: '#ef4444', opacity: role.users_count > 0 ? 0.4 : 1 }}
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

            {/* Modal: Create or Edit Role with Granular Permission Matrix */}
            {showModal && (
                <div className="pos-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '780px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px' }}>
                                    {activeRole ? `${t('Edit Role')}: ${activeRole.name}` : t('Create Custom Role')}
                                </h2>
                                <p className="muted" style={{ margin: '2px 0 0', fontSize: '12px' }}>
                                    {t('Check the exact actions this role is authorized to perform.')}
                                </p>
                            </div>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
                        </div>

                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                                    <label className="field">
                                        <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>{t('Role Name')} *</span>
                                        <input
                                            required
                                            disabled={activeRole?.is_system}
                                            value={roleForm.name}
                                            onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                                            placeholder={t('e.g. Senior Pharmacist')}
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                                        />
                                        {activeRole?.is_system && <small style={{ color: 'var(--muted)' }}>{t('System role names cannot be renamed.')}</small>}
                                        {formErrors.name && <small style={{ color: '#ef4444' }}>{formErrors.name[0]}</small>}
                                    </label>

                                    <label className="field">
                                        <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>{t('Description')}</span>
                                        <input
                                            value={roleForm.description}
                                            onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                                            placeholder={t('Brief responsibilities description')}
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                                        />
                                    </label>
                                </div>

                                {/* Permission Matrix Head */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', background: 'var(--bg)', padding: '8px 12px', borderRadius: '8px' }}>
                                    <strong style={{ fontSize: '13px' }}>
                                        {t('Module Permissions')} ({roleForm.permissions.length} {t('selected')})
                                    </strong>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button type="button" className="btn" onClick={selectAllGlobal} style={{ fontSize: '11px', padding: '4px 8px' }}>
                                            {t('Select All')}
                                        </button>
                                        <button type="button" className="btn" onClick={deselectAllGlobal} style={{ fontSize: '11px', padding: '4px 8px' }}>
                                            {t('Deselect All')}
                                        </button>
                                    </div>
                                </div>

                                {/* Permission Matrix Table */}
                                <div style={{ border: '1px solid var(--line)', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--line)' }}>
                                                <th style={{ padding: '8px 12px', textAlign: 'left', width: '220px' }}>{t('Module')}</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'center' }}>{t('View')}</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'center' }}>{t('Create')}</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'center' }}>{t('Edit')}</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'center' }}>{t('Delete')}</th>
                                                <th style={{ padding: '8px 12px', textAlign: 'right' }}>{t('Quick')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {modules.map((mod) => {
                                                const actions = mod.actions || {};
                                                const modSlugs = Object.values(actions);
                                                const allChecked = modSlugs.every((s) => roleForm.permissions.includes(s));

                                                return (
                                                    <tr key={mod.module} style={{ borderBottom: '1px solid var(--line)' }}>
                                                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                                                            {mod.label}
                                                        </td>

                                                        {/* View */}
                                                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                            {actions.view ? (
                                                                <input
                                                                    type="checkbox"
                                                                    checked={roleForm.permissions.includes(actions.view)}
                                                                    onChange={() => togglePermission(actions.view)}
                                                                    title={`${mod.label}: View`}
                                                                />
                                                            ) : <span style={{ opacity: 0.25 }}>—</span>}
                                                        </td>

                                                        {/* Create */}
                                                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                            {actions.create ? (
                                                                <input
                                                                    type="checkbox"
                                                                    checked={roleForm.permissions.includes(actions.create)}
                                                                    onChange={() => togglePermission(actions.create)}
                                                                    title={`${mod.label}: Create`}
                                                                />
                                                            ) : <span style={{ opacity: 0.25 }}>—</span>}
                                                        </td>

                                                        {/* Edit */}
                                                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                            {actions.edit ? (
                                                                <input
                                                                    type="checkbox"
                                                                    checked={roleForm.permissions.includes(actions.edit)}
                                                                    onChange={() => togglePermission(actions.edit)}
                                                                    title={`${mod.label}: Edit`}
                                                                />
                                                            ) : <span style={{ opacity: 0.25 }}>—</span>}
                                                        </td>

                                                        {/* Delete */}
                                                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                            {actions.delete ? (
                                                                <input
                                                                    type="checkbox"
                                                                    checked={roleForm.permissions.includes(actions.delete)}
                                                                    onChange={() => togglePermission(actions.delete)}
                                                                    title={`${mod.label}: Delete`}
                                                                />
                                                            ) : <span style={{ opacity: 0.25 }}>—</span>}
                                                        </td>

                                                        {/* Module Toggle */}
                                                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                                            <button
                                                                type="button"
                                                                className="btn"
                                                                onClick={() => toggleModule(mod)}
                                                                style={{ fontSize: '10px', padding: '2px 6px' }}
                                                            >
                                                                {allChecked ? t('Clear') : t('All')}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
                                <button type="button" className="btn" onClick={() => setShowModal(false)}>{t('Cancel')}</button>
                                <button type="submit" className="btn primary" disabled={submitting}>
                                    {submitting ? t('Saving...') : t('Save Role & Permissions')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Delete Role Confirmation */}
            {showDeleteModal && activeRole && (
                <div className="pos-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '420px' }}>
                        <h2 style={{ margin: '0 0 12px', color: '#ef4444' }}>{t('Delete Custom Role')}</h2>
                        <p style={{ margin: '0 0 16px', lineHeight: 1.5 }}>
                            {t('Are you sure you want to delete role')} <strong>{activeRole.name}</strong>?
                        </p>
                        <p style={{ margin: '0 0 20px', fontSize: '12px', color: 'var(--muted)' }}>
                            {t('This role will be permanently removed. System roles and roles with active assigned staff members cannot be deleted.')}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button type="button" className="btn" onClick={() => setShowDeleteModal(false)}>{t('Cancel')}</button>
                            <button type="button" className="btn danger" style={{ background: '#ef4444', color: '#fff' }} disabled={submitting} onClick={handleDelete}>
                                {submitting ? t('Deleting...') : t('Yes, Delete Role')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
