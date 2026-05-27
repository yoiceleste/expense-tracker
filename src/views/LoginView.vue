<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-logo">💰</div>
      <h1 class="login-title">记账本</h1>
      <p class="login-subtitle">{{ isLogin ? '登录你的账号' : '创建新账号' }}</p>

      <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

      <div class="form-group">
        <input
          v-model="email"
          type="email"
          class="input"
          placeholder="邮箱地址"
          autocomplete="email"
        />
      </div>
      <div class="form-group">
        <input
          v-model="password"
          type="password"
          class="input"
          placeholder="密码（至少6位）"
          autocomplete="current-password"
        />
      </div>

      <button
        class="btn btn-primary btn-block"
        :disabled="loading"
        @click="handleSubmit"
      >
        {{ loading ? '请稍候...' : (isLogin ? '登 录' : '注 册') }}
      </button>

      <div class="switch-mode" @click="isLogin = !isLogin; errorMsg = ''">
        {{ isLogin ? '没有账号？去注册' : '已有账号？去登录' }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { signIn, signUp, currentUser, currentSession } from '../lib/auth'
import { useExpenseStore } from '../stores/expense'
import { useTripStore } from '../stores/trip'

const router = useRouter()
const route = useRoute()
const expenseStore = useExpenseStore()
const tripStore = useTripStore()
const email = ref('')
const password = ref('')
const isLogin = ref(true)
const loading = ref(false)
const errorMsg = ref('')

async function handleSubmit() {
  errorMsg.value = ''
  if (!email.value.trim()) { errorMsg.value = '请输入邮箱'; return }
  if (password.value.length < 6) { errorMsg.value = '密码至少6位'; return }

  loading.value = true
  try {
    if (isLogin.value) {
      await signIn(email.value.trim(), password.value)
    } else {
      await signUp(email.value.trim(), password.value)
    }
    // 登录成功后初始化数据
    await Promise.all([
      expenseStore.init(),
      tripStore.init(),
    ])
    const redirect = (route.query.redirect as string) || '/home'
    router.replace(redirect)
  } catch (err: any) {
    const msg = err?.message || '操作失败'
    if (msg.includes('Invalid login')) {
      errorMsg.value = '邮箱或密码错误'
    } else if (msg.includes('already registered')) {
      errorMsg.value = '该邮箱已注册，请直接登录'
    } else if (msg.includes('Email not confirmed')) {
      errorMsg.value = '请先到邮箱确认注册'
    } else {
      errorMsg.value = msg
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--bg);
}

.login-card {
  background: var(--card-bg);
  border-radius: 20px;
  padding: 40px 28px;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  text-align: center;
}

.login-logo {
  font-size: 56px;
  margin-bottom: 8px;
}

.login-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 4px;
}

.login-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 28px;
}

.error-msg {
  background: var(--expense-light);
  color: var(--expense);
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 16px;
  text-align: left;
}

.form-group {
  margin-bottom: 14px;
}

.form-group .input {
  text-align: center;
  font-size: 15px;
  padding: 12px 14px;
}

.btn-block {
  margin-top: 8px;
  padding: 13px;
  font-size: 16px;
  font-weight: 600;
}

.btn-block:disabled {
  opacity: 0.6;
}

.switch-mode {
  margin-top: 20px;
  font-size: 13px;
  color: var(--primary);
  cursor: pointer;
}

.switch-mode:active {
  opacity: 0.7;
}
</style>
