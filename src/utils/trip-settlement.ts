import type { Transfer, Trip, TripExpense } from '../types/trip.ts'

export interface SettlementOptions {
  getExpenseCurrency: (expense: TripExpense, trip: Trip) => string
  toCnyAmount: (amount: number, currency: string) => number
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100
}

/**
 * 按原始交易币种计算成员债务，再将同一对成员的反向债务按 CNY 抵消。
 * amountsByCurrency 始终保留原始币种金额，totalCnyAmount 仅表示最终净额建议。
 */
export function calculateTripTransfers(trip: Trip, options: SettlementOptions): Transfer[] {
  const transfersByPair = new Map<string, Transfer>()
  const currencies = Array.from(new Set(
    trip.expenses.map(expense => options.getExpenseCurrency(expense, trip))
  ))

  function addTransfer(fromMemberId: string, toMemberId: string, currency: string, amount: number) {
    const roundedAmount = roundMoney(amount)
    if (roundedAmount <= 0.01) return
    const key = `${fromMemberId}->${toMemberId}`
    const existing = transfersByPair.get(key) || {
      fromMemberId,
      toMemberId,
      amountsByCurrency: {},
      totalCnyAmount: 0,
      grossCnyAmount: 0,
    }
    existing.amountsByCurrency[currency] = roundMoney(
      (existing.amountsByCurrency[currency] || 0) + roundedAmount
    )
    existing.grossCnyAmount = roundMoney(
      existing.grossCnyAmount + options.toCnyAmount(roundedAmount, currency)
    )
    existing.totalCnyAmount = existing.grossCnyAmount
    transfersByPair.set(key, existing)
  }

  currencies.forEach(currency => {
    const balances = trip.members.map(member => ({ memberId: member.id, balance: 0 }))

    trip.expenses
      .filter(expense => options.getExpenseCurrency(expense, trip) === currency)
      .forEach(expense => {
        const payer = balances.find(balance => balance.memberId === expense.payerId)
        if (payer) payer.balance += expense.amount

        const selectedParticipants = expense.splitAmong.filter(memberId =>
          balances.some(balance => balance.memberId === memberId)
        )

        if (expense.splitMode === 'custom' && expense.splitAmounts) {
          selectedParticipants.forEach(memberId => {
            const member = balances.find(balance => balance.memberId === memberId)
            if (member) member.balance -= expense.splitAmounts[memberId] || 0
          })
        } else if (selectedParticipants.length > 0) {
          const perPerson = expense.amount / selectedParticipants.length
          selectedParticipants.forEach(memberId => {
            const member = balances.find(balance => balance.memberId === memberId)
            if (member) member.balance -= perPerson
          })
        }
      })

    const creditors = balances
      .filter(balance => balance.balance > 0.01)
      .map(balance => ({ ...balance }))
      .sort((a, b) => b.balance - a.balance)
    const debtors = balances
      .filter(balance => balance.balance < -0.01)
      .map(balance => ({ memberId: balance.memberId, balance: Math.abs(balance.balance) }))
      .sort((a, b) => b.balance - a.balance)

    let creditorIndex = 0
    let debtorIndex = 0
    while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
      const amount = Math.min(
        creditors[creditorIndex].balance,
        debtors[debtorIndex].balance
      )
      addTransfer(
        debtors[debtorIndex].memberId,
        creditors[creditorIndex].memberId,
        currency,
        amount
      )
      creditors[creditorIndex].balance -= amount
      debtors[debtorIndex].balance -= amount
      if (creditors[creditorIndex].balance < 0.01) creditorIndex++
      if (debtors[debtorIndex].balance < 0.01) debtorIndex++
    }
  })

  const directedTransfers = Array.from(transfersByPair.values())
  const netTransfers: Transfer[] = []
  const handledPairs = new Set<string>()

  directedTransfers.forEach(transfer => {
    const pairKey = [transfer.fromMemberId, transfer.toMemberId].sort().join('<->')
    if (handledPairs.has(pairKey)) return
    handledPairs.add(pairKey)

    const reverse = transfersByPair.get(`${transfer.toMemberId}->${transfer.fromMemberId}`)
    if (!reverse) {
      if (transfer.grossCnyAmount > 0.01) {
        netTransfers.push({
          ...transfer,
          totalCnyAmount: roundMoney(transfer.grossCnyAmount),
        })
      }
      return
    }

    const [winner, offset] = transfer.grossCnyAmount >= reverse.grossCnyAmount
      ? [transfer, reverse]
      : [reverse, transfer]
    const netCnyAmount = roundMoney(winner.grossCnyAmount - offset.grossCnyAmount)
    if (netCnyAmount <= 0.01) return

    netTransfers.push({
      ...winner,
      totalCnyAmount: netCnyAmount,
      offsetFromMemberId: offset.fromMemberId,
      offsetToMemberId: offset.toMemberId,
      offsetAmountsByCurrency: offset.amountsByCurrency,
      offsetCnyAmount: roundMoney(offset.grossCnyAmount),
    })
  })

  return netTransfers.sort((a, b) => b.totalCnyAmount - a.totalCnyAmount)
}
