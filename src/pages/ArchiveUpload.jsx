import { useEffect, useRef, useState } from 'react';
import { useVol } from '../App.jsx';
import { fetchArchiveCategories, uploadToDriveArchive } from '../lib/db.js';

const PHOTOS_FOLDER_URL = 'https://drive.google.com/drive/folders/1sQmw-Gw65-SSp786cZG9-zNFEsz8jb5e?usp=sharing';
const DOCUMENTS_FOLDER_URL = 'https://drive.google.com/drive/folders/1N9mnKscP4fAs8qSY7QOZEmm4JfQUnBP2?usp=sharing';

// Per-kind wording. Categories themselves come live from Google Drive.
const KINDS = {
  photo: {
    label: 'Photos/Videos',
    categoryLabel: 'Pick the category that best fits:',
    otherLabel: 'What are these photos or videos of?',
    otherPlaceholder: 'e.g. Porch repairs, Volunteer potluck',
    accept: 'image/*,video/*',
    fileHint: 'You can pick many photos and videos at once',
    dateLabel: 'Date taken (optional)',
  },
  document: {
    label: 'Documents',
    categoryLabel: 'What type of document are you uploading?',
    otherLabel: 'What is this document related to?',
    otherPlaceholder: 'e.g. 2026 garden plan, donor letter',
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.rtf,.odt,.ods,.pages,.numbers,.key,image/*',
    fileHint: 'You can pick one or several documents',
    dateLabel: 'Document date (optional)',
  },
};

function UploadIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function PhotoIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="m21 16-5-5-8 8" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <polyline points="14 3 14 8 19 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}

function FileThumb({ file, onRemove, disabled }) {
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const [url] = useState(() => (isImage ? URL.createObjectURL(file) : null));
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const ext = file.name.split('.').pop()?.toUpperCase();
  return (
    <div style={{ position: 'relative', width: 72, flexShrink: 0 }}>
      <div style={{ width: 72, height: 72, borderRadius: 8, overflow: 'hidden', border: '0.5px solid var(--border)', background: 'var(--light)' }}>
        {isImage ? (
          <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>
            {isVideo ? 'VIDEO' : ext}
          </div>
        )}
      </div>
      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
        {file.name}
      </div>
      {!disabled && (
        <button type="button" onClick={onRemove} aria-label={`Remove ${file.name}`} style={{
          position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: '50%',
          background: 'rgba(0,0,0,0.7)', color: '#fff', border: '2px solid #fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, lineHeight: 1, padding: 0,
        }}>×</button>
      )}
    </div>
  );
}

function Step({ n, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, margin: '4px 0 10px' }}>
      <span aria-hidden="true" style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--gold)', color: '#fff', fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</span>
      {children}
    </div>
  );
}

export default function ArchiveUpload() {
  const { volunteer } = useVol();
  const uploaderName = `${volunteer?.['First Name'] || ''} ${volunteer?.['Last Name'] || ''}`.trim();

  // screen: home -> choose (Photos/Videos or Documents) -> form -> done
  const [screen, setScreen] = useState('home');
  const [kind, setKind] = useState(null);
  const [cats, setCats] = useState(null);
  const [catsErr, setCatsErr] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [otherText, setOtherText] = useState('');
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [err, setErr] = useState('');
  const [touched, setTouched] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  // Load the Drive folder categories once, when the volunteer starts.
  function loadCategories() {
    setCatsErr('');
    fetchArchiveCategories()
      .then(setCats)
      .catch(e => setCatsErr(e.message || 'Could not load the categories.'));
  }
  useEffect(() => { if (screen !== 'home' && !cats) loadCategories(); }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  const k = kind ? KINDS[kind] : null;
  const options = (kind && cats?.[kind]) || [];
  const isOther = categoryId === 'other';
  const categoryLabel = isOther ? 'Other' : options.find(o => o.id === categoryId)?.label || '';
  const missing = [
    !categoryId && 'category',
    isOther && !otherText.trim() && 'other',
    !files.length && 'files',
  ].filter(Boolean);

  function resetAll() {
    setKind(null); setCategoryId(''); setOtherText(''); setFiles([]); setTitle(''); setDescription(''); setDate('');
    setErr(''); setProgress(null); setTouched(false); setResult(null);
  }

  function chooseKind(next) {
    setKind(next); setCategoryId(''); setOtherText('');
    setScreen('form');
  }

  function addFiles(list) {
    const arr = Array.from(list || []);
    if (arr.length) setFiles(prev => [...prev, ...arr]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched(true);
    if (missing.length || uploading) return;
    setUploading(true); setErr(''); setProgress({ fileIndex: 0, total: files.length, fraction: 0 });
    try {
      const res = await uploadToDriveArchive(files, {
        kind, categoryId, categoryLabel,
        otherText: isOther ? otherText.trim() : '',
        title: kind === 'document' ? title.trim() : '',
        description: description.trim(),
        date,
      }, uploaderName, setProgress);
      setResult(res);
      setScreen('done');
    } catch (e2) {
      setErr(e2.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  const pct = progress ? Math.round(progress.fraction * 100) : 0;

  return (
    <div>
      <div style={{ padding: '22px 18px 14px', borderBottom: '0.5px solid var(--border-light)', background: '#fff' }}>
        <div style={{ fontSize: 11, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 500, marginBottom: 2 }}>Archives</div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", color: 'var(--gold)' }}>Upload Photos &amp; Documents</h1>
      </div>

      <div style={{ padding: '14px 14px 28px', maxWidth: 560, margin: '0 auto' }}>
        {screen === 'home' && (
          <>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.55, margin: '0 0 16px' }}>
              Everything you share here becomes part of the permanent North Star Archives, our record of the house's restoration,
              events, and the people who make it happen. Photos and documents may also be shared on our social media and in
              newsletters to help tell the NSH story.
            </p>
            <button className="btn-gold" style={{ width: '100%', minHeight: 52, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={() => { resetAll(); setScreen('choose'); }}>
              <UploadIcon /> Upload Photos or Documents
            </button>

            <hr style={{ border: 'none', borderTop: '0.5px solid var(--border-light)', margin: '20px 0' }} />

            <div style={{ display: 'flex', gap: 10 }}>
              <a href={PHOTOS_FOLDER_URL} target="_blank" rel="noreferrer" className="btn-ghost"
                style={{ flex: 1, textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>View Photos</a>
              <a href={DOCUMENTS_FOLDER_URL} target="_blank" rel="noreferrer" className="btn-ghost"
                style={{ flex: 1, textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>View Documents</a>
            </div>
          </>
        )}

        {screen === 'choose' && (
          <div className="card">
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 14px', fontFamily: "'Cardo','Georgia',serif" }}>What would you like to upload?</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[['photo', <PhotoIcon key="p" />], ['document', <DocIcon key="d" />]].map(([val, icon]) => (
                <button key={val} type="button" onClick={() => chooseKind(val)} style={{
                  minHeight: 110, borderRadius: 12, border: '1.5px solid var(--border)', background: '#fff', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                  color: 'var(--gold)', fontSize: 15, fontWeight: 700,
                }}>
                  {icon}
                  <span style={{ color: 'var(--text)' }}>{KINDS[val].label}</span>
                </button>
              ))}
            </div>
            <button type="button" className="btn-ghost" style={{ width: '100%', marginTop: 14 }} onClick={() => setScreen('home')}>Cancel</button>
          </div>
        )}

        {screen === 'form' && k && (
          <form className="card" onSubmit={handleSubmit} noValidate>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, fontFamily: "'Cardo','Georgia',serif" }}>Upload {k.label}</h2>
              {!uploading && (
                <button type="button" onClick={() => setScreen('choose')} style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 6 }}>
                  Change
                </button>
              )}
            </div>

            {/* 1. Category */}
            <Step n={1}><label htmlFor="archive-category">{k.categoryLabel}</label></Step>
            {catsErr ? (
              <div role="alert" style={{ fontSize: 13, color: '#c0392b', marginBottom: 12 }}>
                {catsErr}{' '}
                <button type="button" onClick={loadCategories} style={{ background: 'none', border: 'none', color: 'var(--gold)', fontWeight: 600, cursor: 'pointer', padding: 0 }}>Try again</button>
              </div>
            ) : (
              <select id="archive-category" className="input" required disabled={!cats || uploading}
                style={{ appearance: 'auto', minHeight: 46, fontSize: 15, marginBottom: 4, borderColor: touched && !categoryId ? '#c0392b' : undefined }}
                value={categoryId} onChange={e => setCategoryId(e.target.value)}
                aria-invalid={touched && !categoryId}>
                <option value="">{cats ? 'Choose one…' : 'Loading categories…'}</option>
                {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                {cats && <option value="other">Other</option>}
              </select>
            )}
            {touched && !categoryId && <div style={{ fontSize: 12, color: '#c0392b', marginBottom: 8 }}>Please choose a category.</div>}

            {isOther && (
              <div style={{ marginTop: 10 }}>
                <label className="label" htmlFor="archive-other">{k.otherLabel} <span style={{ color: '#c0392b' }}>*</span></label>
                <input id="archive-other" className="input" required value={otherText} onChange={e => setOtherText(e.target.value)} disabled={uploading}
                  placeholder={k.otherPlaceholder} style={{ minHeight: 44, fontSize: 15, borderColor: touched && !otherText.trim() ? '#c0392b' : undefined }}
                  aria-invalid={touched && !otherText.trim()} />
                {touched && !otherText.trim() && <div style={{ fontSize: 12, color: '#c0392b', marginTop: 4 }}>Please tell us what these are.</div>}
              </div>
            )}

            {/* 2. Files */}
            <div style={{ marginTop: 20 }}>
              <Step n={2}>Add your files</Step>
              <input ref={fileInputRef} id="archive-files" type="file" multiple accept={k.accept}
                onChange={e => { addFiles(e.target.files); e.target.value = ''; }} style={{ display: 'none' }} />
              <button type="button" disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
                style={{
                  width: '100%', border: `1.5px dashed ${dragOver ? 'var(--gold)' : touched && !files.length ? '#c0392b' : 'var(--border)'}`,
                  borderRadius: 10, padding: '20px 14px', textAlign: 'center', cursor: 'pointer',
                  background: dragOver ? 'var(--light)' : 'var(--bg)', color: 'var(--gold)',
                }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}><UploadIcon size={26} /></div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{files.length ? 'Add more files' : 'Tap to choose files'}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{k.fileHint}</div>
              </button>
              {touched && !files.length && <div style={{ fontSize: 12, color: '#c0392b', marginTop: 4 }}>Please add at least one file.</div>}
              {files.length > 0 && (
                <>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>{files.length} file{files.length === 1 ? '' : 's'} selected</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
                    {files.map((f, i) => (
                      <FileThumb key={`${f.name}-${i}`} file={f} disabled={uploading} onRemove={() => setFiles(prev => prev.filter((_, j) => j !== i))} />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Optional details */}
            <details style={{ marginTop: 20 }}>
              <summary style={{ fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--gold)', padding: '6px 0' }}>
                Add details (optional)
              </summary>
              <div style={{ marginTop: 10 }}>
                {kind === 'document' && (
                  <div style={{ marginBottom: 12 }}>
                    <label className="label" htmlFor="archive-title">Document title (optional)</label>
                    <input id="archive-title" className="input" value={title} onChange={e => setTitle(e.target.value)} disabled={uploading}
                      placeholder="e.g. 2026 Annual Report" style={{ minHeight: 44, fontSize: 15 }} />
                  </div>
                )}
                <div style={{ marginBottom: 12 }}>
                  <label className="label" htmlFor="archive-desc">Description or notes (optional)</label>
                  <textarea id="archive-desc" className="input" rows={3} value={description} onChange={e => setDescription(e.target.value)} disabled={uploading}
                    placeholder={kind === 'photo' ? 'e.g. Volunteers re-shingling the north porch' : 'Anything that helps us file or find it later'}
                    style={{ resize: 'vertical', fontSize: 15 }} />
                </div>
                <div>
                  <label className="label" htmlFor="archive-date">{k.dateLabel}</label>
                  <input id="archive-date" type="date" className="input" value={date} onChange={e => setDate(e.target.value)} disabled={uploading}
                    max={new Date().toISOString().slice(0, 10)} style={{ minHeight: 44, fontSize: 15 }} />
                </div>
              </div>
            </details>

            {err && <div role="alert" style={{ color: '#c0392b', fontSize: 13, marginTop: 14 }}>{err}</div>}

            {uploading && progress && (
              <div style={{ marginTop: 16 }} aria-live="polite">
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>
                  Uploading {Math.min(progress.fileIndex + 1, progress.total)} of {progress.total}… {pct}%
                </div>
                <div style={{ height: 8, borderRadius: 4, background: 'var(--light)', overflow: 'hidden' }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'var(--gold)', transition: 'width 0.2s' }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Please keep this page open until it finishes.</div>
              </div>
            )}

            {/* 3. Submit */}
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button type="button" className="btn-ghost" style={{ flex: 1, minHeight: 48 }} onClick={() => { resetAll(); setScreen('home'); }} disabled={uploading}>Cancel</button>
              <button type="submit" className="btn-gold" style={{ flex: 2, minHeight: 48, fontSize: 15 }} disabled={uploading}>
                {uploading ? 'Uploading…' : files.length ? `Submit ${files.length} file${files.length === 1 ? '' : 's'}` : 'Submit'}
              </button>
            </div>
          </form>
        )}

        {screen === 'done' && result && (
          <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }} role="status">
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#e3f6ec', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", margin: '0 0 22px', lineHeight: 1.4 }}>
              Upload complete. Thank you for helping us keep North Star House records organized!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button type="button" className="btn-gold" style={{ minHeight: 48 }} onClick={() => { resetAll(); setScreen('choose'); }}>Upload More Files</button>
              {result.folderUrl && (
                <a href={result.folderUrl} target="_blank" rel="noreferrer" className="btn-ghost" style={{ minHeight: 48, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                  View uploads in Drive
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
