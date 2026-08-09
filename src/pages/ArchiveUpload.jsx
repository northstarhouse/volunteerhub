import { useState, useRef } from 'react';
import { useVol } from '../App.jsx';
import { uploadArchiveFiles } from '../lib/db.js';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 20 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function UploadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function FileThumb({ file, onRemove }) {
  const isImage = file.type.startsWith('image/');
  const [url] = useState(() => (isImage ? URL.createObjectURL(file) : null));
  return (
    <div style={{ position: 'relative', width: 64, height: 64, borderRadius: 8, overflow: 'hidden', border: '0.5px solid var(--border)', background: 'var(--light)', flexShrink: 0 }}>
      {isImage ? (
        <img src={url} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'var(--muted)', textAlign: 'center', padding: 4, overflow: 'hidden' }}>
          {file.name.split('.').pop()?.toUpperCase()}
        </div>
      )}
      <button type="button" onClick={onRemove} style={{
        position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%',
        background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, lineHeight: 1, padding: 0,
      }}>×</button>
    </div>
  );
}

export default function ArchiveUpload() {
  const { volunteer } = useVol();
  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState('photo');
  const [files, setFiles] = useState([]);
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [description, setDescription] = useState('');
  const [names, setNames] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const uploaderName = `${volunteer?.['First Name'] || ''} ${volunteer?.['Last Name'] || ''}`.trim();

  function addFiles(newFiles) {
    const arr = Array.from(newFiles || []);
    if (!arr.length) return;
    setFiles(prev => [...prev, ...arr]);
  }

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  function resetForm() {
    setFiles([]); setYear(''); setMonth(''); setDescription(''); setNames('');
    setErr(''); setResult(null); setProgress(null); setShowForm(false);
  }

  async function handleSubmit() {
    if (!files.length || uploading) return;
    setUploading(true); setErr(''); setProgress({ done: 0, total: files.length });

    try {
      // Upload one at a time so progress can be shown and one bad file
      // doesn't silently swallow the rest.
      let last = null;
      for (let i = 0; i < files.length; i++) {
        last = await uploadArchiveFiles([files[i]], {
          kind,
          year: year ? Number(year) : undefined,
          month: month ? Number(month) : undefined,
          description,
          names,
        }, uploaderName);
        setProgress({ done: i + 1, total: files.length });
      }
      setResult({ count: files.length, folderUrl: last?.folderUrl });
    } catch (e) {
      setErr(e.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div style={{ padding: '22px 18px 14px', borderBottom: '0.5px solid var(--border-light)', background: '#fff' }}>
        <div style={{ fontSize: 11, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 500, marginBottom: 2 }}>Archives</div>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", color: 'var(--gold)' }}>Photos &amp; Documents</div>
      </div>

      <div style={{ padding: '14px 14px 24px' }}>
        {!showForm && !result && (
          <button className="btn-gold" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={() => setShowForm(true)}>
            <UploadIcon /> Upload Photos
          </button>
        )}

        {result && (
          <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e3f6ec', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", marginBottom: 4 }}>Thank you!</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
              {result.count} file{result.count !== 1 ? 's' : ''} uploaded to the Archives.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {result.folderUrl && (
                <a href={result.folderUrl} target="_blank" rel="noreferrer" className="btn-gold" style={{ textDecoration: 'none', display: 'inline-block' }}>
                  View Files in Drive Folder
                </a>
              )}
              <button className="btn-ghost" onClick={resetForm}>Upload More</button>
            </div>
          </div>
        )}

        {showForm && !result && (
          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Upload to North Star Archives</div>

            <div style={{ marginBottom: 12 }}>
              <div className="label">What are you uploading?</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['photo', 'Photos'], ['document', 'Documents']].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setKind(val)} style={{
                    flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    border: `1.5px solid ${kind === val ? 'var(--gold)' : 'var(--border)'}`,
                    background: kind === val ? 'var(--gold)' : '#fff',
                    color: kind === val ? '#fff' : 'var(--text)',
                  }}>{label}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div className="label">Files</div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={kind === 'photo' ? 'image/*' : 'image/*,application/pdf,.doc,.docx'}
                onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
                style={{ display: 'none' }}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
                style={{
                  border: `1.5px dashed ${dragOver ? 'var(--gold)' : 'var(--border)'}`,
                  borderRadius: 10, padding: '18px 14px', textAlign: 'center', cursor: 'pointer',
                  background: dragOver ? 'var(--light)' : 'var(--bg)', transition: 'all 0.15s',
                }}
              >
                <div style={{ color: 'var(--gold)', marginBottom: 6, display: 'flex', justifyContent: 'center' }}><UploadIcon /></div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>
                  Drop files here, or tap to choose
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>You can select multiple files at once</div>
              </div>

              {files.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  {files.map((f, i) => <FileThumb key={i} file={f} onRemove={() => removeFile(i)} />)}
                </div>
              )}
            </div>

            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, marginTop: 16 }}>
              The rest is optional — fill in what you know.
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div className="label">Year taken</div>
                <select className="input" style={{ appearance: 'auto' }} value={year} onChange={e => { setYear(e.target.value); if (!e.target.value) setMonth(''); }}>
                  <option value="">Unspecified</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div className="label">Month taken</div>
                <select className="input" style={{ appearance: 'auto' }} value={month} onChange={e => setMonth(e.target.value)} disabled={!year}>
                  <option value="">Unspecified</option>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
            </div>
            {!year && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: -8, marginBottom: 12 }}>
                No date? We'll file these under today's date.
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <div className="label">Description (optional)</div>
              <textarea className="input" rows={2} value={description} onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Spring Garden Tour, ribbon cutting for the new porch…" style={{ resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div className="label">Who's in these photos? (optional)</div>
              <input className="input" value={names} onChange={e => setNames(e.target.value)} placeholder="e.g. Jane Smith, Bob Lee" />
            </div>

            {err && <div style={{ color: '#c0392b', fontSize: 12, marginBottom: 10 }}>{err}</div>}
            {progress && uploading && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
                Uploading {progress.done + 1 > progress.total ? progress.total : progress.done + 1} of {progress.total}…
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={resetForm} disabled={uploading}>Cancel</button>
              <button type="button" className="btn-gold" style={{ flex: 2 }} onClick={handleSubmit} disabled={uploading || !files.length}>
                {uploading ? 'Uploading…' : `Upload ${files.length || ''} File${files.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
