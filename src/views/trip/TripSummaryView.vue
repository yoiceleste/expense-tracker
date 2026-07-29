<template>
  <div class="summary-page trip-animate-in">
    <div class="trip-nav">
      <button class="trip-nav-back" @click="$router.back()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <span class="trip-nav-title">旅行总结</span>
      <span class="trip-nav-placeholder"></span>
    </div>

    <!-- ====== 可截取的总结卡片 ====== -->
    <div ref="cardRef" class="summary-card-wrap">
      <!-- 和纸胶带装饰 -->
      <div class="washi-tape washi-tape-green" style="top: 12px; left: 30px; transform: rotate(-8deg);"></div>
      <div class="washi-tape washi-tape-orange" style="top: 8px; right: 36px; transform: rotate(6deg);"></div>

      <!-- 1. 基础信息 -->
      <div class="summary-hero">
        <div class="hero-decor">✿</div>
        <h1 class="summary-trip-name">{{ trip?.name }}</h1>
        <div v-if="dateRange" class="summary-dates">{{ dateRange }}</div>
        <div class="summary-meta">
          <span v-if="duration > 0" class="meta-pill">{{ duration }} 天</span>
          <span class="meta-pill">{{ trip?.members.length || 0 }} 人同行</span>
          <span v-if="expenseCount > 0" class="meta-pill">{{ expenseCount }} 笔消费</span>
        </div>
      </div>

      <!-- 2. 消费概览 -->
      <div v-if="expenseCount > 0" class="summary-section">
        <div class="summary-section-title">消费概览</div>
        <div class="overview-card">
          <div class="overview-total">
            <span class="overview-label">总消费</span>
            <span class="overview-amount">¥{{ formatMoney(totalCny) }}</span>
            <span v-if="isForeignCurrency" class="overview-cny-note">CNY</span>
          </div>
          <div class="overview-divider"></div>
          <div class="overview-sub-row">
            <div class="overview-sub">
              <span class="sub-label">人均</span>
              <span class="sub-value">¥{{ formatMoney(perPerson) }}</span>
            </div>
            <div class="overview-sub">
              <span class="sub-label">日均</span>
              <span class="sub-value">¥{{ formatMoney(perDay) }}</span>
            </div>
          </div>
        </div>

        <!-- 分类占比 -->
        <div class="category-breakdown">
          <div v-for="cat in categoryBreakdown" :key="cat.id" class="cat-bar-row">
            <span class="cat-bar-icon">{{ cat.icon }}</span>
            <div class="cat-bar-content">
              <div class="cat-bar-header">
                <span class="cat-bar-name">{{ cat.name }}</span>
                <span class="cat-bar-amount">¥{{ formatMoney(cat.amount) }} · {{ cat.percent }}%</span>
              </div>
              <div class="cat-bar-track">
                <div class="cat-bar-fill" :style="{ width: cat.percent + '%', background: cat.color }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. 消费亮点 -->
      <div v-if="highlights.length > 0" class="summary-section">
        <div class="summary-section-title">旅行亮点</div>
        <div class="highlights-grid">
          <div v-for="(h, i) in highlights" :key="i" class="highlight-chip" :style="{ borderColor: h.color }">
            <span class="highlight-emoji">{{ h.icon }}</span>
            <span class="highlight-text">{{ h.text }}</span>
          </div>
        </div>
      </div>

      <!-- 4. 图片时间线 -->
      <div v-if="photoExpenses.length > 0" class="summary-section">
        <div class="summary-section-title">旅行回忆</div>
        <div class="photo-timeline">
          <div v-for="exp in photoExpenses" :key="exp.id" class="photo-timeline-item">
            <div class="photo-timeline-dot"></div>
            <div class="photo-timeline-date">{{ formatDate(exp.date) }}</div>
            <div class="photo-timeline-card">
              <img :src="exp.images[0]" class="photo-timeline-img" />
              <div class="photo-timeline-info">
                <span class="photo-timeline-amount">¥{{ formatMoney(exp.cnyAmount) }}</span>
                <span v-if="exp.note" class="photo-timeline-note">{{ exp.note }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 无消费时的空状态 -->
      <div v-if="expenseCount === 0" class="summary-empty">
        <div class="summary-empty-icon">📓</div>
        <div class="summary-empty-text">还没有消费记录</div>
        <div class="summary-empty-desc">记账后再来看看旅行总结吧</div>
      </div>

      <!-- 底部品牌 -->
      <div class="summary-footer">
        <div class="footer-line"></div>
        <div class="footer-text">旅行账本 · 记录每一段旅程 ✿</div>
      </div>
    </div>

    <!-- 分享按钮 -->
    <div class="share-bar">
      <button class="share-btn" :disabled="generating" @click="generateCard">
        <svg v-if="!generating" width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 1V11M9 1L5 5M9 1L13 5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2 10V15C2 15.55 2.45 16 3 16H15C15.55 16 16 15.55 16 15V10" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        <span v-if="generating" class="share-spin"></span>
        {{ generating ? '生成中...' : '生成分享卡片' }}
      </button>
    </div>

    <!-- 分享预览 -->
    <div v-if="generatedImage" class="preview-overlay" @click.self="generatedImage = ''">
      <div class="preview-modal">
        <div class="preview-title">长按图片保存到相册</div>
        <img :src="generatedImage" class="preview-image" />
        <div class="preview-actions">
          <a :href="generatedImage" download="trip-summary.png" class="preview-action-btn primary">保存图片</a>
          <button class="preview-action-btn" @click="generatedImage = ''">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useTripStore } from '../../stores/trip'
