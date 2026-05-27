import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yjzlmbtioutsfkbofgks.supabase.co'
const supabaseAnonKey = 'sb_publishable_W6ut6uDEeMxoZarGNbGsZg_QMJrvZAI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
