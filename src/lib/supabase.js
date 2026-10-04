import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Faltan las variables VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. ' +
    'Copia .env.example a .env y completa los valores desde tu proyecto de Supabase ' +
    '(Project Settings > API).'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