import { formatMoney } from '../../utils/trip-storage'
import { getCurrencyInfo } from '../../types/currencies'
import type { Trip, TripExpense } from '../../types/trip'
import html2canvas from 'html2canvas-pro'

const route = useRoute()
const store = useTripStore()
const tripId = route.params.id as string

const trip = computed(() => store.getTripById(tripId))
const currencyInfo = computed(() => getCurrencyInfo(trip.value?.currency || 'CNY'))
const isForeignCurrency = computed(() => trip.value?.currency !== 'CNY')

// ===== 基础信息 =====
const dateRange = computed(() => {
  if (!trip.value) return ''
  const s = trip.value.startDate
  const e = trip.value.endDate
  if (s && e) return `${s} ~ ${e}`
  if (s) return `${s} 出发`
  return ''
})

const duration = computed(() => {
  if (!trip.value?.startDate || !trip.value?.endDate) return 0
  const s = new Date(trip.value.startDate)
  const e = new Date(trip.value.endDate)
  const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff + 1 : 1
})

const expenseCount = computed(() => trip.value?.expenses.length || 0)

// ===== 消费概览 =====
const totalCny = computed(() => {
  if (!trip.value) return 0
  return store.getTripTotalCny(trip.value)
})

const perPerson = computed(() => {
  const members = trip.value?.members.length || 1
  return totalCny.value / members
})

const perDay = computed(() => {
  const days = duration.value || 1
  return totalCny.value / days
})

// 分类颜色
const categoryColors: Record<string, string> = {
  transport: '#6BA3D6',
  hotel: '#B088E0',
  food: '#E07856',
  shopping: '#F5C547',
  ticket: '#5BB8A0',
  fun: '#E85A8A',
  other: '#A0927E',
}

interface CategoryBreakdownItem {
  id: string
  name: string
  icon: string
  amount: number
  percent: number
  color: string
}

const categoryBreakdown = computed<CategoryBreakdownItem[]>(() => {
  if (!trip.value || trip.value.expenses.length === 0) return []

  const catMap = new Map<string, number>()
  trip.value.expenses.forEach(expense => {
    const currency = store.getExpenseCurrency(expense, trip.value!)
    const cnyAmount = store.toCnyAmount(expense.amount, currency)
    const current = catMap.get(expense.categoryId) || 0
    catMap.set(expense.categoryId, current + cnyAmount)
  })

  const total = Array.from(catMap.values()).reduce((s, v) => s + v, 0)
  if (total <= 0) return []

  return Array.from(catMap.entries())
    .map(([catId, amount]) => {
      const cat = store.categories.find(c => c.id === catId)
      return {
        id: catId,
        name: cat?.name || '其他',
        icon: cat?.icon || '📦',
        amount: Math.round(amount * 100) / 100,
        percent: Math.round((amount / total) * 100),
        color: categoryColors[catId] || '#A0927E',
      }
    })
    .sort((a, b) => b.amount - a.amount)
})

// ===== 消费亮点（纯数据驱动） =====
interface Highlight {
  icon: string
  text: string
  color: string
}

