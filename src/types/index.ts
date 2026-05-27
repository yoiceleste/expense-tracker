// 记账记录类型
export interface Record {
  id: string
  type: 'income' | 'expense'  // 收入 or 支出
  amount: number               // 金额（人民币）
  originalAmount?: number      // 原始外币金额
  currency: string              // 币种代码，默认 CNY
  categoryId: string           // 分类ID
  note: string                 // 备注
  date: string                 // 日期 YYYY-MM-DD
  createdAt: number            // 创建时间戳
  tags: string[]               // 标签
  accountId: string            // 账户ID
}

// 分类
export interface Category {
  id: string
  name: string
  icon: string                 // emoji 图标
  type: 'income' | 'expense'  // 收入分类 or 支出分类
  isDefault: boolean           // 是否为默认分类
}

// 账户
export interface Account {
  id: string
  name: string
  icon: string
  balance: number              // 当前余额
  isDefault: boolean
}

// 预算
export interface Budget {
  id: string
  categoryId: string           // 分类ID（空字符串表示总预算）
  amount: number               // 预算金额
  month: string                // 月份 YYYY-MM
}

// 月度统计
export interface MonthSummary {
  month: string
  totalIncome: number
  totalExpense: number
  balance: number
}

// 分类统计
export interface CategorySummary {
  categoryId: string
  categoryName: string
  categoryIcon: string
  amount: number
  percentage: number
  count: number
}
