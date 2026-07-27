<template>
  <div class="spending-page trip-animate-in">
    <!-- 顶部渐变导航区 -->
    <div class="spending-hero trip-hero-bg">
      <div class="trip-nav">
        <button class="trip-nav-back" @click="$router.back()">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M12 3L7 9L12 15" stroke="var(--text)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="trip-nav-title">消费结构</div>
        <div class="trip-nav-placeholder"></div>
      </div>
    </div>

    <!-- 成员选择 pill tabs -->
    <div class="member-tabs">
      <div
        v-for="m in memberSpendings"
        :key="m.memberId"
        class="member-tab"
        :class="{ active: selectedMember === m.memberId }"
        :style="selectedMember === m.memberId ? { borderColor: m.color, color: m.color } : {}"
        @click="selectedMember = m.memberId"
      >
        <span class="tab-dot" :style="{ background: m.color }"></span>
        {{ m.name }}
      </div>
    </div>

    <!-- 当前成员概览 -->
    <div v-if="currentMember" class="overview-card" :style="{ borderTop: `4px solid ${currentMember.color}` }">
      <div class="overview-name">{{ currentMember.name }} 的消费</div>
      <div class="overview-total">{{ currencySymbol }}{{ formatMoney(currentMember.total) }}</div>
      <div v-if="isForeignCurrency && currentMemberCny > 0" class="overview-cny">≈ ¥{{ formatMoney(currentMemberCny) }} CNY</div>
    </div>

    <!-- 分类明细 -->
    <div v-if="currentMember" class="category-list">
      <div
        v-for="cat in currentMember.categories"
        :key="cat.categoryId"
        class="cat-row"
      >
        <div class="cat-left">
          <span class="cat-icon">{{ cat.categoryIcon }}</span>
          <span class="cat-name">{{ cat.categoryName }}</span>
        </div>
        <div class="cat-right">
          <div class="cat-bar-wrapper">
            <div class="cat-bar">
              <div
                class="cat-bar-fill"
                :style="{
                  width: (cat.amount / currentMember.total * 100) + '%',
                  background: currentMember.color
                }"
              ></div>
            </div>
          </div>
          <span class="cat-amount">{{ currencySymbol }}{{ formatMoney(cat.amount) }}</span>
          <span class="cat-percent">
            {{ (cat.amount / currentMember.total * 100).toFixed(0) }}%
          </span>
        </div>
      </div>

      <div v-if="currentMember.categories.length === 0" class="no-data">
        <svg class="no-data-icon" width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="20" fill="var(--primary-light)" opacity="0.4"/>
          <path d="M18 24H30" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
          <path d="M24 18V30" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
        </svg>
        <div class="no-data-text">暂无消费记录</div>
      </div>
    </div>

    <!-- 全员对比 -->
    <div class="section-title" style="margin-top: 24px">全员消费对比</div>
    <div class="compare-card">
      <div v-for="m in memberSpendings" :key="m.memberId" class="compare-row">
        <div class="compare-left">
          <span class="compare-dot" :style="{ background: m.color }"></span>
          <span class="compare-name">{{ m.name }}</span>
        </div>
        <div class="compare-right">
          <div class="compare-bar-wrapper">
            <div class="compare-bar">
              <div
                class="compare-bar-fill"
                :style="{
                  width: maxTotal > 0 ? (m.total / maxTotal * 100) + '%' : '0%',
                  background: m.color
                }"
              ></div>
            </div>
          </div>
          <span class="compare-amount">{{ currencySymbol }}{{ formatMoney(m.total) }}</span>
        </div>
      </div>
    </div>

    <!-- 分类对比矩阵 -->
    <div class="section-title" style="margin-top: 24px">分类对比</div>
    <div class="matrix-card">
      <div class="matrix-header">
        <div class="matrix-cell"></div>
        <div v-for="m in trip?.members" :key="m.id" class="matrix-cell header-cell">
          <span class="matrix-dot" :style="{ background: m.color }"></span>
          {{ m.name }}
        </div>
      </div>
      <div v-for="(cat, catIdx) in allCategories" :key="cat.id" class="matrix-row" :class="{ 'matrix-row-alt': catIdx % 2 === 0 }">
        <div class="matrix-cell label-cell">
          {{ cat.icon }} {{ cat.name }}
        </div>
        <div v-for="m in memberSpendings" :key="m.memberId" class="matrix-cell value-cell">
          {{ getCatAmount(m, cat.id) }}
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
import { convertToCNY, fetchRates } from '../../utils/exchange-rate'
import { getCurrencyInfo } from '../../types/currencies'
import type { MemberSpending, TripCategory } from '../../types/trip'

const route = useRoute()
const store = useTripStore()
const tripId = route.params.id as string

const trip = computed(() => store.getTripById(tripId))
const currencyInfo = computed(() => getCurrencyInfo(trip.value?.currency || 'CNY'))
const isForeignCurrency = computed(() => trip.value?.currency !== 'CNY')
const currencySymbol = computed(() => isForeignCurrency.value ? currencyInfo.value.symbol : '¥')
const memberSpendings = computed(() => trip.value ? store.getMemberSpending(trip.value) : [])
const allCategories = computed(() => store.categories)

