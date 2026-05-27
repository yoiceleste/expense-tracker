/**
 * 汇率工具模块
 * 使用 open.er-api.com 免费API（无需key，每天更新）
 * 本地缓存24小时
 */

const CACHE_KEY = 'expense_tracker_exchange_rates'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24小时

interface RateCache {
  rates: Record<string, number>
  base: string
  timestamp: number
  updateTime: string
}

// 获取缓存的汇率
export function getCachedRates(): RateCache | null {
  try {
    const data = localStorage.getItem(CACHE_KEY)
    if (!data) return null
    const cache: RateCache = JSON.parse(data)
    // 检查是否过期
    if (Date.now() - cache.timestamp > CACHE_DURATION) return null
    return cache
  } catch {
    return null
  }
}

// 保存汇率到缓存
function saveRates(cache: RateCache) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
}

// 从API获取最新汇率
export async function fetchRates(): Promise<RateCache> {
  // 先检查缓存
  const cached = getCachedRates()
  if (cached) return cached

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/CNY')
    const data = await res.json()

    if (data.result === 'success') {
      const cache: RateCache = {
        rates: data.rates,
        base: data.base_code,
        timestamp: Date.now(),
        updateTime: data.time_last_update_utc,
      }
      saveRates(cache)
      return cache
    }
    throw new Error('API returned error')
  } catch (err) {
    // API失败时使用缓存（即使过期）
    const staleCache = getCachedRates()
    if (staleCache) return staleCache

    // 最终兜底：返回空汇率
    console.error('Failed to fetch exchange rates:', err)
    return {
      rates: { CNY: 1, USD: 0.14, EUR: 0.13, JPY: 21.5, THB: 5.0, KRW: 195, GBP: 0.11, HKD: 1.08, TWD: 4.5, SGD: 0.19, MYR: 0.65, AUD: 0.21, NZD: 0.25 },
      base: 'CNY',
      timestamp: 0,
      updateTime: 'unknown',
    }
  }
}

/**
 * 将外币金额转换为人民币
 * @param amount 外币金额
 * @param fromCurrency 外币代码（如 USD, JPY）
 * @param rates 汇率表
 * @returns 人民币金额
 */
export function convertToCNY(amount: number, fromCurrency: string, rates: Record<string, number>): number {
  if (fromCurrency === 'CNY') return amount
  const rate = rates[fromCurrency]
  if (!rate) return amount // 找不到汇率则原样返回
  // rates 是以 CNY 为基准的，即 1 CNY = rate 外币
  // 所以 外币 -> CNY = amount / rate
  return amount / rate
}

/**
 * 将人民币转换为外币
 */
export function convertFromCNY(amountCNY: number, toCurrency: string, rates: Record<string, number>): number {
  if (toCurrency === 'CNY') return amountCNY
  const rate = rates[toCurrency]
  if (!rate) return amountCNY
  return amountCNY * rate
}

/**
 * 获取汇率显示文本
 */
export function getRateText(currency: string, rates: Record<string, number>): string {
  if (currency === 'CNY') return ''
  const rate = rates[currency]
  if (!rate) return ''
  // 1 CNY = rate 外币，即 1 外币 = 1/rate CNY
  const cnyRate = 1 / rate
  if (cnyRate >= 1) {
    return `1 ${currency} ≈ ${cnyRate.toFixed(2)} CNY`
  } else {
    return `1 ${currency} ≈ ${cnyRate.toFixed(4)} CNY`
  }
}
