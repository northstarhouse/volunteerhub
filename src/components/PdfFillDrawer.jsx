import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PDFViewer, EventBus, PDFLinkService } from 'pdfjs-dist/legacy/web/pdf_viewer.mjs';
import 'pdfjs-dist/legacy/web/pdf_viewer.css';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { fetchOnboardingDoc, saveOnboardingDoc } from '../lib/db.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromBase64(b64) {
  const bin = atob(b64), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Fills in and locks the fields North Star completes itself (e.g. the employer section of the wage notice).
async function preparedSource(url, prefill) {
  const buf = await (await fetch(url)).arrayBuffer();
  if (!prefill) return { data: new Uint8Array(buf) };
  const { PDFDocument } = await import('pdf-lib');
  const pdf = await PDFDocument.load(buf);
  const form = pdf.getForm();
  Object.entries(prefill.text || {}).forEach(([n, v]) => { try { form.getTextField(n).setText(v); } catch (e) { /* field missing */ } });
  Object.entries(prefill.radio || {}).forEach(([n, v]) => { try { form.getRadioGroup(n).select(v); } catch (e) { /* field missing */ } });
  (prefill.lock || []).forEach(n => { try { form.getField(n).enableReadOnly(); } catch (e) { /* field missing */ } });
  return { data: await pdf.save() };
}

// The official PDF with its form fields live: type straight onto it, then Save puts the filled copy in the packet.
export default function PdfFillDrawer({ url, packetId, docKey, readOnly, prefill, onSaved }) {
  const box = useRef(null);
  const viewerEl = useRef(null);
  const docRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let dead = false, task = null;
    (async () => {
      try {
        const saved = await fetchOnboardingDoc(packetId, docKey).catch(() => null);
        const src = saved ? { data: fromBase64(saved) } : await preparedSource(url, prefill);
        task = pdfjsLib.getDocument({ ...src, isEvalSupported: false });
        const doc = await task.promise;
        if (dead) return;
        docRef.current = doc;
        const eventBus = new EventBus();
        const linkService = new PDFLinkService({ eventBus });
        const viewer = new PDFViewer({ container: box.current, viewer: viewerEl.current, eventBus, linkService, annotationMode: readOnly ? 1 : 2, removePageBorders: true });
        linkService.setViewer(viewer);
        eventBus.on('pagesinit', () => { viewer.currentScaleValue = 'page-width'; });
        viewer.setDocument(doc);
        linkService.setDocument(doc, null);
        setStatus('ready');
      } catch (e) { console.error('PDFERR', e && (e.stack || e.message || e)); if (!dead) { setStatus('error'); setMsg('This form could not be opened.'); } }
    })();
    return () => { dead = true; try { task && task.destroy(); } catch (e) { /* closing */ } };
  }, [url, packetId, docKey, readOnly]);

  const save = async () => {
    if (!docRef.current) return;
    setStatus('saving'); setMsg('');
    try {
      const bytes = await docRef.current.saveDocument();
      const ok = await saveOnboardingDoc(packetId, docKey, toBase64(bytes));
      if (!ok) throw new Error('save failed');
      setStatus('ready'); setMsg('Saved to your packet.');
      onSaved && onSaved();
    } catch (e) { setStatus('ready'); setMsg('Could not save. Please try again.'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ position: 'relative', flex: 1, minHeight: 0, background: '#e9e4da' }}>
        <div ref={box} style={{ position: 'absolute', inset: 0, overflow: 'auto' }}>
          <div ref={viewerEl} className="pdfViewer" />
        </div>
        {status === 'loading' && <div style={{ position: 'absolute', top: 16, left: 16, fontSize: 13, color: '#6b5f4c' }}>Opening form…</div>}
      </div>
      {!readOnly && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 14px', borderTop: '1px solid #e0d8cc', background: '#fff' }}>
          <div style={{ fontSize: 12, color: msg.startsWith('Saved') ? '#15803d' : '#c0392b' }}>{msg}</div>
          <button className="btn-gold" disabled={status !== 'ready'} onClick={save}>{status === 'saving' ? 'Saving…' : 'Save my answers'}</button>
        </div>
      )}
      {status === 'error' && <div style={{ padding: 14, color: '#c0392b', fontSize: 13 }}>{msg}</div>}
    </div>
  );
}
