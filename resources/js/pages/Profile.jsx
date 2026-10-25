import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '../api';
import { useT } from '../i18n';
import { updateUser } from '../slices/sessionSlice';

export default function Profile() {
    const t = useT();
    const dispatch = useDispatch();
    const currentUser = useSelector((state) => state.session.user);

    const [name, setName] = useState(currentUser?.name || '');
    const [email, setEmail] = useState(currentUser?.email || '');
    const [phone, setPhone] = useState(currentUser?.phone || '');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        let mounted = true;
        api('/user/profile')
            .then((res) => {
                if (mounted && res.user) {
                    setName(res.user.name || '');
                    setEmail(res.user.email || '');
                    setPhone(res.user.phone || '');
                }
            })
            .catch(() => {});

        return () => { mounted = false; };
    }, []);

    async function handleSubmit(event) {
        event.preventDefault();
        setStatusMsg('');
        setErrorMsg('');
        setLoading(true);

        try {
            const body = {
                name,
                email,
                phone,
            };
            if (password) {
                body.password = password;
                body.password_confirmation = passwordConfirmation;
            }

            const res = await api('/user/profile', {
                method: 'PUT',
                body,
            });

            setStatusMsg(res.message || t('Profile updated.'));
            setPassword('');
            setPasswordConfirmation('');

            if (res.user) {
                dispatch(updateUser({
                    name: res.user.name,
                    email: res.user.email,
                    phone: res.user.phone,
                }));
            }
        } catch (err) {
            setErrorMsg(err.message || t('Failed to update profile.'));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div className="page-title">
                <div>
                    <h1>{t('My Profile')}</h1>
                    <div className="crumbs">{t('Manage your personal account details and security credentials')}</div>
                </div>
            </div>

            {statusMsg && (
                <div className="flash note" style={{ marginBottom: '16px' }}>
                    {statusMsg}
                    <button type="button" onClick={() => setStatusMsg('')}>×</button>
                </div>
            )}

            {errorMsg && (
                <div className="errors note" style={{ marginBottom: '16px' }}>
                    {errorMsg}
                </div>
            )}

            <section className="card" style={{ padding: '24px' }}>
                <form onSubmit={handleSubmit}>
                    <div className="field">
                        <label>{t('Full Name')}</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="e.g. John Doe"
                        />
                    </div>

                    <div className="field">
                        <label>{t('Email Address')}</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="e.g. user@bornopos.test"
                        />
                    </div>

                    <div className="field">
                        <label>{t('Phone Number')}</label>
                        <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="e.g. 01700000000"
                        />
                    </div>

                    <div style={{ margin: '20px 0 16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>
                            {t('Change Password')}
                        </h3>
                        <p className="muted" style={{ fontSize: '13px', margin: '0 0 14px' }}>
                            {t('Leave blank to keep your current password.')}
                        </p>

                        <div className="field">
                            <label>{t('New Password')}</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={t('Minimum 8 characters')}
                            />
                        </div>

                        <div className="field">
                            <label>{t('Confirm New Password')}</label>
                            <input
                                type="password"
                                value={passwordConfirmation}
                                onChange={(e) => setPasswordConfirmation(e.target.value)}
                                placeholder={t('Repeat new password')}
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                        <button className="btn primary" type="submit" disabled={loading}>
                            {loading ? t('Saving…') : t('Save Profile Changes')}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}
