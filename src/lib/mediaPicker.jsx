// The photo picker for the website event form. The Portal's copy of this app swaps this file for the real media
// library (see scripts/sync-hub-events-committee.mjs in the Portal); here, photos are chosen in the Portal.
export function MediaPicker({ onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fdfcfb', borderRadius: 12, maxWidth: 420, padding: 20, fontSize: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Choose a photo in the Portal</div>
        <div style={{ marginBottom: 14 }}>The photo library is in the Portal. Open this event there to choose its photo.</div>
        <button className="btn-gold" onClick={onClose}>OK</button>
      </div>
    </div>
  );
}
