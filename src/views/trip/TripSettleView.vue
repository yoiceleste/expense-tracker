<template>
  <div class="settle-page trip-animate-in">
    <div class="trip-nav">
      <button class="trip-nav-back" @click="$router.back()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <span class="trip-nav-title">结算方案</span>
      <span class="trip-nav-placeholder"></span>
    </div>

    <div class="settle-rate-card">
      <div>{{ settlementRateText }}</div>
      <div>最终转账按人民币结算</div>
    </div>

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
            <stop stop-color="#7BA05B"/>
            <stop offset="1" stop-color="#9BC46B"/>
          </linearGradient>
        </defs>
      </svg>
      <div class="done-text">已经两清了，无需转账</div>
    </div>

    <div v-for="(t, i) in transfers" :key="i" class="transfer-card readable-transfer">
      <div class="debt-title">
        <span class="tp-avatar small" :style="{ background: getColor(t.fromMemberId) }">{{ getName(t.fromMemberId)[0] }}</span>
        <strong>{{ getName(t.fromMemberId) }} 欠 {{ getName(t.toMemberId) }}</strong>
      </div>

      <div v-for="currency in transferCurrencies(t)" :key="currency" class="currency-debt">
        <div v-if="currency !== 'CNY'" class="transfer-line-text">
          {{ currencyLabel(currency) }}部分：{{ formatAmount(t.amountsByCurrency[currency], currency) }}
        </div>
        <div class="transfer-arrow">
          <span class="arrow-amount">{{ currencySymbol }}{{ formatMoney(t.amount) }}</span>
          <span v-if="isForeignCurrency && t.cnyAmount > 0" class="arrow-cny">≈ ¥{{ formatMoney(t.cnyAmount) }}</span>
          <svg class="arrow-svg" width="32" height="20" viewBox="0 0 32 20" fill="none">
            <line x1="2" y1="10" x2="26" y2="10" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"/>
            <polyline points="20 4 28 10 20 16" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>

      <template v-for="currency in transferForeignCurrencies(t)" :key="`cny-${currency}`">
        <div v-if="rateLine(currency)" class="transfer-rate">汇率：{{ rateLine(currency) }}</div>
        <div class="transfer-cny-line">
          {{ currencyLabel(currency) }}折人民币：≈ ¥{{ formatMoney(convertCurrencyToCny(t.amountsByCurrency[currency], currency)) }} CNY
        </div>
      </template>

      <div v-if="transferForeignCurrencies(t).length > 0 && t.amountsByCurrency.CNY" class="transfer-cny-line">
        人民币部分：¥{{ formatMoney(t.amountsByCurrency.CNY) }} CNY
      </div>

      <div v-if="hasOffset(t)" class="offset-box">
        <div class="offset-title">已自动抵消：</div>
        <div>{{ getName(t.offsetFromMemberId!) }} 欠 {{ getName(t.offsetToMemberId!) }}</div>
        <div v-for="currency in offsetCurrencies(t)" :key="`offset-${currency}`">
          {{ currency === 'CNY' ? '人民币部分' : `${currencyLabel(currency)}部分` }}：{{ formatAmount(t.offsetAmountsByCurrency![currency], currency) }}
        </div>
        <div>抵消金额：≈ ¥{{ formatMoney(t.offsetCnyAmount || 0) }} CNY</div>
      </div>

      <div class="transfer-advice">
        最终建议：{{ getName(t.fromMemberId) }} 转给 {{ getName(t.toMemberId) }} ¥{{ formatMoney(t.totalCnyAmount) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useTripStore } from '../../stores/trip'
import { formatMoney } from '../../utils/trip-storage'
import { getCurrencyInfo } from '../../types/currencies'
import type { Transfer } from '../../types/trip'

const route = useRoute()
const store = useTripStore()
const tripId = route.params.id as string

const trip = computed(() => store.getTripById(tripId))
const transfers = computed(() => trip.value ? store.getTransfers(trip.value) : [])
const settlementRateText = computed(() => {
  const currencies = new Set<string>()
  transfers.value.forEach(transfer => {
    transferForeignCurrencies(transfer).forEach(currency => currencies.add(currency))
    offsetCurrencies(transfer).filter(currency => currency !== 'CNY').forEach(currency => currencies.add(currency))
  })
  const rateLines = Array.from(currencies).map(rateLine).filter(Boolean)
  if (rateLines.length === 0) return '本次结算汇率：人民币账单无需换算'
  return `本次结算汇率：${rateLines.join(' / ')}`
})

onMounted(async () => {
  await store.loadExchangeRates()
})

function transferCurrencies(transfer: Transfer): string[] {
  return Object.keys(transfer.amountsByCurrency).sort((a, b) => {
    if (a === 'CNY') return 1
    if (b === 'CNY') return -1
    return a.localeCompare(b)
  })
}

function transferForeignCurrencies(transfer: Transfer): string[] {
  return transferCurrencies(transfer).filter(currency => currency !== 'CNY')
}

function hasOffset(transfer: Transfer): boolean {
  return !!transfer.offsetAmountsByCurrency && (transfer.offsetCnyAmount || 0) > 0.01
}

function offsetCurrencies(transfer: Transfer): string[] {
  return Object.keys(transfer.offsetAmountsByCurrency || {}).sort((a, b) => {
    if (a === 'CNY') return 1
    if (b === 'CNY') return -1
    return a.localeCompare(b)
  })
}

function formatAmount(amount: number, currency: string): string {
  return `${getCurrencyInfo(currency).symbol}${formatMoney(amount)} ${currency}`
}

function convertCurrencyToCny(amount: number, currency: string): number {
  if (currency === 'CNY') return amount
  const cnyRate = store.getCnyRate(currency)
  return cnyRate ? amount * cnyRate : amount
}

function rateLine(currency: string): string {
  if (currency === 'CNY') return ''
  const cnyRate = store.getCnyRate(currency)
  if (!cnyRate) return ''
  return `1 ${currency} ≈ ${cnyRate.toFixed(4)} CNY`
}

function currencyLabel(currency: string): string {
  return currency === 'CNY' ? '人民币' : getCurrencyInfo(currency).name
}

function getName(id: string) {
  return trip.value ? store.getMemberName(trip.value, id) : '?'
}

function getColor(id: string) {
  return trip.value ? store.getMemberColor(trip.value, id) : '#ccc'
}

function copySettlement() {
  if (!trip.value || transfers.value.length === 0) return
  const lines = transfers.value.map((transfer, i) => {
    const from = getName(transfer.fromMemberId)
    const to = getName(transfer.toMemberId)
    const amountLines = transferCurrencies(transfer).map(currency => {
      const label = currency === 'CNY' ? '人民币部分' : `${currencyLabel(currency)}部分`
      return `${label}：${formatAmount(transfer.amountsByCurrency[currency], currency)}`
    })
    const foreignLines = transferForeignCurrencies(transfer).flatMap(currency => {
      const rate = rateLine(currency)
      return [
        rate ? `汇率：${rate}` : '',
        `${currencyLabel(currency)}折人民币：≈ ¥${formatMoney(convertCurrencyToCny(transfer.amountsByCurrency[currency], currency))} CNY`,
      ].filter(Boolean)
    })
    const cnyLine = transferForeignCurrencies(transfer).length > 0 && transfer.amountsByCurrency.CNY ? [`人民币部分：¥${formatMoney(transfer.amountsByCurrency.CNY)} CNY`] : []
    const offsetLines = hasOffset(transfer) ? [
      '已自动抵消：',
      `${getName(transfer.offsetFromMemberId!)} 欠 ${getName(transfer.offsetToMemberId!)}`,
      ...offsetCurrencies(transfer).map(currency => {
        const label = currency === 'CNY' ? '人民币部分' : `${currencyLabel(currency)}部分`
        return `${label}：${formatAmount(transfer.offsetAmountsByCurrency![currency], currency)}`
      }),
      `抵消金额：≈ ¥${formatMoney(transfer.offsetCnyAmount || 0)} CNY`,
    ] : []
    return `${i + 1}. ${from} 欠 ${to}\n${[...amountLines, ...foreignLines, ...cnyLine, ...offsetLines, `最终建议：${from} 转给 ${to} ¥${formatMoney(transfer.totalCnyAmount)}`].join('\n')}`
  })
  const header = `【${trip.value.name} 结算方案】\n${settlementRateText.value}\n最终转账按人民币结算`
  const text = `${header}\n\n${lines.join('\n\n')}`
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

/* ===== 返回导航 ===== */
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
  border: 1px solid var(--border);
  background: var(--bg);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text);
  box-shadow: var(--shadow);
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

/* ===== 概览卡片（手帐风主色渐变背景） ===== */
.summary-card {
  text-align: center;
  padding: 28px 24px 24px;
  background: var(--primary-gradient);
  border-radius: var(--radius-lg);
  margin-bottom: 22px;
  box-shadow: var(--shadow);
  position: relative;
  overflow: hidden;
  border: 2px solid var(--border-light);
}

.summary-total {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 800;
  color: white;
  margin-bottom: 6px;
  letter-spacing: 1px;
  position: relative;
}

.summary-sub {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  position: relative;
}

/* ===== 收支明细 ===== */
.section-title {
  font-family: var(--font-display);
  font-size: 18px;
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
  border: 2px solid var(--accent);
  background: var(--accent);
  color: white;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font-display);
  cursor: pointer;
  box-shadow: var(--shadow);
  transition: all 0.2s;
}

.copy-btn:active {
  transform: scale(0.95);
  box-shadow: 0 1px 2px rgba(92, 74, 58, 0.06);
}

/* ===== 余额列表 ===== */
.balance-list {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: 6px 18px;
  margin-bottom: 22px;
  box-shadow: var(--shadow);
  border: 2px solid var(--border-light);
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
  background: var(--border);
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

/* ===== 转账卡片 ===== */
.transfer-card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: 22px;
  margin-bottom: 12px;
  box-shadow: var(--shadow);
  border: 2px solid var(--border-light);
}

.readable-transfer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.debt-title {
  display: flex;
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
  border: 2px solid var(--border-light);
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
