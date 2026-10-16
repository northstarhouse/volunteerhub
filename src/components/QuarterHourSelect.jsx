// A time picker limited to quarter hours (:00 / :15 / :30 / :45), as one
// compact dropdown. Native <input type="time"> can't reliably restrict the
// minutes across browsers. Value is "HH:MM" (24h), like <input type="time">.
const START_HOUR = 7;
const END_HOUR = 21; // last option 9:00 PM

const label = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

const OPTIONS = [];
for (let h = START_HOUR; h <= END_HOUR; h++) {
  for (const m of [0, 15, 30, 45]) {
    if (h === END_HOUR && m > 0) break;
    OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

export default function QuarterHourSelect({ value, onChange, disabled, style, ariaLabel = 'Time' }) {
  const v = (value || '').slice(0, 5);
  // keep an existing off-grid time visible rather than silently changing it
  const options = v && !OPTIONS.includes(v) ? [v, ...OPTIONS] : OPTIONS;
  return (
    <select aria-label={ariaLabel} disabled={disabled} value={v} onChange={(e) => onChange(e.target.value)} style={{ appearance: 'auto', ...style }}>
      <option value="">Time…</option>
      {options.map((o) => <option key={o} value={o}>{label(o)}</option>)}
    </select>
  );
}
