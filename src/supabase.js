import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars. Copy .env.example to .env and fill in your credentials.')
}

// Capture auth type from URL hash BEFORE the client can clear it.
// With implicit flow, invite/recovery links look like: #access_token=...&type=invite
const _hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
export const initialAuthType = _hash.get('type') // 'invite' | 'recovery' | 'signup' | null

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'implicit', // puts tokens in hash so we can read type=invite / type=recovery
    // Explicit (matches supabase-js defaults, but stated outright so a signed-in
    // volunteer stays signed in across visits/reloads instead of being asked to
    // log in every time -- the session is persisted to localStorage and its
    // access token silently refreshed in the background).
    persistSession: true,
    autoRefreshToken: true,
    storage: window.localStorage,
  },
})
