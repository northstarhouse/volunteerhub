import { useVol } from '../App.jsx';

const DRIVE_URL = 'https://drive.google.com/drive/folders/1AGCE-jvZxgytP63lLjvdUYAkB-aOuTMO?usp=sharing';
const ARCHIVE_URL = 'https://northstarhouse.github.io/north-star-archives/';

const LINKS = [
  { label: 'Volunteer Directory', view: 'directory' },
  { label: 'My Hours', view: 'hours' },
  { label: 'Submit Reimbursement', view: 'reimbursements' },
  { label: 'Upload Photos / Files to Archive', view: 'archive-upload' },
];

export default function Resources() {
  const { setView, volunteer } = useVol();
  const myTeams = (volunteer.Team || '').split('|').map(t => t.trim());
  const isLeader = myTeams.includes('Team Lead') || myTeams.includes('Board Member');

  return (
    <div>
      <div style={{ padding: '22px 20px 16px', borderBottom: '0.5px solid var(--border-light)', background: '#fff' }}>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", color: 'var(--gold)' }}>Volunteer Resources</div>
      </div>
      <div style={{ padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 420 }}>
        <a href={DRIVE_URL} target="_blank" rel="noreferrer" className="btn-gold"
          style={{ display: 'block', width: '100%', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
          Resource Files (Google Drive)
        </a>
        {LINKS.map(l => (
          <button key={l.view} onClick={() => setView(l.view)} className="btn-ghost" style={{ display: 'block', width: '100%' }}>
            {l.label}
          </button>
        ))}
        <a href={ARCHIVE_URL} target="_blank" rel="noreferrer" className="btn-ghost"
          style={{ display: 'block', width: '100%', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
          View NSH Archive
        </a>
        {isLeader && (
          <a href="https://northstarhouse.github.io/Portal/" target="_blank" rel="noreferrer" className="btn-ghost"
            style={{ display: 'block', width: '100%', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
            Open Portal
          </a>
        )}
      </div>
    </div>
  );
}
