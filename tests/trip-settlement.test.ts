import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { calculateTripTransfers } from '../src/utils/trip-settlement.ts'
import type { Transfer, Trip, TripExpense } from '../src/types/trip.ts'

const members = [
  { id: 'A', name: 'A', color: '#111111' },
  { id: 'B', name: 'B', color: '#222222' },
  { id: 'C', name: 'C', color: '#333333' },
]

let expenseSequence = 0

function expense(overrides: Partial<TripExpense> & Pick<TripExpense, 'payerId' | 'amount' | 'currency' | 'splitAmong'>): TripExpense {
  expenseSequence += 1
  return {
    id: `expense-${expenseSequence}`,
    tripId: 'trip-1',
    payerId: overrides.payerId,
    amount: overrides.amount,
    currency: overrides.currency,
    splitAmong: overrides.splitAmong,
    splitMode: overrides.splitMode || 'equal',
    splitAmounts: overrides.splitAmounts || {},
    categoryId: 'food',
    payMethod: 'cash',
    images: [],
    note: '',
    date: '2026-06-08',
    createdAt: expenseSequence,
  }
}

function trip(expenses: TripExpense[]): Trip {
  return {
    id: 'trip-1',
    name: '测试旅行',
    currency: 'KRW',
    startDate: '',
    endDate: '',
    shareCode: 'TESTCODE',
    members,
    expenses,
    createdAt: 1,
    updatedAt: 1,
  }
}

function settle(expenses: TripExpense[]): Transfer[] {
  return calculateTripTransfers(trip(expenses), {
    getExpenseCurrency: item => item.currency,
    toCnyAmount: (amount, currency) => currency === 'KRW' ? amount * 0.0045 : amount,
  })
}

function findTransfer(transfers: Transfer[], from: string, to: string): Transfer {
  const transfer = transfers.find(item => item.fromMemberId === from && item.toMemberId === to)
  assert.ok(transfer, `expected transfer ${from} -> ${to}`)
  return transfer
}

describe('旅行分账结算', () => {
  it('单币种均摊：A 付 ¥300，A/B/C 各承担 ¥100', () => {
    const transfers = settle([
      expense({ payerId: 'A', amount: 300, currency: 'CNY', splitAmong: ['A', 'B', 'C'] }),
    ])

    assert.equal(transfers.length, 2)
    assert.deepEqual(findTransfer(transfers, 'B', 'A').amountsByCurrency, { CNY: 100 })
    assert.equal(findTransfer(transfers, 'B', 'A').totalCnyAmount, 100)
    assert.deepEqual(findTransfer(transfers, 'C', 'A').amountsByCurrency, { CNY: 100 })
    assert.equal(findTransfer(transfers, 'C', 'A').totalCnyAmount, 100)
  })

  it('单人承担：A 付 ¥100，只有 B 参与', () => {
    const transfers = settle([
      expense({ payerId: 'A', amount: 100, currency: 'CNY', splitAmong: ['B'] }),
    ])

    assert.equal(transfers.length, 1)
    const transfer = findTransfer(transfers, 'B', 'A')
    assert.deepEqual(transfer.amountsByCurrency, { CNY: 100 })
    assert.equal(transfer.totalCnyAmount, 100)
  })

  it('韩元均摊：A 付 ₩60,000，B/C 各欠 ₩20,000，约 ¥90', () => {
    const transfers = settle([
      expense({ payerId: 'A', amount: 60_000, currency: 'KRW', splitAmong: ['A', 'B', 'C'] }),
    ])

    assert.equal(transfers.length, 2)
    for (const debtor of ['B', 'C']) {
      const transfer = findTransfer(transfers, debtor, 'A')
      assert.deepEqual(transfer.amountsByCurrency, { KRW: 20_000 })
      assert.equal(transfer.totalCnyAmount, 90)
    }
  })

  it('韩元与人民币反向债务自动抵扣，最终 B 转给 A ¥170', () => {
    const transfers = settle([
      expense({ payerId: 'A', amount: 60_000, currency: 'KRW', splitAmong: ['B'] }),
      expense({ payerId: 'B', amount: 100, currency: 'CNY', splitAmong: ['A'] }),
    ])

    assert.equal(transfers.length, 1)
    const transfer = findTransfer(transfers, 'B', 'A')
    assert.deepEqual(transfer.amountsByCurrency, { KRW: 60_000 })
    assert.equal(transfer.grossCnyAmount, 270)
    assert.equal(transfer.offsetFromMemberId, 'A')
    assert.equal(transfer.offsetToMemberId, 'B')
    assert.deepEqual(transfer.offsetAmountsByCurrency, { CNY: 100 })
    assert.equal(transfer.offsetCnyAmount, 100)
    assert.equal(transfer.totalCnyAmount, 170)
  })

  it('只有 splitAmong 中的 B/C 参与，A 不承担消费', () => {
    const transfers = settle([
      expense({ payerId: 'A', amount: 90, currency: 'CNY', splitAmong: ['B', 'C'] }),
    ])

    assert.equal(transfers.length, 2)
    assert.deepEqual(findTransfer(transfers, 'B', 'A').amountsByCurrency, { CNY: 45 })
    assert.deepEqual(findTransfer(transfers, 'C', 'A').amountsByCurrency, { CNY: 45 })
    assert.equal(transfers.some(item => item.fromMemberId === 'A'), false)
  })
})