const highlights = computed<Highlight[]>(() => {
  if (!trip.value || trip.value.expenses.length === 0) return []
  const result: Highlight[] = []
  const expenses = trip.value.expenses

  // 餐饮：吃了多少顿饭
  const foodCount = expenses.filter(e => e.categoryId === 'food').length
  if (foodCount > 0) {
    result.push({ icon: '🍜', text: `一起吃了 ${foodCount} 顿饭`, color: '#E07856' })
  }

  // 咖啡：从备注中统计
  const coffeeCount = expenses.filter(e => {
    const note = e.note || ''
    return /咖啡|coffee|latte|拿铁|星巴克|瑞幸|manner/i.test(note)
  }).length
  if (coffeeCount > 0) {
    result.push({ icon: '☕', text: `喝了 ${coffeeCount} 杯咖啡`, color: '#8B6F4E' })
  }

  // 住宿：住了几晚
  const hotelCount = expenses.filter(e => e.categoryId === 'hotel').length
  if (hotelCount > 0) {
    result.push({ icon: '🏨', text: `住了 ${hotelCount} 晚酒店`, color: '#B088E0' })
  }

  // 交通：出行次数
  const transportCount = expenses.filter(e => e.categoryId === 'transport').length
  if (transportCount > 0) {
    result.push({ icon: '🚗', text: `出行 ${transportCount} 次`, color: '#6BA3D6' })
  }

  // 门票
  const ticketCount = expenses.filter(e => e.categoryId === 'ticket').length
  if (ticketCount > 0) {
    result.push({ icon: '🎫', text: `买了 ${ticketCount} 张门票`, color: '#5BB8A0' })
  }

  // 购物
  const shoppingCount = expenses.filter(e => e.categoryId === 'shopping').length
  if (shoppingCount > 0) {
    result.push({ icon: '🛍️', text: `购物 ${shoppingCount} 次`, color: '#F5C547' })
  }

  // 娱乐
  const funCount = expenses.filter(e => e.categoryId === 'fun').length
  if (funCount > 0) {
    result.push({ icon: '🎮', text: `娱乐活动 ${funCount} 次`, color: '#E85A8A' })
  }

  // 单笔最高消费
  if (expenses.length > 0) {
    const maxExpense = expenses.reduce((max, e) => {
      const cny = store.toCnyAmount(e.amount, store.getExpenseCurrency(e, trip.value!))
      return cny > max.cny ? { expense: e, cny } : max
    }, { expense: expenses[0], cny: 0 })
    if (maxExpense.cny > 0) {
      const cat = store.categories.find(c => c.id === maxExpense.expense.categoryId)
      result.push({ icon: '💰', text: `最大一笔 ¥${formatMoney(maxExpense.cny)}${cat ? `（${cat.name}）` : ''}`, color: '#7BA05B' })
    }
  }

  return result
})

// ===== 图片时间线 =====
interface PhotoExpense {
  id: string
  date: string
  images: string[]
  note: string
  cnyAmount: number
}

