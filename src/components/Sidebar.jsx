import { useVol } from '../App.jsx';
import { photoUrl, matchVolunteerAreas } from '../lib/db.js';

const TABS = [
  { id: 'dashboard',      label: 'Home',           icon: HomeIcon },
  { id: 'directory',      label: 'Directory',      icon: PeopleIcon },
  { id: 'hours',          label: 'Hours',          icon: ClockIcon },
  { id: 'reimbursements', label: 'Reimbursements', icon: ReceiptIcon },
];

function HomeIcon({ active }) {
  const c = active ? '#f0ebe3' : 'rgba(255,255,255,0.5)';
  return <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function PeopleIcon({ active }) {
  const c = active ? '#f0ebe3' : 'rgba(255,255,255,0.5)';
  return <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function ClockIcon({ active }) {
  const c = active ? '#f0ebe3' : 'rgba(255,255,255,0.5)';
  return <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
function ReceiptIcon({ active }) {
  const c = active ? '#f0ebe3' : 'rgba(255,255,255,0.5)';
  return <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M4 2h16v20l-3-2-3 2-3-2-3 2-3-2-1 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="12" y2="15"/></svg>;
}

export default function Sidebar({ view, setView }) {
  const { volunteer, signOut, openArea, currentArea } = useVol();
  const initials = `${(volunteer?.['First Name'] || '')[0] || ''}${(volunteer?.['Last Name'] || '')[0] || ''}`.toUpperCase();
  const myAreas = matchVolunteerAreas(volunteer?.Team);

  return (
    <div style={{ display: 'flex', position: 'sticky', top: 0, height: '100vh', flexShrink: 0 }}>
      <div style={{ width: 220, background: '#2a2a2e', display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ padding: '24px 20px 14px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", color: '#f0ebe3' }}>North Star House</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>Volunteer Hub</div>
        </div>
        <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)', margin: '0 0 8px' }} />

        <nav style={{ padding: '0 8px' }}>
          {TABS.map(tab => {
            const active = view === tab.id;
            return (
              <button key={tab.id} onClick={() => setView(tab.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px',
                background: active ? 'rgba(181,161,133,0.15)' : 'transparent',
                border: 'none', borderRadius: 7, cursor: 'pointer', textAlign: 'left',
                color: active ? '#f0ebe3' : 'rgba(255,255,255,0.5)',
                fontSize: 13, fontWeight: active ? 600 : 400,
                marginBottom: 2, transition: 'all 0.15s',
              }}>
                <tab.icon active={active} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {myAreas.length > 0 && (
          <div style={{ padding: '16px 8px 0' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase', padding: '0 12px', marginBottom: 8 }}>My Areas</div>
            {myAreas.map(area => {
              const active = view === 'areas' && currentArea === area;
              return (
                <button key={area} onClick={() => openArea(area)} style={{
                  display: 'block', width: '100%', padding: '8px 12px',
                  background: active ? 'rgba(181,161,133,0.15)' : 'transparent',
                  border: 'none', borderRadius: 7, cursor: 'pointer', textAlign: 'left',
                  color: active ? '#b5a185' : 'rgba(255,255,255,0.45)',
                  fontSize: 12.5, fontWeight: active ? 600 : 400,
                  marginBottom: 2, transition: 'all 0.15s',
                }}>
                  {area}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ flex: 1 }} />

        <div style={{ padding: '12px 8px', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
          <button onClick={() => setView('profile')} style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 8px',
            background: view === 'profile' ? 'rgba(181,161,133,0.15)' : 'transparent',
            border: 'none', borderRadius: 7, cursor: 'pointer', textAlign: 'left',
          }}>
            {volunteer?.['Picture URL'] ? (
              <img src={photoUrl(volunteer['Picture URL'])} alt={initials} style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#f0ebe3', flexShrink: 0 }}>
                {initials || '?'}
              </div>
            )}
            <div style={{ fontSize: 12.5, fontWeight: view === 'profile' ? 600 : 400, color: view === 'profile' ? '#f0ebe3' : 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {volunteer?.['First Name']} {volunteer?.['Last Name']}
            </div>
          </button>
          <button onClick={signOut} style={{ display: 'block', width: '100%', padding: '8px 8px', marginTop: 2, background: 'none', border: 'none', borderRadius: 7, cursor: 'pointer', textAlign: 'left', color: 'rgba(255,255,255,0.35)', fontSize: 11.5 }}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
