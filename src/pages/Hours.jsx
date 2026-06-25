import { useState, useEffect } from 'react';
import { useVol } from '../App.jsx';
import { fetchHours, getVolunteerHours, MONTHS } from '../lib/db.js';

function Bar({ value, max }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ height: 6, background: 'var(--light)', borderRadius: 3, overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--gold)', borderRadius: 3, transition: 'width 0.4s ease' }} />
    </div>
  );
}

export default function Hours() {
  const { volunteer } = useVol();
  const [hoursMap, setHoursMap] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  useEffect(() => {
    fetchHours().then(map => {
      setHoursMap(map);
      setLoading(false);
    }).catch(() => {
      setError(true);
      setLoading(false);
    });
  }, []);

  const data = hoursMap && !loading
    ? getVolunteerHours(hoursMap, volunteer['First Name'], volunteer['Last Name'])
    : null;

  const monthsWithHours = data
    ? MONTHS.map(m => ({ m, h: data.months[m] || 0 })).filter(x => x.h > 0)
    : [];
  const maxMonth = monthsWithHours.length > 0 ? Math.max(...monthsWithHours.map(x => x.h)) : 0;

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '22px 18px 14px', borderBottom: '0.5px solid var(--border-light)' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 500, marginBottom: 2 }}>
          {new Date().getFullYear()} Log
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif" }}>My Hours</div>
      </div>

      <div style={{ padding: '14px 14px 0' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13 }}>Loading hours…</div>
        )}

        {error && (
          <div className="card">
            <div style={{ fontSize: 13, color: '#c0392b', textAlign: 'center' }}>
              Couldn't load hours right now. Please try again later.
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Total */}
            <div className="card" style={{ marginBottom: 14, textAlign: 'center' }}>
              {data ? (
                <>
                  <div style={{ fontSize: 48, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", color: 'var(--gold)', lineHeight: 1 }}>
                    {data.total % 1 === 0 ? data.total : data.total.toFixed(1)}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>hours volunteered in {new Date().getFullYear()}</div>
                  {data.total > 0 && (
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 6 }}>
                      That's roughly {Math.round(data.total / 8)} full days of impact. Thank you!
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 40, fontWeight: 700, fontFamily: "'Cardo','Georgia',serif", color: 'var(--border)', lineHeight: 1 }}>—</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>No hours logged yet for {new Date().getFullYear()}</div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 6 }}>
                    Hours are tracked at the kiosk. Check in at your next shift!
                  </div>
                </>
              )}
            </div>

            {/* Monthly breakdown */}
            {monthsWithHours.length > 0 && (
              <div className="card">
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)', marginBottom: 14 }}>Monthly Breakdown</div>
                {MONTHS.map(m => {
                  const h = data?.months[m] || 0;
                  if (h === 0) return null;
                  return (
                    <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 28, fontSize: 11, color: 'var(--muted)', fontWeight: 500, flexShrink: 0 }}>{m}</div>
                      <Bar value={h} max={maxMonth} />
                      <div style={{ width: 34, fontSize: 12, fontWeight: 600, color: 'var(--text)', textAlign: 'right', flexShrink: 0 }}>
                        {h % 1 === 0 ? h : h.toFixed(1)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {data && monthsWithHours.length === 0 && (
              <div className="card">
                <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>No monthly detail available.</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
