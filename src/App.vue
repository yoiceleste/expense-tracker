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
  /* 主色系 - 极简精致风 */
  --primary: #1A1A1A;
  --primary-light: #F5F5F5;
  --primary-gradient: #1A1A1A;
  --primary-gradient-soft: #FAFAFA;
  --primary-gradient-v: #1A1A1A;

  /* 点缀色 */
  --accent: #E76F51;
  --accent-light: #FDF0EC;

  /* 收支色 */
  --income: #2D6A4F;
  --income-light: #E8F5EE;
  --expense: #E76F51;
  --expense-light: #FDF0EC;

  /* 背景与卡片 */
  --bg: #FAFAFA;
  --bg-trip: #FFFFFF;
  --card-bg: #ffffff;
  --card-bg-soft: rgba(255, 255, 255, 0.92);

  /* 文字 */
  --text: #1A1A1A;
  --text-secondary: #999999;
  --text-tertiary: #CCCCCC;

  /* 边框与阴影 */
  --border: #ECECEC;
  --border-light: #F5F5F5;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 4px 24px rgba(0, 0, 0, 0.06);
  --shadow-accent: 0 2px 12px rgba(231, 111, 81, 0.12);

  /* 圆角 */
  --radius: 10px;
  --radius-lg: 14px;
  --radius-xl: 18px;
  --radius-full: 9999px;
  --nav-height: 60px;

  /* 字体 */
  --font-display: 'Fraunces', 'Songti SC', 'SimSun', serif;
  --font-body: 'Plus Jakarta Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

body {
  font-family: var(--font-body);
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ===== 旅行主题通用样式 ===== */

.trip-page {
  min-height: calc(100vh - var(--nav-height));
  padding-bottom: 40px;
}

/* 旅行页面顶部区域 */
.trip-hero-bg {
  position: relative;
  background: var(--bg-trip);
  padding: 0 20px 24px;
  overflow: hidden;
}

.trip-hero-bg::before {
  display: none;
}

.trip-hero-bg::after {
  display: none;
}

/* 旅行通用返回导航栏 */
.trip-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 0 16px;
  position: relative;
  z-index: 1;
}

.trip-nav-back {
  width: 36px;
  height: 36px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  border-radius: var(--radius);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: none;
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.trip-nav-back:active {
  transform: scale(0.93);
  border-color: var(--text);
}

.trip-nav-title {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 500;
  color: var(--text);
  letter-spacing: 0;
  font-style: italic;
}

.trip-nav-placeholder {
  width: 36px;
}

/* 玻璃卡片 */
.glass-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

/* 旅行 FAB 按钮 */
.trip-fab {
  position: fixed;
  bottom: calc(var(--nav-height) + 20px);
  right: calc(50% - 240px + 20px);
  width: 52px;
  height: 52px;
  border: none;
  background: var(--text);
  color: white;
  border-radius: var(--radius);
  font-size: 26px;
  font-weight: 300;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.trip-fab:active {
  transform: scale(0.90);
}

@media (max-width: 480px) {
  .trip-fab {
    right: 20px;
  }
}

/* 旅行主题 section 标题 */
.trip-section-title {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 0 20px;
  margin-bottom: 12px;
}

/* 旅行主题空状态 */
.trip-empty {
  text-align: center;
  padding: 80px 24px;
}

.trip-empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  filter: grayscale(0.5) opacity(0.4);
}

.trip-empty-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 400;
  color: var(--text);
  margin-bottom: 8px;
  font-style: italic;
}

.trip-empty-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* 入场动画 */
@keyframes tripSlideUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.trip-animate-in {
  animation: tripSlideUp 0.5s ease forwards;
  opacity: 0;
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
