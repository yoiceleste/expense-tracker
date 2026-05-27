import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yjzlmbtioutsfkbofgks.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqemxtYnRpb3V0c2ZrYm9mZ2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MTQxMDMsImV4cCI6MjA5NTM5MDEwM30.r0GZrcYKRtJrMaQbnvYWa1vxi9M0QyOI6HNZpjlEeeY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
