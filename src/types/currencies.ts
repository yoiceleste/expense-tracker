// 常用旅行目的地货币
export interface CurrencyInfo {
  code: string       // 货币代码
  name: string       // 货币名称
  symbol: string     // 货币符号
  flag: string       // 国旗 emoji
  country: string    // 国家/地区
}

export const popularCurrencies: CurrencyInfo[] = [
  { code: 'CNY', name: '人民币', symbol: '¥', flag: '🇨🇳', country: '中国' },
  { code: 'USD', name: '美元', symbol: '$', flag: '🇺🇸', country: '美国' },
  { code: 'EUR', name: '欧元', symbol: '€', flag: '🇪🇺', country: '欧元区' },
  { code: 'GBP', name: '英镑', symbol: '£', flag: '🇬🇧', country: '英国' },
  { code: 'JPY', name: '日元', symbol: '¥', flag: '🇯🇵', country: '日本' },
  { code: 'KRW', name: '韩元', symbol: '₩', flag: '🇰🇷', country: '韩国' },
  { code: 'THB', name: '泰铢', symbol: '฿', flag: '🇹🇭', country: '泰国' },
  { code: 'SGD', name: '新加坡元', symbol: 'S$', flag: '🇸🇬', country: '新加坡' },
  { code: 'MYR', name: '马来西亚令吉', symbol: 'RM', flag: '🇲🇾', country: '马来西亚' },
  { code: 'VND', name: '越南盾', symbol: '₫', flag: '🇻🇳', country: '越南' },
  { code: 'IDR', name: '印尼盾', symbol: 'Rp', flag: '🇮🇩', country: '印尼' },
  { code: 'PHP', name: '菲律宾比索', symbol: '₱', flag: '🇵🇭', country: '菲律宾' },
  { code: 'AUD', name: '澳元', symbol: 'A$', flag: '🇦🇺', country: '澳大利亚' },
  { code: 'NZD', name: '新西兰元', symbol: 'NZ$', flag: '🇳🇿', country: '新西兰' },
  { code: 'HKD', name: '港币', symbol: 'HK$', flag: '🇭🇰', country: '中国香港' },
  { code: 'TWD', name: '新台币', symbol: 'NT$', flag: '🇹🇼', country: '中国台湾' },
  { code: 'MOP', name: '澳门元', symbol: 'MOP$', flag: '🇲🇴', country: '中国澳门' },
  { code: 'RUB', name: '俄罗斯卢布', symbol: '₽', flag: '🇷🇺', country: '俄罗斯' },
  { code: 'TRY', name: '土耳其里拉', symbol: '₺', flag: '🇹🇷', country: '土耳其' },
  { code: 'AED', name: '迪拉姆', symbol: 'د.إ', flag: '🇦🇪', country: '阿联酋' },
  { code: 'INR', name: '印度卢比', symbol: '₹', flag: '🇮🇳', country: '印度' },
  { code: 'CAD', name: '加元', symbol: 'C$', flag: '🇨🇦', country: '加拿大' },
  { code: 'CHF', name: '瑞士法郎', symbol: 'CHF', flag: '🇨🇭', country: '瑞士' },
  { code: 'FRF', name: '法国法郎', symbol: '₣', flag: '🇫🇷', country: '法国' },
]

export function getCurrencyInfo(code: string): CurrencyInfo {
  return popularCurrencies.find(c => c.code === code) || { code, name: code, symbol: code, flag: '🌐', country: '' }
}
