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
  /* 主色系 - 手账自然风 */
  --primary: #7BA05B;
  --primary-light: #F0F4E8;
  --primary-gradient: linear-gradient(135deg, #7BA05B 0%, #9BC46B 100%);
  --primary-gradient-soft: linear-gradient(135deg, #F0F4E8 0%, #F5F0E8 100%);
  --primary-gradient-v: linear-gradient(180deg, #7BA05B 0%, #9BC46B 100%);

  /* 点缀色 */
  --accent: #E07856;
  --accent-light: #FDF0EC;
  --washi: #F5E6C8;

  /* 收支色 */
  --income: #7BA05B;
  --income-light: #F0F4E8;
  --expense: #E07856;
  --expense-light: #FDF0EC;

  /* 背景与卡片 */
  --bg: #FAF6F0;
  --bg-trip: #FAF6F0;
  --card-bg: #FFFCF7;
  --card-bg-soft: rgba(255, 252, 247, 0.92);

  /* 文字 */
  --text: #5C4A3A;
  --text-secondary: #A0927E;
  --text-tertiary: #C9BBA8;

  /* 边框与阴影 */
  --border: #E8DCC8;
  --border-light: #F0E8D8;
  --shadow: 0 2px 8px rgba(92, 74, 58, 0.06);
  --shadow-lg: 0 6px 20px rgba(92, 74, 58, 0.08);
  --shadow-accent: 0 3px 12px rgba(224, 120, 86, 0.12);

  /* 圆角 */
  --radius: 14px;
  --radius-lg: 18px;
  --radius-xl: 22px;
  --radius-full: 9999px;
  --nav-height: 60px;

  /* 字体 */
  --font-display: 'Caveat', 'PingFang SC', 'Microsoft YaHei', cursive;
  --font-body: 'M PLUS Rounded 1c', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

body {
  font-family: var(--font-body);
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  /* 纸质纹理背景 */
  background-image:
    radial-gradient(circle, rgba(160, 146, 126, 0.06) 1px, transparent 1px),
    radial-gradient(circle, rgba(123, 160, 91, 0.03) 1px, transparent 1px);
  background-size: 24px 24px, 48px 48px;
  background-position: 0 0, 12px 12px;
}

/* ===== 手账装饰元素 ===== */

/* 和纸胶带 (washi tape) */
.washi-tape {
  position: absolute;
  width: 60px;
  height: 20px;
  background: var(--washi);
  opacity: 0.75;
  z-index: 2;
  pointer-events: none;
  box-shadow: 0 1px 3px rgba(92, 74, 58, 0.1);
}

.washi-tape::before,
.washi-tape::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 4px;
  background-image: linear-gradient(45deg, transparent 33%, rgba(255,255,255,0.3) 33%, rgba(255,255,255,0.3) 66%, transparent 66%);
  background-size: 6px 6px;
}

.washi-tape::before { left: 0; }
.washi-tape::after { right: 0; }

.washi-tape-green {
  background: #C5D5A8;
}

.washi-tape-orange {
  background: #F5C9A8;
}

.washi-tape-pink {
  background: #F5C5C5;
}

/* 手绘虚线边框 */
.hand-drawn-border {
  border: 2px dashed var(--border);
  border-radius: var(--radius-lg);
}

/* 手绘涂鸦装饰 */
.doodle {
  position: absolute;
  pointer-events: none;
  opacity: 0.4;
  z-index: 0;
}

/* 贴纸效果 */
.sticker {
  filter: drop-shadow(0 2px 4px rgba(92, 74, 58, 0.1));
  border: 3px solid white;
  border-radius: 50%;
}

/* 轻微旋转 - 模拟手工粘贴 */
.tilt-left { transform: rotate(-1.5deg); }
.tilt-right { transform: rotate(1.5deg); }
.tilt-left-2 { transform: rotate(-0.8deg); }
.tilt-right-2 { transform: rotate(0.8deg); }

/* ===== 旅行主题通用样式 ===== */

.trip-page {
  min-height: calc(100vh - var(--nav-height));
  padding-bottom: 40px;
}

/* 旅行页面顶部区域 - 牛皮纸质感 */
.trip-hero-bg {
  position: relative;
  background: var(--bg-trip);
  padding: 0 20px 24px;
  overflow: hidden;
}

.trip-hero-bg::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    radial-gradient(circle, rgba(160, 146, 126, 0.08) 1px, transparent 1px),
    linear-gradient(180deg, rgba(245, 230, 200, 0.15) 0%, transparent 50%);
  background-size: 20px 20px, 100% 100%;
  pointer-events: none;
}

.trip-hero-bg::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background-image: repeating-linear-gradient(90deg, var(--border) 0, var(--border) 8px, transparent 8px, transparent 16px);
  opacity: 0.3;
  pointer-events: none;
}

