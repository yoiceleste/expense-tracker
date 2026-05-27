<template>
  <div class="stats-page">
    <div class="page-header">
      <span class="page-title">统计分析</span>
    </div>

    <!-- 月份选择 -->
    <div class="month-selector">
      <button class="month-btn" @click="prevMonth">‹</button>
      <span class="month-text">{{ displayMonth }}</span>
      <button class="month-btn" @click="nextMonth">›</button>
    </div>

    <!-- 收支概览 -->
    <div class="card">
      <div class="summary-row">
        <div class="summary-item">
          <div class="summary-label">总收入</div>
          <div class="summary-value income">¥{{ formatMoney(summary.totalIncome) }}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">总支出</div>
          <div class="summary-value expense">¥{{ formatMoney(summary.totalExpense) }}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">结余</div>
          <div class="summary-value" :class="{ income: summary.balance >= 0, expense: summary.balance < 0 }">
            ¥{{ formatMoney(summary.balance) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 收支趋势图 -->
    <div class="card">
      <div class="section-title">每日收支趋势</div>
      <div class="chart-container" ref="trendChartRef"></div>
    </div>

    <!-- 分类统计 -->
    <div class="card">
      <div class="section-title">
        支出分类
        <div class="type-toggle">
          <button
            class="toggle-btn"
            :class="{ active: chartType === 'expense' }"
            @click="chartType = 'expense'"
          >
            支出
          </button>
          <button
            class="toggle-btn"
            :class="{ active: chartType === 'income' }"
            @click="chartType = 'income'"
          >
            收入
          </button>
        </div>
      </div>
      <div class="chart-container" ref="pieChartRef"></div>
      <div class="category-list">
        <div
          v-for="item in categoryStats"
          :key="item.categoryId"
          class="category-stat-item"
        >
          <div class="cs-left">
            <span class="cs-icon">{{ item.categoryIcon }}</span>
            <span class="cs-name">{{ item.categoryName }}</span>
          </div>
          <div class="cs-right">
            <div class="cs-bar-wrapper">
              <div class="cs-bar">
                <div
                  class="cs-bar-fill"
                  :style="{ width: item.percentage + '%', background: getBarColor(item.categoryId) }"
                ></div>
              </div>
            </div>
            <span class="cs-amount">¥{{ formatMoney(item.amount) }}</span>
            <span class="cs-percent">{{ item.percentage.toFixed(1) }}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { useExpenseStore } from '../stores/expense'
import { formatMoney, getCurrentMonth } from '../utils/storage'

const store = useExpenseStore()

const currentMonth = ref(getCurrentMonth())
const chartType = ref<'income' | 'expense'>('expense')
const trendChartRef = ref<HTMLElement | null>(null)
const pieChartRef = ref<HTMLElement | null>(null)

let trendChart: echarts.ECharts | null = null
let pieChart: echarts.ECharts | null = null

const displayMonth = computed(() => {
  const [y, m] = currentMonth.value.split('-')
  return `${y}年${parseInt(m)}月`
})

const summary = computed(() => store.getMonthSummary(currentMonth.value))

const categoryStats = computed(() =>
  store.getCategorySummary(currentMonth.value, chartType.value)
)

const COLORS = [
  '#4f6ef7', '#52c41a', '#ff4d4f', '#faad14', '#722ed1',
  '#13c2c2', '#eb2f96', '#fa8c16', '#2f54eb', '#a0d911',
]

function getBarColor(id: string) {
  const index = categoryStats.value.findIndex(c => c.categoryId === id)
  return COLORS[index % COLORS.length]
}

function prevMonth() {
  const [y, m] = currentMonth.value.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  currentMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function nextMonth() {
  const [y, m] = currentMonth.value.split('-').map(Number)
  const d = new Date(y, m, 1)
  currentMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function updateTrendChart() {
  if (!trendChartRef.value) return

  if (!trendChart) {
    trendChart = echarts.init(trendChartRef.value)
  }

  const records = store.getRecordsByMonth(currentMonth.value)
  const [year, month] = currentMonth.value.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()

  const incomeData = new Array(daysInMonth).fill(0)
  const expenseData = new Array(daysInMonth).fill(0)
  const dates: string[] = []

  for (let i = 1; i <= daysInMonth; i++) {
    dates.push(`${i}日`)
    const dateStr = `${currentMonth.value}-${String(i).padStart(2, '0')}`
    records.forEach(r => {
      if (r.date === dateStr) {
        if (r.type === 'income') incomeData[i - 1] += r.amount
        else expenseData[i - 1] += r.amount
      }
    })
  }

  trendChart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter(params: any[]) {
        let tip = params[0].name + '<br/>'
        params.forEach((p: any) => {
          tip += `${p.marker} ${p.seriesName}: ¥${p.value.toFixed(2)}<br/>`
        })
        return tip
      },
    },
    legend: {
      data: ['收入', '支出'],
      bottom: 0,
    },
    grid: {
      top: 10,
      left: 10,
      right: 10,
      bottom: 30,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: {
        fontSize: 10,
        interval: Math.floor(daysInMonth / 7) - 1,
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        fontSize: 10,
        formatter: (v: number) => v >= 1000 ? (v / 1000) + 'k' : v,
      },
    },
    series: [
      {
        name: '收入',
        type: 'bar',
        data: incomeData,
        itemStyle: { color: '#52c41a', borderRadius: [2, 2, 0, 0] },
      },
      {
        name: '支出',
        type: 'bar',
        data: expenseData,
        itemStyle: { color: '#ff4d4f', borderRadius: [2, 2, 0, 0] },
      },
    ],
  })
}

function updatePieChart() {
  if (!pieChartRef.value) return

  if (!pieChart) {
    pieChart = echarts.init(pieChartRef.value)
  }

  const data = categoryStats.value.map((item, index) => ({
    name: item.categoryName,
    value: item.amount,
    itemStyle: { color: COLORS[index % COLORS.length] },
  }))

  pieChart.setOption({
    tooltip: {
      formatter: '{b}: ¥{c} ({d}%)',
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '65%'],
        center: ['50%', '50%'],
        data,
        label: {
          formatter: '{b}\n{d}%',
          fontSize: 11,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.2)',
          },
        },
      },
    ],
  })
}

