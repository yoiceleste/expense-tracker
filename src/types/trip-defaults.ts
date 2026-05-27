import type { TripCategory } from './trip'

// 旅行消费默认分类
export const defaultTripCategories: TripCategory[] = [
  { id: 'transport', name: '交通', icon: '🚗' },
  { id: 'hotel', name: '住宿', icon: '🏨' },
  { id: 'food', name: '餐饮', icon: '🍜' },
  { id: 'shopping', name: '购物', icon: '🛍️' },
  { id: 'ticket', name: '门票', icon: '🎫' },
  { id: 'fun', name: '娱乐', icon: '🎮' },
  { id: 'other', name: '其他', icon: '📦' },
]

// 成员头像颜色池
export const memberColors = [
  '#4f6ef7', '#f5584e', '#52c41a', '#faad14',
  '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16',
]