/* 旅行通用返回导航栏 */
.trip-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0 12px;
  position: relative;
  z-index: 1;
}

.trip-nav-back {
  width: 38px;
  height: 38px;
  border: 2px solid var(--border);
  background: var(--card-bg);
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(92, 74, 58, 0.06);
  transition: transform 0.15s ease;
}

.trip-nav-back:active {
  transform: scale(0.90) rotate(-5deg);
}

.trip-nav-title {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: 0;
}

.trip-nav-placeholder {
  width: 38px;
}

/* 纸质卡片 */
.glass-card {
  background: var(--card-bg);
  border: 2px solid var(--border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  position: relative;
}

.glass-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: inherit;
  background-image: radial-gradient(circle, rgba(160, 146, 126, 0.03) 1px, transparent 1px);
  background-size: 16px 16px;
  pointer-events: none;
  opacity: 0.5;
}

/* 旅行 FAB 按钮 */
.trip-fab {
  position: fixed;
  bottom: calc(var(--nav-height) + 20px);
  right: calc(50% - 240px + 20px);
  width: 56px;
  height: 56px;
  border: none;
  background: var(--primary-gradient);
  color: white;
  border-radius: 50%;
  font-size: 28px;
  font-weight: 400;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(123, 160, 91, 0.3);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.trip-fab:active {
  transform: scale(0.88) rotate(90deg);
}

@media (max-width: 480px) {
  .trip-fab {
    right: 20px;
  }
}

/* 旅行主题 section 标题 */
.trip-section-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0;
  padding: 0 20px;
  margin-bottom: 10px;
}

/* 旅行主题空状态 */
.trip-empty {
  text-align: center;
  padding: 60px 24px;
}

.trip-empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.trip-empty-title {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 8px;
}

.trip-empty-desc {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* 入场动画 */
@keyframes tripSlideUp {
  from {
    opacity: 0;
    transform: translateY(12px) rotate(-0.5deg);
  }
  to {
    opacity: 1;
    transform: translateY(0) rotate(0deg);
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
  background: var(--bg);
  background-image: radial-gradient(circle, rgba(160, 146, 126, 0.06) 1px, transparent 1px);
  background-size: 24px 24px;
}

.loading-spinner {
  font-size: 48px;
  animation: bounce-soft 1.2s ease-in-out infinite;
}

.loading-text {
  font-family: var(--font-display);
  font-size: 18px;
  color: var(--text-secondary);
}

@keyframes bounce-soft {
  0%, 100% { transform: scale(1) rotate(-3deg); }
  50% { transform: scale(1.15) rotate(3deg); }
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
  box-shadow: 0 -2px 12px rgba(92, 74, 58, 0.06);
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom);
  border-top: 2px dashed var(--border-light);
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
  background: var(--primary-gradient);
  color: white;
  border-radius: 50%;
  font-size: 28px;
  font-weight: 300;
  box-shadow: 0 4px 12px rgba(123, 160, 91, 0.3);
  transition: transform 0.2s;
  border: 3px solid var(--card-bg);
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
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  font-family: var(--font-body);
}

.btn-primary {
  background: var(--primary-gradient);
  color: white;
  box-shadow: 0 2px 8px rgba(123, 160, 91, 0.2);
}

.btn-primary:active {
  transform: scale(0.96);
  box-shadow: 0 1px 4px rgba(123, 160, 91, 0.15);
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
  border: 2px solid var(--border-light);
  border-radius: var(--radius);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: var(--card-bg);
  font-family: var(--font-body);
}

.input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(123, 160, 91, 0.1);
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
