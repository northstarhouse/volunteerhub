// The photo picker for the website event form: the website photo library, signed in as the Hub user.
// (The Portal's copy of this app swaps this file for the Portal's own media library; see the Portal's sync script.)
import { useState, useEffect } from 'react';
import { MediaPicker as Library } from './mediaLibrary.jsx';
import { supabase } from '../supabase.js';

export function MediaPicker({ supabaseUrl, supabaseKey, onPick, onClose }) {
  const [token, setToken] = useState(null);
  useEffect(() => { supabase.auth.getSession().then(({ data }) => setToken((data.session && data.session.access_token) || '')); }, []);
  if (token === null) return null;
  return <Library supabaseUrl={supabaseUrl} supabaseKey={supabaseKey} authToken={token} onPick={onPick} onClose={onClose} />;
}
