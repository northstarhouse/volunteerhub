import { useVol } from '../App.jsx';

const DRIVE_FOLDERS = [
  { label: 'Archival Photos', url: 'https://drive.google.com/drive/folders/1sQmw-Gw65-SSp786cZG9-zNFEsz8jb5e?usp=sharing' },
  { label: 'Archival Documents', url: 'https://drive.google.com/drive/folders/1N9mnKscP4fAs8qSY7QOZEmm4JfQUnBP2?usp=sharing' },
  { label: 'General Information', url: 'https://drive.google.com/drive/folders/1RCHJ0EYEOB1Oe5JyGy4podWp0JsWk7YK?usp=sharing' },
];

const LINKS = [
  { label: 'Volunteer Directory', view: 'directory' },
  { label: 'My Hours', view: 'hours' },
  { label: 'Submit Reimbursement', view: 'reimbursements' },
  { label: 'Upload Photos / Files to Archive', view: 'archive-upload' },
  { label: 'Submit Out of Town Notice', view: 'profile' },
  { label: 'Update My Profile', view: 'profile' },
];

const btnStyle = { display: 'block', width: '100%', background: '#fff', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' };

export default function Resources() {
  const { setView, volunteer } = useVol();
  const myTeams = (volunteer.Team || '').split('|').map(t => t.trim());
  const isLeader = myTeams.includes('Team Lead') || myTeams.includes('Board Member');

  return (
    <div>
      <div style={{ padding: '22px 20px 16px', borderBottom: '0.5px solid var(--border-light)', background: '#fff' }}>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", color: 'var(--gold)' }}>Volunteer Resources</div>
      </div>
      <div style={{ padding: '16px 20px 24px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10 }}>
        {DRIVE_FOLDERS.map(f => (
          <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className="btn-ghost" style={btnStyle}>
            {f.label}
          </a>
        ))}
        {LINKS.map(l => (
          <button key={l.label} onClick={() => setView(l.view)} className="btn-ghost" style={btnStyle}>
            {l.label}
          </button>
        ))}
        {isLeader && (
          <a href="https://northstarhouse.github.io/Portal/" target="_blank" rel="noreferrer" className="btn-ghost" style={btnStyle}>
            Open Portal
          </a>
        )}
      </div>
    </div>
  );
}
