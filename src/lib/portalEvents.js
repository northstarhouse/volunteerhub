import { supabase } from '../supabase.js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const PORTAL_URL = 'https://northstarhouse.github.io/Portal/';

// Keep the Portal's requests and payloads, using the volunteer's existing session.
export async function eventOverviewRequest(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers(options.headers);
  headers.set('apikey', SUPABASE_KEY);
  headers.set('Authorization', `Bearer ${session?.access_token || SUPABASE_KEY}`);
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const details = await response.clone().json().catch(() => ({}));
    throw new Error(details.message || details.error || `Event request failed (${response.status}). Please try again.`);
  }
  return response;
}

export function openPortal(view) {
  window.open(PORTAL_URL + '#' + view, '_blank', 'noopener,noreferrer');
}

export function openPlanPreview(id, onDone) {
  openPortal('event-plan/' + encodeURIComponent(id));
  onDone?.();
}
