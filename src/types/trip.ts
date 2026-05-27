// ===== 旅行分账类型定义 =====

// 旅行成员
export interface TripMember {
  id: string
  name: string
  color: string  // 头像颜色
}

// 旅行消费记录
export interface TripExpense {
  id: string
  tripId: string
  payerId: string           // 付款人ID
  amount: number            // 总金额
  splitAmong: string[]      // 参与分摊的成员ID列表
  splitMode: 'equal' | 'custom'  // 均摊 or 自定义金额
  splitAmounts: Record<string, number>  // 自定义模式下每人实际消费 { memberId: amount }
  categoryId: string        // 分类ID
  payMethod: string         // 支付方式：alipay/wechat/credit_card/cash/transit_card/etc
  images: string[]          // 图片 base64 列表
  note: string              // 备注
  date: string              // 日期 YYYY-MM-DD
  createdAt: number
}

// 旅行
export interface Trip {
  id: string
  name: string              // 旅行名称
  currency: string          // 当地货币代码，如 USD, JPY, THB
  startDate: string         // 开始日期 YYYY-MM-DD
  endDate: string           // 结束日期 YYYY-MM-DD
  members: TripMember[]
  expenses: TripExpense[]
  createdAt: number
  updatedAt: number
}

// 旅行消费分类
export interface TripCategory {
  id: string
  name: string
  icon: string
}

// 结算转账
export interface Transfer {
  fromId: string
  toId: string
  amount: number
}

// 成员净余额
export interface MemberBalance {
  memberId: string
  name: string
  color: string
  paid: number       // 总共垫付了多少
  share: number      // 总共应该分摊多少
  balance: number    // 净余额 (paid - share)，正数表示别人欠他
}

// 成员消费结构
export interface MemberSpending {
  memberId: string
  name: string
  color: string
  categories: {
    categoryId: string
    categoryName: string
    categoryIcon: string
    amount: number
  }[]
  total: number
}
