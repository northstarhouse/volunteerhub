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
  },
})
