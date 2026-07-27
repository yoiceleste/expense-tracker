<template>
  <div class="settle-page trip-animate-in">
    <div class="trip-nav">
      <button class="trip-nav-back" @click="$router.back()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <span class="trip-nav-title">结算方案</span>
      <span class="trip-nav-placeholder"></span>
    </div>

    <!-- 概览 -->
    <div class="summary-card">
      <div class="summary-total">{{ currencySymbol }}{{ formatMoney(total) }}</div>
      <div v-if="isForeignCurrency && totalCny > 0" class="summary-sub">≈ ¥{{ formatMoney(totalCny) }} CNY</div>
      <div class="summary-sub">最优转账方案，共 {{ transfers.length }} 笔</div>
    </div>

    <!-- 各人余额 -->
    <div class="section-title">收支明细</div>
    <div class="balance-list">
      <div v-for="b in balances" :key="b.memberId" class="balance-item">
        <div class="balance-left">
          <span class="balance-avatar" :style="{ background: b.color }">{{ b.name[0] }}</span>
          <span class="balance-name">{{ b.name }}</span>
        </div>
        <div class="balance-right">
          <div class="balance-detail">
            <span class="paid">付 {{ currencySymbol }}{{ formatMoney(b.paid) }}</span>
            <span class="share">摊 {{ currencySymbol }}{{ formatMoney(b.share) }}</span>
          </div>
          <div class="balance-net" :class="{ positive: b.balance > 0, negative: b.balance < 0 }">
            {{ b.balance > 0 ? '+' : '' }}{{ currencySymbol }}{{ formatMoney(b.balance) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 转账方案 -->
    <div class="section-title-row">
      <span class="section-title">转账方案</span>
      <button v-if="transfers.length > 0" class="copy-btn" @click="copySettlement">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        复制
      </button>
    </div>

    <div v-if="transfers.length === 0" class="settle-done">
      <svg class="done-icon" width="72" height="72" viewBox="0 0 72 72" fill="none">
        <circle cx="36" cy="36" r="32" fill="url(#doneGrad)" opacity="0.12"/>
        <circle cx="36" cy="36" r="24" stroke="var(--primary)" stroke-width="2.5" stroke-dasharray="4 4" opacity="0.3"/>
        <path d="M24 36 L32 44 L48 28" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <defs>
          <linearGradient id="doneGrad" x1="4" y1="4" x2="68" y2="68" gradientUnits="userSpaceOnUse">
            <stop stop-color="#3B9BCC"/>
            <stop offset="1" stop-color="#4ECDC4"/>
          </linearGradient>
        </defs>
      </svg>
      <div class="done-text">已经两清了，无需转账</div>
    </div>

    <div v-for="(t, i) in transfers" :key="i" class="transfer-card">
      <div class="transfer-line">
        <div class="transfer-person from">
          <span class="tp-avatar" :style="{ background: getColor(t.fromId) }">
            {{ getName(t.fromId)[0] }}
          </span>
          <span class="tp-name">{{ getName(t.fromId) }}</span>
        </div>
        <div class="transfer-arrow">
          <span class="arrow-amount">{{ currencySymbol }}{{ formatMoney(t.amount) }}</span>
          <span v-if="isForeignCurrency && t.cnyAmount > 0" class="arrow-cny">≈ ¥{{ formatMoney(t.cnyAmount) }}</span>
          <svg class="arrow-svg" width="32" height="20" viewBox="0 0 32 20" fill="none">
            <line x1="2" y1="10" x2="26" y2="10" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"/>
            <polyline points="20 4 28 10 20 16" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="transfer-person to">
          <span class="tp-avatar" :style="{ background: getColor(t.toId) }">
            {{ getName(t.toId)[0] }}
          </span>
          <span class="tp-name">{{ getName(t.toId) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useTripStore } from '../../stores/trip'
import { formatMoney } from '../../utils/trip-storage'
import { convertToCNY } from '../../utils/exchange-rate'
import { getCurrencyInfo } from '../../types/currencies'

const route = useRoute()
const store = useTripStore()
const tripId = route.params.id as string

const trip = computed(() => store.getTripById(tripId))
const currencyInfo = computed(() => getCurrencyInfo(trip.value?.currency || 'CNY'))
const isForeignCurrency = computed(() => trip.value?.currency !== 'CNY')
const currencySymbol = computed(() => isForeignCurrency.value ? currencyInfo.value.symbol : '¥')
const total = computed(() => trip.value ? store.getTripTotal(trip.value) : 0)
const balances = computed(() => trip.value ? store.getMemberBalances(trip.value) : [])
const transfers = computed(() => trip.value ? store.getTransfers(trip.value) : [])

// 外币旅行时总消费的人民币等值
const totalCny = ref(0)

onMounted(async () => {
  if (isForeignCurrency.value) {
    await store.loadExchangeRates()
    // 重新计算 transfers（会使用缓存的汇率）
    if (trip.value) {
      const freshTransfers = store.getTransfers(trip.value)
      // transfers 是 computed，会自动更新
    }
    // 计算总消费的人民币等值
    if (trip.value && trip.value.currency !== 'CNY') {
      const { fetchRates } = await import('../../utils/exchange-rate')
      const data = await fetchRates()
      totalCny.value = convertToCNY(total.value, trip.value.currency, data.rates)
    }
  }
})

function getName(id: string) {
  return trip.value ? store.getMemberName(trip.value, id) : '?'
}

function getColor(id: string) {
  return trip.value ? store.getMemberColor(trip.value, id) : '#ccc'
}

function copySettlement() {
  if (!trip.value || transfers.value.length === 0) return
  const lines = transfers.value.map((t, i) => {
    const from = getName(t.fromId)
    const to = getName(t.toId)
    if (isForeignCurrency.value && t.cnyAmount > 0) {
      return `${i + 1}. ${from} → ${to}：${currencySymbol.value}${formatMoney(t.amount)}（≈ ¥${formatMoney(t.cnyAmount)}）`
    }
    return `${i + 1}. ${from} → ${to}：${currencySymbol.value}${formatMoney(t.amount)}`
  })
  let header = `【${trip.value.name} 结算方案】\n总消费：${currencySymbol.value}${formatMoney(total.value)}`
  if (isForeignCurrency.value && totalCny.value > 0) {
    header += `（≈ ¥${formatMoney(totalCny.value)}）`
  }
  const text = `${header}\n\n${lines.join('\n')}`
  navigator.clipboard.writeText(text).then(() => {
    alert('已复制到剪贴板！可以直接发给群聊')
  }).catch(() => {
    const input = document.createElement('textarea')
    input.value = text
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    alert('已复制到剪贴板！可以直接发给群聊')
  })
}
</script>

<style scoped>
/* ===== 页面容器 ===== */
.settle-page {
  padding: 0 16px 48px;
  min-height: 100vh;
  background: var(--bg);
}

/* ===== 返回导航（磨砂玻璃） ===== */
.trip-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.trip-nav-back {
  width: 38px;
  height: 38px;
  border: none;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.trip-nav-back:active {
  transform: scale(0.92);
}

.trip-nav-title {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: 0.3px;
}

.trip-nav-placeholder {
  width: 38px;
}

/* ===== 概览卡片（渐变背景） ===== */
.summary-card {
  text-align: center;
  padding: 28px 24px 24px;
  background: linear-gradient(145deg, #3B9BCC 0%, #4ECDC4 70%, #6FE4D8 100%);
  border-radius: var(--radius-lg);
  margin-bottom: 22px;
  box-shadow: 0 6px 20px rgba(59, 155, 204, 0.25);
  position: relative;
  overflow: hidden;
}

.summary-card::before {
  content: '';
  position: absolute;
  top: -40px;
  right: -40px;
  width: 140px;
  height: 140px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.summary-card::after {
  content: '';
  position: absolute;
  bottom: -30px;
  left: -30px;
  width: 100px;
  height: 100px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.summary-total {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 800;
  color: white;
  margin-bottom: 6px;
  letter-spacing: 1px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  position: relative;
}

.summary-sub {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
  position: relative;
}

/* ===== 收支明细 ===== */
.section-title {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 12px;
  letter-spacing: 0.3px;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 16px;
  border: none;
  background: var(--primary-gradient);
  color: white;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font-display);
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(59, 155, 204, 0.25);
  transition: all 0.2s;
}

.copy-btn:active {
  transform: scale(0.95);
  box-shadow: 0 2px 6px rgba(59, 155, 204, 0.2);
}

/* ===== 余额列表 ===== */
.balance-list {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: 6px 18px;
  margin-bottom: 22px;
  box-shadow: var(--shadow);
}

.balance-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  position: relative;
}

.balance-item:not(:last-child)::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(59, 155, 204, 0.1), transparent);
}

.balance-item:last-child {
  border-bottom: none;
}

.balance-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.balance-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-family: var(--font-display);
  font-weight: 700;
  color: white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  letter-spacing: 0.5px;
}

.balance-name {
  font-size: 15px;
  font-weight: 600;
  font-family: var(--font-display);
  color: var(--text);
}

.balance-right {
  text-align: right;
}

.balance-detail {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 3px;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.balance-net {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 800;
}

.balance-net.positive {
  color: var(--income);
}

.balance-net.negative {
  color: var(--expense);
}

/* ===== 转账卡片（磨砂玻璃） ===== */
.transfer-card {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: var(--radius-lg);
  padding: 22px;
  margin-bottom: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.6);
}

.transfer-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.transfer-person {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.tp-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-family: var(--font-display);
  font-weight: 700;
  color: white;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
  letter-spacing: 0.5px;
}

.tp-name {
  font-size: 13px;
  font-weight: 600;
  font-family: var(--font-display);
  color: var(--text);
}

.transfer-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.arrow-amount {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 800;
  color: var(--primary);
  letter-spacing: 0.3px;
}

.arrow-cny {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
}

.arrow-svg {
  margin: 2px 0;
  opacity: 0.7;
}

/* ===== 已结清空状态 ===== */
.settle-done {
  text-align: center;
  padding: 48px 24px;
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.done-icon {
  margin-bottom: 16px;
  display: block;
  margin-left: auto;
  margin-right: auto;
}

.done-text {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.3px;
}
</style>