function handleResize() {
  trendChart?.resize()
  pieChart?.resize()
}

watch([currentMonth, chartType], () => {
  nextTick(() => {
    updateTrendChart()
    updatePieChart()
  })
})

onMounted(() => {
  nextTick(() => {
    updateTrendChart()
    updatePieChart()
  })
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  trendChart?.dispose()
  pieChart?.dispose()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.stats-page {
  padding: 0 12px;
}

.month-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 12px 0;
}

.month-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: var(--card-bg);
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow);
  color: var(--text);
}

.month-text {
  font-size: 18px;
  font-weight: 600;
}

.summary-row {
  display: flex;
  justify-content: space-around;
  text-align: center;
}

.summary-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.summary-value {
  font-size: 18px;
  font-weight: 700;
}

.summary-value.income {
  color: var(--income);
}

.summary-value.expense {
  color: var(--expense);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.type-toggle {
  display: flex;
  background: var(--bg);
  border-radius: 6px;
  padding: 2px;
}

.toggle-btn {
  padding: 4px 12px;
  border: none;
  background: transparent;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  color: var(--text-secondary);
}

.toggle-btn.active {
  background: var(--primary);
  color: white;
}

.chart-container {
  width: 100%;
  height: 250px;
}

/* 分类统计列表 */
.category-list {
  margin-top: 12px;
}

.category-stat-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #fafafa;
}

.category-stat-item:last-child {
  border-bottom: none;
}

.cs-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 80px;
}

.cs-icon {
  font-size: 18px;
}

.cs-name {
  font-size: 13px;
}

.cs-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: flex-end;
}

.cs-bar-wrapper {
  width: 80px;
}

.cs-bar {
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.cs-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.cs-amount {
  font-size: 13px;
  font-weight: 500;
  min-width: 70px;
  text-align: right;
}

.cs-percent {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 42px;
  text-align: right;
}
</style>
