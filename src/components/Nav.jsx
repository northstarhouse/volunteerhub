import { useVol } from '../App.jsx';

const TABS = [
  { id: 'dashboard', label: 'Home',      icon: HomeIcon },
  { id: 'directory', label: 'Directory', icon: PeopleIcon },
  { id: 'hours',     label: 'Hours',     icon: ClockIcon },
  { id: 'oot',       label: 'Away',      icon: PlaneIcon },
  { id: 'feedback',  label: 'Feedback',  icon: ChatIcon },
];

function HomeIcon({ active }) {
  const c = active ? 'var(--gold)' : '#aaa';
  return <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function PeopleIcon({ active }) {
  const c = active ? 'var(--gold)' : '#aaa';
  return <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function ClockIcon({ active }) {
  const c = active ? 'var(--gold)' : '#aaa';
  return <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
function PlaneIcon({ active }) {
  const c = active ? 'var(--gold)' : '#aaa';
  return <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2A1 1 0 0 0 1 7.2l.8 4a1 1 0 0 0 .6.7L6 13l-2 3.5C3 18 4 19 5.5 18L9 16l4 3a1 1 0 0 0 1 .1l4-2a1 1 0 0 0 .6-.9z"/></svg>;
}
function ChatIcon({ active }) {
  const c = active ? 'var(--gold)' : '#aaa';
  return <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
}

export default function Nav({ view, setView }) {
  const { volunteer, signOut } = useVol();
  const initials = `${(volunteer?.['First Name'] || '')[0] || ''}${(volunteer?.['Last Name'] || '')[0] || ''}`.toUpperCase();

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#fff',
      borderTop: '0.5px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      height: 62,
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 100,
    }}>
      <div style={{ maxWidth: 640, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', padding: '0 8px' }}>
        {TABS.map(tab => {
          const active = view === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 0',
                color: active ? 'var(--gold)' : '#aaa',
              }}
            >
              <tab.icon active={active} />
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{tab.label}</span>
            </button>
          );
        })}
        {/* Avatar → Profile */}
        <button
          onClick={() => setView('profile')}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '6px 0',
          }}
          title="My Profile"
        >
          {volunteer?.['Picture URL'] ? (
            <img
              src={volunteer['Picture URL']}
              alt={initials}
              style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', border: view === 'profile' ? '1.5px solid var(--gold)' : '1.5px solid var(--border)' }}
            />
          ) : (
            <div style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: view === 'profile' ? 'var(--gold)' : 'var(--light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
              color: view === 'profile' ? '#fff' : 'var(--gold)',
              border: view === 'profile' ? '1.5px solid var(--gold)' : '1.5px solid var(--border-light)',
            }}>
              {initials || '?'}
            </div>
          )}
          <span style={{ fontSize: 10, fontWeight: view === 'profile' ? 600 : 400, color: view === 'profile' ? 'var(--gold)' : '#aaa' }}>Me</span>
        </button>
      </div>
    </nav>
  );
}
