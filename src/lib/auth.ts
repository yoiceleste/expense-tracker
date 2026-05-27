/**
 * 认证模块 - Supabase Auth 封装
 */
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

// 当前用户
export let currentUser: User | null = null
export let currentSession: Session | null = null

// 监听认证状态变化
supabase.auth.onAuthStateChange((_event, session) => {
  currentSession = session
  currentUser = session?.user ?? null
})

// 获取当前用户 ID
export function getUserId(): string | null {
  return currentUser?.id ?? null
}

// 邮箱注册
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  return data
}

// 邮箱登录
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  currentUser = data.user
  currentSession = data.session
  return data
}

// 退出登录
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  currentUser = null
  currentSession = null
}

// 获取当前 session
export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  currentSession = data.session
  currentUser = data.session?.user ?? null
  return data.session
}

// 检查是否已登录
export async function isLoggedIn(): Promise<boolean> {
  await getSession()
  return currentUser !== null
}
