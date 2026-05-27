<template>
  <div class="app">
    <!-- 加载中 -->
    <div v-if="loading" class="loading-page">
      <div class="loading-spinner">💰</div>
      <div class="loading-text">加载中...</div>
    </div>

    <template v-else>
      <div class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
      <nav v-if="showBottomNav" class="bottom-nav">
        <router-link to="/home" class="nav-item" :class="{ active: $route.path === '/home' }">
          <span class="nav-icon">🏠</span>
          <span class="nav-label">首页</span>
        </router-link>
        <router-link to="/trips" class="nav-item" :class="{ active: $route.path === '/trips' }">
          <span class="nav-icon">✈️</span>
          <span class="nav-label">旅行</span>
        </router-link>
        <a class="nav-item add-btn" @click="onAddClick">
          <span class="add-icon">+</span>
        </a>
        <router-link to="/stats" class="nav-item" :class="{ active: $route.path === '/stats' }">
          <span class="nav-icon">📊</span>
          <span class="nav-label">统计</span>
        </router-link>
        <router-link to="/settings" class="nav-item" :class="{ active: $route.path === '/settings' }">
          <span class="nav-icon">⚙️</span>
          <span class="nav-label">设置</span>
        </router-link>
      </nav>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useExpenseStore } from './stores/expense'
import { useTripStore } from './stores/trip'
import { getSession } from './lib/auth'

const route = useRoute()
const router = useRouter()
const expenseStore = useExpenseStore()
const tripStore = useTripStore()

const loading = ref(true)

const showBottomNav = computed(() => {
  const path = route.path
  return !path.startsWith('/trip/') && path !== '/login'
})

function onAddClick() {
  const path = route.path
  if (path === '/trips') {
    router.push({ path: '/trips', query: { create: '1' } })
    return
  }
  router.push('/add')
}

onMounted(async () => {
  try {
    const session = await getSession()
    if (session) {
      // 已登录，初始化数据
      await Promise.all([
        expenseStore.init(),
        tripStore.init(),
      ])
    }
  } catch (err) {
    console.error('App init error:', err)
  } finally {
    loading.value = false
  }
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --primary: #4f6ef7;
  --primary-light: #eef1fe;
  --income: #52c41a;
  --income-light: #f6ffed;
  --expense: #ff4d4f;
  --expense-light: #fff2f0;
  --bg: #f5f6fa;
  --card-bg: #ffffff;
  --text: #1a1a2e;
  --text-secondary: #8c8c8c;
  --border: #e8e8e8;
  --shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  --radius: 12px;
  --nav-height: 60px;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}

.app {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  position: relative;
  background: var(--bg);
}

.main-content {
  padding-bottom: calc(var(--nav-height) + 20px);
}

/* 加载页 */
.loading-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.loading-spinner {
  font-size: 48px;
  animation: pulse 1.5s ease-in-out infinite;
}

.loading-text {
  font-size: 14px;
  color: var(--text-secondary);
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* 底部导航 */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  height: var(--nav-height);
  background: var(--card-bg);
  display: flex;
  align-items: center;
  justify-content: space-around;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.06);
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  color: var(--text-secondary);
  font-size: 11px;
  gap: 2px;
  transition: color 0.2s;
}

.nav-item.active {
  color: var(--primary);
}

.nav-icon {
  font-size: 22px;
}

.nav-label {
  font-size: 11px;
}

.add-btn {
  position: relative;
  top: -12px;
}

.add-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, var(--primary), #7b93ff);
  color: white;
  border-radius: 50%;
  font-size: 28px;
  font-weight: 300;
  box-shadow: 0 4px 12px rgba(79, 110, 247, 0.4);
  transition: transform 0.2s;
}

.add-btn:active .add-icon {
  transform: scale(0.92);
}

/* 页面过渡 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 通用卡片 */
.card {
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 16px;
  box-shadow: var(--shadow);
  margin-bottom: 12px;
}

/* 通用按钮 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:active {
  background: #3d5bd9;
}

.btn-danger {
  background: var(--expense);
  color: white;
}

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
}

.btn-block {
  width: 100%;
}

/* 输入框 */
.input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  background: var(--card-bg);
}

.input:focus {
  border-color: var(--primary);
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.empty-state .icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-state .text {
  font-size: 14px;
}

/* 页面头部 */
.page-header {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
}
</style>