const photoExpenses = computed<PhotoExpense[]>(() => {
  if (!trip.value) return []
  return trip.value.expenses
    .filter(e => e.images && e.images.length > 0)
    .map(e => ({
      id: e.id,
      date: e.date,
      images: e.images,
      note: e.note || '',
      cnyAmount: store.toCnyAmount(e.amount, store.getExpenseCurrency(e, trip.value!)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
})

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

// ===== 分享卡片生成 =====
const cardRef = ref<HTMLElement | null>(null)
const generating = ref(false)
const generatedImage = ref('')

async function generateCard() {
  if (!cardRef.value) return
  generating.value = true
  try {
    const canvas = await html2canvas(cardRef.value, {
      backgroundColor: '#FAF6F0',
      scale: 2,
      useCORS: true,
      logging: false,
    })
    generatedImage.value = canvas.toDataURL('image/png')
  } catch (err) {
    console.error('生成分享卡片失败:', err)
    alert('生成失败，请重试')
  } finally {
    generating.value = false
  }
}

// ===== 初始化 =====
onMounted(async () => {
  if (trip.value && isForeignCurrency.value) {
    await store.loadExchangeRates()
  }
})
</script>

<style scoped>
.summary-page {
  padding: 0 16px 80px;
  min-height: 100vh;
  background: var(--bg);
}

/* ===== 总结卡片容器 ===== */
.summary-card-wrap {
  background: var(--card-bg);
  border: 2px solid var(--border-light);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  position: relative;
  padding: 32px 20px 20px;
}

/* ===== 1. Hero 区域 ===== */
.summary-hero {
  text-align: center;
  padding: 16px 0 24px;
  border-bottom: 2px dashed var(--border);
  position: relative;
}

.hero-decor {
  font-size: 28px;
  color: var(--primary);
  opacity: 0.6;
  margin-bottom: 8px;
}

.summary-trip-name {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 8px;
  line-height: 1.2;
}

.summary-dates {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.summary-meta {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.meta-pill {
  background: var(--primary-light);
  color: var(--primary);
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 20px;
}

/* ===== 通用 section ===== */
.summary-section {
  padding: 20px 0;
  border-bottom: 2px dashed var(--border);
}

.summary-section:last-of-type {
  border-bottom: none;
}

.summary-section-title {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.summary-section-title::before {
  content: '✦';
  color: var(--accent);
  font-size: 16px;
}

/* ===== 2. 消费概览 ===== */
.overview-card {
  background: var(--primary-gradient-soft);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 16px;
  text-align: center;
}

.overview-total {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
}

.overview-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-right: 4px;
}

.overview-amount {
  font-family: var(--font-body);
  font-size: 36px;
  font-weight: 800;
  color: var(--primary);
}

.overview-cny-note {
  font-size: 13px;
  color: var(--text-secondary);
}

.overview-divider {
  height: 1px;
  background: var(--border);
  margin: 14px 0;
}

.overview-sub-row {
  display: flex;
  justify-content: center;
  gap: 32px;
}

.overview-sub {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.sub-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.sub-value {
  font-family: var(--font-body);
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}

/* 分类占比 */
.category-breakdown {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cat-bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cat-bar-icon {
  font-size: 20px;
  flex-shrink: 0;
  width: 28px;
  text-align: center;
}

.cat-bar-content {
  flex: 1;
}

.cat-bar-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.cat-bar-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.cat-bar-amount {
  font-size: 12px;
  color: var(--text-secondary);
}

.cat-bar-track {
  height: 8px;
  background: var(--bg);
  border-radius: 4px;
  overflow: hidden;
}

.cat-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.6s ease;
}

/* ===== 3. 消费亮点 ===== */
.highlights-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.highlight-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 2px solid var(--border);
  border-radius: 24px;
  background: var(--card-bg);
}

.highlight-emoji {
  font-size: 18px;
}

.highlight-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

/* ===== 4. 图片时间线 ===== */
.photo-timeline {
  position: relative;
  padding-left: 8px;
}

.photo-timeline-item {
  position: relative;
  padding-left: 24px;
  padding-bottom: 16px;
}

.photo-timeline-item:last-child {
  padding-bottom: 0;
}

.photo-timeline-item::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 20px;
  bottom: 0;
  width: 2px;
  background: var(--border);
}

.photo-timeline-item:last-child::before {
  display: none;
}

.photo-timeline-dot {
  position: absolute;
  left: 0;
  top: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--primary);
  border: 2px solid var(--card-bg);
  z-index: 1;
}

.photo-timeline-date {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.photo-timeline-card {
  display: flex;
  gap: 10px;
  background: var(--bg);
  border-radius: var(--radius);
  padding: 8px;
}

.photo-timeline-img {
  width: 72px;
  height: 72px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
}

.photo-timeline-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.photo-timeline-amount {
  font-family: var(--font-body);
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}

.photo-timeline-note {
  font-size: 12px;
  color: var(--text-secondary);
}

/* ===== 空状态 ===== */
.summary-empty {
  text-align: center;
  padding: 48px 0;
}

.summary-empty-icon {
  font-size: 56px;
  margin-bottom: 12px;
}

.summary-empty-text {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 6px;
}

.summary-empty-desc {
  font-size: 13px;
  color: var(--text-secondary);
}

/* ===== 底部 ===== */
.summary-footer {
  text-align: center;
  padding: 20px 0 4px;
}

.footer-line {
  height: 2px;
  background: repeating-linear-gradient(90deg, var(--border) 0, var(--border) 8px, transparent 8px, transparent 16px);
  margin-bottom: 10px;
  opacity: 0.4;
}

.footer-text {
  font-family: var(--font-display);
  font-size: 16px;
  color: var(--text-tertiary);
}

/* ===== 分享按钮 ===== */
.share-bar {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  background: var(--card-bg);
  border-top: 2px dashed var(--border-light);
  z-index: 50;
}

.share-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: var(--radius);
  background: var(--primary-gradient);
  color: white;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(123, 160, 91, 0.25);
  transition: transform 0.2s ease;
}

.share-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.share-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.share-spin {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ===== 预览弹窗 ===== */
.preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.preview-modal {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: 16px;
  max-width: 360px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.preview-title {
  font-family: var(--font-display);
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.preview-image {
  max-width: 100%;
  max-height: 60vh;
  border-radius: var(--radius);
  margin-bottom: 14px;
}

.preview-actions {
  display: flex;
  gap: 10px;
  width: 100%;
}

.preview-action-btn {
  flex: 1;
  padding: 12px;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  background: var(--card-bg);
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s;
}

.preview-action-btn:active {
  transform: scale(0.96);
}

.preview-action-btn.primary {
  background: var(--primary-gradient);
  color: white;
  border-color: transparent;
}
</style>
