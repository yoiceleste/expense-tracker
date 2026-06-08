import assert from 'node:assert/strict'
import test from 'node:test'
import type { Trip, TripExpense } from '../types/trip.ts'
import { calculateTripTransfers } from './trip-settlement.ts'

const members = [
  { id: 'alice', name: 'Alice', color: '#111' },
  { id: 'bob', name: 'Bob', color: '#222' },
  { id: 'carol', name: 'Carol', color: '#333' },
]

function expense(overrides: Partial<TripExpense> = {}): TripExpense {
  return {
    id: 'expense-1',
    tripId: 'trip-1',
    payerId: 'alice',
    amount: 0,
    currency: 'CNY',
    splitAmong: [],
    splitMode: 'equal',
    splitAmounts: {},
    categoryId: 'food',
    payMethod: 'cash',
    images: [],
    note: '',
    date: '2026-06-08',
    createdAt: 1,
    ...overrides,
  }
}

function trip(expenses: TripExpense[]): Trip {
  return {
    id: 'trip-1',
    name: 'Test trip',
    currency: 'CNY',
    startDate: '',
    endDate: '',
    shareCode: 'ABC123',
    members,
    expenses,
    createdAt: 1,
    updatedAt: 1,
  }
}

test('returns no transfers when the trip has no expenses', () => {
  assert.deepEqual(calculateTripTransfers(trip([])), [])
})

test('settles an equally split expense with one transfer', () => {
  const result = calculateTripTransfers(trip([
    expense({ amount: 100, splitAmong: ['alice', 'bob'] }),
  ]))

  assert.deepEqual(result, [{
    fromMemberId: 'bob',
    toMemberId: 'alice',
    amountsByCurrency: { CNY: 50 },
    totalCnyAmount: 50,
    grossCnyAmount: 50,
  }])
})

test('uses custom split amounts for each participant', () => {
  const result = calculateTripTransfers(trip([
    expense({
      amount: 120,
      splitAmong: ['alice', 'bob', 'carol'],
      splitMode: 'custom',
      splitAmounts: { alice: 20, bob: 40, carol: 60 },
    }),
  ]))

  assert.deepEqual(result.map(({ fromMemberId, toMemberId, totalCnyAmount }) => ({
    fromMemberId,
    toMemberId,
    totalCnyAmount,
  })), [
    { fromMemberId: 'carol', toMemberId: 'alice', totalCnyAmount: 60 },
    { fromMemberId: 'bob', toMemberId: 'alice', totalCnyAmount: 40 },
  ])
})

test('nets several expenses into a minimal set of member transfers', () => {
  const result = calculateTripTransfers(trip([
    expense({ id: 'one', payerId: 'alice', amount: 90, splitAmong: ['alice', 'bob', 'carol'] }),
    expense({ id: 'two', payerId: 'bob', amount: 30, splitAmong: ['alice', 'bob', 'carol'] }),
  ]))

  assert.deepEqual(result.map(({ fromMemberId, toMemberId, totalCnyAmount }) => ({
    fromMemberId,
    toMemberId,
    totalCnyAmount,
  })), [
    { fromMemberId: 'carol', toMemberId: 'alice', totalCnyAmount: 40 },
    { fromMemberId: 'bob', toMemberId: 'alice', totalCnyAmount: 10 },
  ])
})

test('offsets opposite currency debts by their CNY value', () => {
  const result = calculateTripTransfers(trip([
    expense({
      id: 'usd',
      payerId: 'alice',
      amount: 20,
      currency: 'USD',
      splitAmong: ['bob'],
    }),
    expense({
      id: 'cny',
      payerId: 'bob',
      amount: 100,
      currency: 'CNY',
      splitAmong: ['alice'],
    }),
  ]), { USD: 7 })

  assert.deepEqual(result, [{
    fromMemberId: 'bob',
    toMemberId: 'alice',
    amountsByCurrency: { USD: 20 },
    totalCnyAmount: 40,
    grossCnyAmount: 140,
    offsetFromMemberId: 'alice',
    offsetToMemberId: 'bob',
    offsetAmountsByCurrency: { CNY: 100 },
    offsetCnyAmount: 100,
  }])
})
