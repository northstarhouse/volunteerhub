import { useCallback, useState } from 'react';
import { useVol } from '../App.jsx';
import PortalEventOverviews from './PortalEventOverviews.jsx';
import { eventOverviewRequest, openPortal } from '../lib/portalEvents.js';

export default function EventOverviews() {
  const { setView } = useVol();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const request = useCallback(async (...args) => {
    try {
      return await eventOverviewRequest(...args);
    } catch (err) {
      setError(err.message || 'Could not load event information. Please try again.');
      throw err;
    }
  }, []);
  function navigate(view) {
    if (view === 'admin') setView('dashboard');
    else openPortal(view);
  }

  return <div className="portal-event-overviews">
    <header style={{ padding: '22px 20px 16px', background: '#fff', borderBottom: '0.5px solid var(--border-light)' }}>
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: 'var(--gold)', fontFamily: "'Cardo',serif", textShadow: '1px 2px 0px rgba(136,108,68,0.2)' }}>Event Overviews</h1>
    </header>
    <div className="portal-event-content">
      {error && <div role="alert" className="card" style={{ marginBottom: 16 }}>
        {error}
        <button className="btn-ghost" style={{ marginLeft: 12 }} onClick={() => { setError(''); setAttempt(n => n + 1); }}>Retry</button>
      </div>}
      <PortalEventOverviews key={attempt} navigate={navigate} request={request} />
    </div>
  </div>;
}
