<template>
  <div class="settle-page">
    <div class="detail-header">
      <button class="back-btn" @click="$router.back()">←</button>
      <span class="header-title">结算方案</span>
      <span style="width:34px"></span>
    </div>

    <div class="settle-rate-card">
      <div>{{ settlementRateText }}</div>
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
        <span class="tp-avatar small" :style="{ background: getColor(t.fromMemberId) }">{{ getName(t.fromMemberId)[0] }}</span>
        <strong>{{ getName(t.fromMemberId) }} 欠 {{ getName(t.toMemberId) }}</strong>
      </div>

      <div v-for="currency in transferCurrencies(t)" :key="currency" class="currency-debt">
        <div v-if="currency !== 'CNY'" class="transfer-line-text">
          {{ currencyLabel(currency) }}部分：{{ formatAmount(t.amountsByCurrency[currency], currency) }}
        </div>
        <div v-else class="transfer-line-text">
          人民币部分：{{ formatAmount(t.amountsByCurrency[currency], currency) }}
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

.transfer-rate,
.transfer-cny-line {
  font-size: 13px;
  color: var(--text-secondary);
}

.offset-box {
  margin-top: 4px;
  padding: 8px 10px;
  border-radius: 10px;
  background: #f6f7fb;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.offset-title {
  font-weight: 600;
  color: var(--text);
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