const maxTotal = computed(() =>
  Math.max(...memberSpendings.value.map(m => m.total), 1)
)

const selectedMember = ref<string>('')

// 初始化选中第一个成员
if (memberSpendings.value.length > 0) {
  selectedMember.value = memberSpendings.value[0].memberId
}

const currentMember = computed(() =>
  memberSpendings.value.find(m => m.memberId === selectedMember.value)
)

// 当前成员消费的人民币等值
const currentMemberCny = computed(() => {
  if (!isForeignCurrency.value || !currentMember.value || !exchangeRates) return 0
  return convertToCNY(currentMember.value.total, trip.value!.currency, exchangeRates)
})

let exchangeRates: Record<string, number> | null = null

onMounted(async () => {
  if (isForeignCurrency.value) {
    const data = await fetchRates()
    exchangeRates = data.rates
  }
})

function getCatAmount(member: MemberSpending, catId: string): string {
  const cat = member.categories.find(c => c.categoryId === catId)
  return cat ? currencySymbol.value + formatMoney(cat.amount) : '-'
}
</script>

<style scoped>
/* ===== 页面容器 ===== */
.spending-page {
  padding: 0 0 48px;
  min-height: 100vh;
  background: var(--bg);
  position: relative;
}

/* ===== 顶部 Hero 导航区 ===== */
.spending-hero {
  padding: 0 20px 16px;
  border-radius: 0 0 var(--radius-xl) var(--radius-xl);
}

/* ===== 成员 pill tabs ===== */
.member-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 0 20px 6px;
  margin-bottom: 18px;
  scrollbar-width: none;
}

.member-tabs::-webkit-scrollbar {
  display: none;
}

.member-tab {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  color: var(--text-secondary);
  background: var(--card-bg);
}

.member-tab:active {
  transform: scale(0.95);
}

.member-tab.active {
  border-color: currentColor;
  box-shadow: var(--shadow);
  background: var(--card-bg);
}

.tab-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ===== 成员概览卡片（顶部色条装饰） ===== */
.overview-card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: 24px 22px 22px;
  margin: 0 16px 18px;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
  position: relative;
  overflow: hidden;
}

.overview-name {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  font-weight: 500;
}

.overview-total {
  font-family: var(--font-display);
  font-size: 36px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.5px;
  line-height: 1.1;
}

.overview-cny {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 6px;
  font-weight: 500;
}

/* ===== 分类明细列表 ===== */
.category-list {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: 4px 18px;
  margin: 0 16px 18px;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
}

.cat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  position: relative;
}

.cat-row:not(:last-child)::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--border);
}

.cat-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 80px;
}

.cat-icon {
  font-size: 22px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-gradient-soft);
  border-radius: var(--radius);
  flex-shrink: 0;
}

.cat-name {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.cat-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  justify-content: flex-end;
}

.cat-bar-wrapper {
  width: 80px;
}

.cat-bar {
  height: 7px;
  background: var(--bg);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.cat-bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.cat-amount {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  min-width: 60px;
  text-align: right;
  color: var(--text);
}

.cat-percent {
  font-size: 12px;
  color: var(--text-tertiary);
  min-width: 36px;
  text-align: right;
  font-weight: 500;
}

/* ===== 空状态 ===== */
.no-data {
  text-align: center;
  padding: 32px 20px;
}

.no-data-icon {
  margin-bottom: 10px;
  display: block;
  margin-left: auto;
  margin-right: auto;
}

.no-data-text {
  font-family: var(--font-display);
  font-size: 14px;
  color: var(--text-tertiary);
  font-weight: 600;
}

/* ===== Section 标题 ===== */
.section-title {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
  padding: 0 20px;
  margin-bottom: 12px;
}

/* ===== 全员对比卡片 ===== */
.compare-card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: 6px 18px;
  margin: 0 16px 18px;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
}

.compare-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  position: relative;
}

.compare-row:not(:last-child)::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--border);
}

.compare-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 60px;
}

.compare-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.compare-name {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.compare-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  justify-content: flex-end;
}

.compare-bar-wrapper {
  width: 100px;
}

.compare-bar {
  height: 8px;
  background: var(--bg);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.compare-bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.compare-amount {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  min-width: 60px;
  text-align: right;
  color: var(--text);
}

/* ===== 分类对比矩阵 ===== */
.matrix-card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: 14px;
  margin: 0 16px 24px;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
  overflow-x: auto;
}

.matrix-header {
  display: flex;
  border-bottom: 1px solid var(--border);
  padding-bottom: 10px;
  margin-bottom: 4px;
}

.matrix-row {
  display: flex;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-light);
  transition: background 0.15s ease;
}

.matrix-row:last-child {
  border-bottom: none;
}

.matrix-row-alt {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
}

.matrix-cell {
  min-width: 72px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.header-cell {
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--text);
}

.matrix-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.label-cell {
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--text-secondary);
}

.value-cell {
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--text);
}
</style>
