import { useState, useEffect, createContext, useContext } from 'react';
import { supabase, initialAuthType } from './supabase.js';
import { fetchVolunteerByEmail, fetchVolunteerById } from './lib/db.js';
import Nav from './components/Nav.jsx';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import Directory from './pages/Directory.jsx';
import Hours from './pages/Hours.jsx';
import OperationalAreas from './pages/OperationalAreas.jsx';
import Reimbursements from './pages/Reimbursements.jsx';
import EventsCommittee from './pages/EventsCommittee.jsx';

export const VolContext = createContext(null);
export const useVol = () => useContext(VolContext);

// ── Auth Screen ───────────────────────────────────────────────────────────────

function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true); setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErr(error.message || 'Incorrect email or password. Make sure your account has been set up by a coordinator.');
      setBusy(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    if (!email) { setErr('Enter your email first.'); return; }
    setBusy(true); setErr('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${window.location.pathname}`,
    });
    if (error) { setErr(error.message); setBusy(false); return; }
    setMsg('Check your email for a reset link.');
    setBusy(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', border: '0.5px solid var(--border)', borderRadius: 18, padding: '40px 36px', width: '100%', maxWidth: 360, boxShadow: '0 4px 24px rgba(0,0,0,0.07)', textAlign: 'center' }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', fontFamily: "'Cardo','Georgia',serif", marginBottom: 4 }}>North Star House</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 28 }}>Volunteer Hub</div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 12 }}>
              <input className="input" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <input className="input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            {err && <div style={{ color: '#c0392b', fontSize: 12, marginBottom: 12 }}>{err}</div>}
            <button type="submit" className="btn-gold" disabled={busy} style={{ width: '100%', padding: '11px', fontSize: 14 }}>
              {busy ? 'Signing in…' : 'Sign In'}
            </button>
            <div style={{ marginTop: 14 }}>
              <button type="button" onClick={() => { setMode('reset'); setErr(''); }} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 12, padding: 0 }}>
                Forgot password?
              </button>
            </div>
            <div style={{ marginTop: 18, fontSize: 11, color: '#aaa', lineHeight: 1.5 }}>
              Access is by invitation only.<br />Contact your coordinator if you need an account.
            </div>
          </form>
        ) : (
          <form onSubmit={handleReset}>
            <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 14 }}>Enter your email and we'll send a reset link.</div>
            <div style={{ marginBottom: 14 }}>
              <input className="input" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            {err && <div style={{ color: '#c0392b', fontSize: 12, marginBottom: 12 }}>{err}</div>}
            {msg && <div style={{ color: '#2e7d32', fontSize: 12, marginBottom: 12 }}>{msg}</div>}
            <button type="submit" className="btn-gold" disabled={busy} style={{ width: '100%', padding: '11px', fontSize: 14 }}>
              {busy ? 'Sending…' : 'Send Reset Link'}
            </button>
            <div style={{ marginTop: 12 }}>
              <button type="button" onClick={() => { setMode('login'); setErr(''); setMsg(''); }} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 12, padding: 0 }}>
                ← Back to sign in
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Set Password Screen (after invite/reset link) ─────────────────────────────

