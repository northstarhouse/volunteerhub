import { useState } from 'react';
import { useVol } from '../App.jsx';
import { supabase } from '../supabase.js';

const CATEGORIES = [
  'General Feedback',
  'Suggestion or Idea',
  'Question',
  'Shout-Out / Recognition',
  'Issue or Concern',
];

export default function Feedback() {
  const { volunteer, session } = useVol();
  const [category, setCategory] = useState('');
  const [message, setMessage]   = useState('');
  const [anon, setAnon]         = useState(false);
  const [busy, setBusy]         = useState(false);
  const [done, setDone]         = useState(false);
  const [err, setErr]           = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim()) { setErr('Please write a message before submitting.'); return; }
    setBusy(true); setErr('');

    const name = anon ? null : `${volunteer['First Name'] || ''} ${volunteer['Last Name'] || ''}`.trim();
    const { error } = await supabase.from('vol_feedback').insert({
      auth_user_id:   session.user.id,
      volunteer_name: name,
      category:       category || null,
      message:        message.trim(),
      anonymous:      anon,
    });

    if (error) {
      setErr('Failed to send. Please try again.');
      setBusy(false);
      return;
    }

    setDone(true);
    setBusy(false);
  }

  function reset() {
    setCategory('');
    setMessage('');
    setAnon(false);
    setErr('');
    setDone(false);
  }

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '22px 18px 14px', borderBottom: '0.5px solid var(--border-light)' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 500, marginBottom: 2 }}>
          Share Your Thoughts
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif" }}>Feedback</div>
      </div>

      <div style={{ padding: '14px 14px 0' }}>
        {done ? (
          <div className="card" style={{ textAlign: 'center', padding: 36 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>💌</div>
            <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", marginBottom: 8 }}>Thank you!</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 22, lineHeight: 1.6 }}>
              Your feedback has been received. We appreciate you taking the time to share.
            </div>
            <button onClick={reset} className="btn-ghost">Send Another</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="card">
              <div style={{ marginBottom: 14 }}>
                <div className="label">Category</div>
                <select
                  className="input"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  style={{ appearance: 'auto' }}
                >
                  <option value="">Select a category (optional)</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div className="label">Message *</div>
                <textarea
                  className="input"
                  rows={5}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Share your feedback, ideas, questions, or shout-outs…"
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 16, padding: '10px 12px', background: 'var(--bg)', borderRadius: 8 }}>
                <input
                  type="checkbox"
                  checked={anon}
                  onChange={e => setAnon(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--gold)' }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Submit anonymously</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Your name won't be attached to this feedback.</div>
                </div>
              </label>

              {!anon && (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8 }}>
                  Submitting as <strong>{volunteer['First Name']} {volunteer['Last Name']}</strong>
                </div>
              )}

              {err && <div style={{ color: '#c0392b', fontSize: 12, marginBottom: 12 }}>{err}</div>}

              <button type="submit" className="btn-gold" disabled={busy || !message.trim()} style={{ width: '100%', padding: 11 }}>
                {busy ? 'Sending…' : 'Send Feedback'}
              </button>
            </div>

            <div style={{ fontSize: 11, color: '#bbb', textAlign: 'center', marginTop: 12, lineHeight: 1.6 }}>
              Feedback goes directly to coordinators and is reviewed regularly.
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
