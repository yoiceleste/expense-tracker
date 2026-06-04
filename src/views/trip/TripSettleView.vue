<template>
  <div class="settle-page">
    <div class="detail-header">
      <button class="back-btn" @click="$router.back()">←</button>
      <span class="header-title">结算方案</span>
      <span style="width:34px"></span>
    </div>

    <div class="settle-rate-card">
      <div>{{ settlementRateLine || '本次结算汇率：人民币账单无需换算' }}</div>
      <div>最终转账按人民币结算</div>
    </div>

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
      <div v-if="t.currency !== 'CNY'">
        <div class="transfer-line-text">{{ currencyLabel(t.currency) }}：{{ formatAmount(t.amount, t.currency) }}</div>
        <div class="transfer-line-text">人民币：≈ ¥{{ formatMoney(t.cnyAmount) }} CNY</div>
        <div v-if="rateLine(t.currency)" class="transfer-rate">汇率：{{ rateLine(t.currency) }}</div>
        <div class="transfer-advice">最终建议：{{ getName(t.fromId) }} 转给 {{ getName(t.toId) }} ¥{{ formatMoney(t.cnyAmount) }}</div>
      </div>
      <div v-else>
        <div class="transfer-line-text">人民币：{{ formatAmount(t.amount, t.currency) }}</div>
        <div class="transfer-advice">最终建议：{{ getName(t.fromId) }} 转给 {{ getName(t.toId) }} ¥{{ formatMoney(t.amount) }}</div>
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

const route = useRoute()
const store = useTripStore()
const tripId = route.params.id as string

const trip = computed(() => store.getTripById(tripId))
const transfers = computed(() => trip.value ? store.getTransfers(trip.value) : [])
const settlementRateLine = computed(() => {
  const currency = trip.value?.currency || 'CNY'
  return currency === 'CNY' ? '' : `本次结算汇率：${rateLine(currency)}`
})

onMounted(async () => {
  await store.loadExchangeRates()
})

function formatAmount(amount: number, currency: string): string {
  return `${getCurrencyInfo(currency).symbol}${formatMoney(amount)} ${currency}`
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
  const lines = transfers.value.map((t, i) => {
    const from = getName(t.fromId)
    const to = getName(t.toId)
    if (t.currency !== 'CNY') {
      const rate = rateLine(t.currency)
      return `${i + 1}. ${from} 欠 ${to}\n${currencyLabel(t.currency)}：${formatAmount(t.amount, t.currency)}\n人民币：≈ ¥${formatMoney(t.cnyAmount)} CNY${rate ? `\n汇率：${rate}` : ''}\n最终建议：${from} 转给 ${to} ¥${formatMoney(t.cnyAmount)}`
    }
    return `${i + 1}. ${from} 欠 ${to}\n人民币：${formatAmount(t.amount, t.currency)}\n最终建议：${from} 转给 ${to} ¥${formatMoney(t.amount)}`
  })
  const header = `【${trip.value.name} 结算方案】\n${settlementRateLine.value || '本次结算汇率：人民币账单无需换算'}\n最终转账按人民币结算`
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

.settle-rate-card {
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--card-bg);
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  font-size: 14px;
  line-height: 1.7;
  font-weight: 600;
}

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

.transfer-card {
  background: var(--card-bg);
  border-radius: 14px;
  padding: 18px;
  margin-bottom: 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
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

.tp-avatar.small {
  width: 28px;
  height: 28px;
  font-size: 12px;
}

.transfer-line-text {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 6px;
}

.transfer-rate {
  font-size: 13px;
  color: var(--text-secondary);
}

.transfer-advice {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--bg);
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
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
