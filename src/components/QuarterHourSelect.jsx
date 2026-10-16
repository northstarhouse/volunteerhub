// Tour time as two fields: hour (with AM/PM, 7 AM-9 PM) and minutes limited
// to 00 / 15 / 30 / 45. Native <input type="time"> can't reliably restrict
// the minutes across browsers. Value is "HH:MM" (24h), like <input type="time">.
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7..21
const MINUTES = ['00', '15', '30', '45'];
const hourLabel = (h) => `${h % 12 || 12} ${h >= 12 ? 'PM' : 'AM'}`;

export default function QuarterHourSelect({ value, onChange, disabled, style, ariaLabel = 'Time' }) {
  const [hStr, mStr] = (value || '').slice(0, 5).split(':');
  const hour = hStr ? Number(hStr) : '';
  const minute = mStr || '00';
  // keep an existing off-grid value visible rather than silently changing it
  const hours = hour !== '' && !HOURS.includes(hour) ? [hour, ...HOURS] : HOURS;
  const minutes = !MINUTES.includes(minute) ? [minute, ...MINUTES] : MINUTES;
  const set = (h, m) => onChange(h === '' ? '' : `${String(h).padStart(2, '0')}:${m}`);
  const box = { appearance: 'auto', ...style };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <select aria-label={`${ariaLabel} hour`} disabled={disabled} value={hour} onChange={(e) => set(e.target.value === '' ? '' : Number(e.target.value), minute)} style={box}>
        <option value="">Hour</option>
        {hours.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
      </select>
      <span aria-hidden="true">:</span>
      <select aria-label={`${ariaLabel} minutes`} disabled={disabled} value={minute} onChange={(e) => set(hour === '' ? 12 : hour, e.target.value)} style={box}>
        {minutes.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
    </span>
  );
}