function SetPasswordScreen({ onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) { setErr('Passwords do not match.'); return; }
    if (password.length < 8) { setErr('Must be at least 8 characters.'); return; }
    setBusy(true); setErr('');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setErr(error.message); setBusy(false); return; }
    setDone(true); setBusy(false);
    setTimeout(() => onDone?.(), 1500);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', border: '0.5px solid var(--border)', borderRadius: 18, padding: '40px 36px', width: '100%', maxWidth: 360, textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", marginBottom: 18 }}>
          {done ? 'Password Set!' : 'Set Your Password'}
        </div>
        {done ? (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>You're all set. You can now use the hub.</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <input className="input" type="password" placeholder="New password (8+ chars)" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} style={{ marginBottom: 10 }} />
            <input className="input" type="password" placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} required style={{ marginBottom: 14 }} />
            {err && <div style={{ color: '#c0392b', fontSize: 12, marginBottom: 12 }}>{err}</div>}
            <button type="submit" className="btn-gold" disabled={busy} style={{ width: '100%', padding: '11px' }}>
              {busy ? 'Saving…' : 'Save Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner({ message }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <div style={{ width: 34, height: 34, border: '3px solid var(--border)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'nsh-spin 0.8s linear infinite' }} />
      {message && <div style={{ fontSize: 13, color: 'var(--muted)' }}>{message}</div>}
      <style>{`@keyframes nsh-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── No Profile Screen ─────────────────────────────────────────────────────────

function NoProfileScreen({ email, onSignOut }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', border: '0.5px solid var(--border)', borderRadius: 18, padding: '36px', width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>👤</div>
        <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", marginBottom: 8 }}>Profile not found</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 22, lineHeight: 1.6 }}>
          No volunteer record found for <strong>{email}</strong>.<br />
          Please contact your coordinator to have your account linked.
        </div>
        <button onClick={onSignOut} className="btn-ghost" style={{ width: '100%' }}>Sign Out</button>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [session, setSession]             = useState(undefined);
  const [authEvent, setAuthEvent]         = useState(null);
  const [needsPassword, setNeedsPassword] = useState(
    initialAuthType === 'invite' || initialAuthType === 'recovery'
  );
  const [volunteer, setVolunteer]         = useState(null);
  const [linkError, setLinkError]         = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [view, setView]                   = useState('dashboard');
  const [currentArea, setCurrentArea]     = useState(null);
  const [isMobile, setIsMobile]           = useState(window.innerWidth < 768);

  function openArea(area) {
    setCurrentArea(area);
    setView('areas');
  }

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Init auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      setAuthEvent(event);
      setSession(sess ?? null);
      if (event === 'PASSWORD_RECOVERY') setNeedsPassword(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Link auth user → volunteer record when session changes
  useEffect(() => {
    if (session === undefined) return;
    if (!session) { setVolunteer(null); setLinkError(false); return; }
    if (needsPassword) return; // don't load profile until password is set

    setProfileLoading(true);
    setLinkError(false);

    async function resolveProfile() {
      const uid   = session.user.id;
      const email = session.user.email;

      const { data: link } = await supabase
        .from('volunteer_auth_links')
        .select('volunteer_id')
        .eq('auth_user_id', uid)
        .maybeSingle();

      if (link?.volunteer_id) {
        const vol = await fetchVolunteerById(link.volunteer_id);
        if (vol) { setVolunteer(vol); setProfileLoading(false); return; }
      }

      const vol = await fetchVolunteerByEmail(email);
      if (!vol) { setLinkError(true); setProfileLoading(false); return; }

      await supabase.from('volunteer_auth_links').upsert({ auth_user_id: uid, volunteer_id: vol.id });
      setVolunteer(vol);
      setProfileLoading(false);
    }

    resolveProfile();
  }, [session, needsPassword]);

  async function signOut() {
    await supabase.auth.signOut();
    setVolunteer(null);
    setLinkError(false);
    setNeedsPassword(false);
    setView('dashboard');
  }

  if (session === undefined) return <Spinner />;
  if (needsPassword && session) return <SetPasswordScreen onDone={() => { setNeedsPassword(false); window.history.replaceState(null, '', window.location.pathname); }} />;
  if (!session) return <AuthScreen />;
  if (profileLoading) return <Spinner message="Loading your profile…" />;
  if (linkError) return <NoProfileScreen email={session.user.email} onSignOut={signOut} />;
  if (!volunteer) return <Spinner message="Loading…" />;

  const pages = {
    dashboard: <Dashboard />,
    profile:   <Profile />,
    directory: <Directory />,
    hours:     <Hours />,
    areas:     <OperationalAreas />,
    reimbursements: <Reimbursements />,
    'events-committee': <EventsCommittee />,
  };

  return (
    <VolContext.Provider value={{ volunteer, setVolunteer, session, signOut, currentArea, setCurrentArea, openArea, setView }}>
      {isMobile ? (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 72 }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            {pages[view] ?? pages.dashboard}
          </div>
          <Nav view={view} setView={setView} />
        </div>
      ) : (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
          <Sidebar view={view} setView={setView} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
              {pages[view] ?? pages.dashboard}
            </div>
          </div>
        </div>
      )}
    </VolContext.Provider>
  );
}
