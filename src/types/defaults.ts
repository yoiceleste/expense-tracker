import type { Category, Account } from '../types'

// 默认支出分类
export const defaultExpenseCategories: Category[] = [
  { id: 'food', name: '餐饮', icon: '🍜', type: 'expense', isDefault: true },
  { id: 'transport', name: '交通', icon: '🚗', type: 'expense', isDefault: true },
  { id: 'shopping', name: '购物', icon: '🛒', type: 'expense', isDefault: true },
  { id: 'housing', name: '住房', icon: '🏠', type: 'expense', isDefault: true },
  { id: 'entertainment', name: '娱乐', icon: '🎮', type: 'expense', isDefault: true },
  { id: 'medical', name: '医疗', icon: '💊', type: 'expense', isDefault: true },
  { id: 'education', name: '教育', icon: '📚', type: 'expense', isDefault: true },
  { id: 'clothing', name: '服饰', icon: '👔', type: 'expense', isDefault: true },
  { id: 'communication', name: '通讯', icon: '📱', type: 'expense', isDefault: true },
  { id: 'other_expense', name: '其他', icon: '📦', type: 'expense', isDefault: true },
]

// 默认收入分类
export const defaultIncomeCategories: Category[] = [
  { id: 'salary', name: '工资', icon: '💰', type: 'income', isDefault: true },
  { id: 'bonus', name: '奖金', icon: '🎁', type: 'income', isDefault: true },
  { id: 'investment', name: '投资', icon: '📈', type: 'income', isDefault: true },
  { id: 'parttime', name: '兼职', icon: '💼', type: 'income', isDefault: true },
  { id: 'other_income', name: '其他', icon: '💵', type: 'income', isDefault: true },
]

// 默认账户
export const defaultAccounts: Account[] = [
  { id: 'cash', name: '现金', icon: '💵', balance: 0, isDefault: true },
  { id: 'wechat', name: '微信', icon: '💬', balance: 0, isDefault: false },
  { id: 'alipay', name: '支付宝', icon: '🔵', balance: 0, isDefault: false },
  { id: 'bank_card', name: '银行卡', icon: '💳', balance: 0, isDefault: false },
]
