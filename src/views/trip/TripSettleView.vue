<template>
  <div class="settle-page">
    <div class="detail-header">
      <button class="back-btn" @click="$router.back()">←</button>
      <span class="header-title">结算方案</span>
      <span style="width:34px"></span>
    </div>

    <!-- 概览 -->
    <div class="summary-card">
      <div class="summary-total">{{ formatCurrencyTotals(totalByCurrency) }}</div>
      <div v-if="totalCny > 0" class="summary-sub">人民币结算层 ≈ ¥{{ formatMoney(totalCny) }} CNY</div>
      <div class="summary-sub">最优转账方案，共 {{ transfers.length }} 笔</div>
    </div>

    <div v-if="rateNotice" class="rate-notice">
      {{ rateNotice }}
    </div>

    <!-- 各人净额 -->
    <div class="section-title">成员净额</div>
    <div class="balance-list">
      <div v-for="b in balances" :key="b.memberId" class="balance-item">
        <div class="balance-left">
          <span class="balance-avatar" :style="{ background: b.color }">{{ b.name[0] }}</span>
          <div>
            <div class="balance-name">{{ b.name }}</div>
            <div class="balance-status">{{ getBalanceStatus(b.balance) }}</div>
          </div>
        </div>
        <div class="balance-right">
          <div class="balance-net" :class="{ positive: b.balance > 0, negative: b.balance < 0 }">
            {{ b.balance > 0 ? '+' : '' }}{{ currencySymbol }}{{ formatMoney(b.balance) }}
          </div>
          <div class="balance-cny">≈ ¥{{ formatMoney(b.balanceCny) }} CNY</div>
        </div>
      </div>
    </div>

    <!-- 转账方案 -->
    <div class="section-title-row">
      <span class="section-title">转账方案</span>
      <button v-if="transfers.length > 0" class="copy-btn" @click="copySettlement">
        📋 复制
      </button>
    </div>

    <div v-if="transfers.length === 0" class="settle-done">
      <div class="done-icon">🎉</div>
      <div class="done-text">已经两清了，无需转账</div>
    </div>

    <div v-for="(t, i) in transfers" :key="i" class="transfer-card readable-transfer">
      <div class="debt-title">
        <span class="tp-avatar small" :style="{ background: getColor(t.fromId) }">{{ getName(t.fromId)[0] }}</span>
        <strong>{{ getName(t.fromId) }} 欠 {{ getName(t.toId) }}</strong>
      </div>
      <div class="transfer-main-amount">{{ formatAmount(t.amount, t.currency) }}</div>
      <div v-if="t.currency !== 'CNY' && t.cnyAmount > 0" class="transfer-cny">≈ ¥{{ formatMoney(t.cnyAmount) }} CNY</div>
      <div v-if="t.currency !== 'CNY' && rateLine(t.currency)" class="transfer-rate">汇率：{{ rateLine(t.currency) }}</div>
      <div v-if="t.currency !== 'CNY' && t.cnyAmount > 0" class="transfer-advice">
        最终建议：{{ getName(t.fromId) }} 转给 {{ getName(t.toId) }} ¥{{ formatMoney(t.cnyAmount) }}
      </div>
      <div v-else class="transfer-advice">
        最终建议：{{ getName(t.fromId) }} 转给 {{ getName(t.toId) }} {{ formatAmount(t.amount, t.currency) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useTripStore } from '../../stores/trip'
import { formatMoney } from '../../utils/trip-storage'
import { getCurrencyInfo } from '../../types/currencies'
import { fetchRates } from '../../utils/exchange-rate'

const route = useRoute()
const store = useTripStore()
const tripId = route.params.id as string

const trip = computed(() => store.getTripById(tripId))
const currencyInfo = computed(() => getCurrencyInfo(trip.value?.currency || 'CNY'))
const isForeignCurrency = computed(() => trip.value?.currency !== 'CNY')
const currencySymbol = computed(() => isForeignCurrency.value ? currencyInfo.value.symbol : '¥')
const totalByCurrency = computed(() => trip.value ? store.getTripTotalsByCurrency(trip.value) : {})
const totalCny = computed(() => trip.value ? store.getTripTotalCny(trip.value) : 0)
const balances = computed(() => trip.value ? store.getMemberBalances(trip.value) : [])
const transfers = computed(() => trip.value ? store.getTransfers(trip.value) : [])
const exchangeRates = ref<Record<string, number>>({})
const rateNotice = ref('')

onMounted(async () => {
  await store.loadExchangeRates()
  const data = await fetchRates()
  exchangeRates.value = data.rates
  if (trip.value?.currency && trip.value.currency !== 'CNY') {
    const line = rateLine(trip.value.currency)
    if (data.timestamp === 0 || data.updateTime === 'unknown') {
      rateNotice.value = `当前使用估算汇率：${line}。如需精准结算，请以实际支付/换汇金额为准。`
    } else {
      rateNotice.value = `汇率来源：open.er-api.com，更新时间：${data.updateTime}。${line}`
    }
  }
})

function formatAmount(amount: number, currency: string): string {
  return `${getCurrencyInfo(currency).symbol}${formatMoney(amount)} ${currency}`
}

function formatCurrencyTotals(totals: Record<string, number>): string {
  const entries = Object.entries(totals)
  if (entries.length === 0) return '¥0.00 CNY'
  return entries.map(([currency, amount]) => formatAmount(amount, currency)).join(' / ')
}

function rateLine(currency: string): string {
  if (currency === 'CNY') return ''
  const rate = exchangeRates.value[currency]
  if (!rate) return ''
  return `1 ${currency} ≈ ${(1 / rate).toFixed(4)} CNY`
}

function getBalanceStatus(balance: number): string {
  if (balance > 0.01) return '应收'
  if (balance < -0.01) return '应付'
  return '已结清'
}

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
    if (t.currency !== 'CNY' && t.cnyAmount > 0) {
      const rate = rateLine(t.currency)
      return `${i + 1}. ${from} 欠 ${to}
${formatAmount(t.amount, t.currency)}
≈ ¥${formatMoney(t.cnyAmount)} CNY${rate ? `
汇率：${rate}` : ''}
最终建议：${from} 转给 ${to} ¥${formatMoney(t.cnyAmount)}`
    }
    return `${i + 1}. ${from} 欠 ${to}
${formatAmount(t.amount, t.currency)}`
  })
  let header = `【${trip.value.name} 结算方案】\n总消费：${formatCurrencyTotals(totalByCurrency.value)}`
  if (totalCny.value > 0) {
    header += `（人民币结算层 ≈ ¥${formatMoney(totalCny.value)} CNY）`
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
.settle-page {
  padding: 0 16px 40px;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
}

.back-btn {
  width: 34px;
  height: 34px;
  border: none;
  background: var(--card-bg);
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.header-title {
  font-size: 17px;
  font-weight: 600;
}

/* 概览 */
.summary-card {
  text-align: center;
  padding: 24px;
  background: var(--card-bg);
  border-radius: 14px;
  margin-bottom: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.summary-total {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
}

.summary-sub {
  font-size: 13px;
  color: var(--text-secondary);
}

/* 余额列表 */
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-secondary);
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.copy-btn {
  padding: 6px 14px;
  border: none;
  background: var(--primary);
  color: white;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.balance-list {
  background: var(--card-bg);
  border-radius: 14px;
  padding: 4px 16px;
  margin-bottom: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.balance-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
}

.balance-item:last-child {
  border-bottom: none;
}

.balance-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.balance-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: white;
}

.balance-name {
  font-size: 15px;
  font-weight: 500;
}

.balance-status {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-secondary);
}

.balance-right {
  text-align: right;
}

.balance-net {
  font-size: 16px;
  font-weight: 700;
}

.balance-net.positive {
  color: var(--income);
}

.balance-net.negative {
  color: var(--expense);
}

.balance-cny {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.rate-notice {
  margin: -8px 0 18px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fff8e1;
  color: #8d6e00;
  font-size: 12px;
  line-height: 1.5;
}

/* 转账卡片 */
.transfer-card {
  background: var(--card-bg);
  border-radius: 14px;
  padding: 18px;
  margin-bottom: 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.transfer-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  font-size: 16px;
}

.tp-avatar.small {
  width: 28px;
  height: 28px;
  font-size: 12px;
}

.transfer-main-amount {
  font-size: 22px;
  font-weight: 700;
  color: var(--primary);
}

.transfer-cny,
.transfer-rate {
  font-size: 13px;
  color: var(--text-secondary);
}

.transfer-advice {
  margin-top: 2px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--bg);
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.transfer-person {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.tp-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.tp-name {
  font-size: 13px;
  font-weight: 500;
}

.transfer-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.arrow-amount {
  font-size: 16px;
  font-weight: 700;
  color: var(--primary);
}

.arrow-cny {
  font-size: 12px;
  color: var(--text-secondary);
}

.arrow-icon {
  font-size: 20px;
  color: var(--text-secondary);
}

/* 已结清 */
.settle-done {
  text-align: center;
  padding: 40px 20px;
  background: var(--card-bg);
  border-radius: 14px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.done-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.done-text {
  font-size: 15px;
  color: var(--text-secondary);
}
</style>
