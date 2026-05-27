<template>
  <div class="spending-page">
    <div class="detail-header">
      <button class="back-btn" @click="$router.back()">←</button>
      <span class="header-title">消费结构</span>
      <span style="width:34px"></span>
    </div>

    <!-- 成员选择 -->
    <div class="member-tabs">
      <div
        v-for="m in memberSpendings"
        :key="m.memberId"
        class="member-tab"
        :class="{ active: selectedMember === m.memberId }"
        :style="selectedMember === m.memberId ? { borderColor: m.color, color: m.color } : {}"
        @click="selectedMember = m.memberId"
      >
        <span class="tab-dot" :style="{ background: m.color }"></span>
        {{ m.name }}
      </div>
    </div>

    <!-- 当前成员概览 -->
    <div v-if="currentMember" class="overview-card" :style="{ borderTop: `3px solid ${currentMember.color}` }">
      <div class="overview-name">{{ currentMember.name }} 的消费</div>
      <div class="overview-total">¥{{ formatMoney(currentMember.total) }}</div>
    </div>

    <!-- 分类明细 -->
    <div v-if="currentMember" class="category-list">
      <div
        v-for="cat in currentMember.categories"
        :key="cat.categoryId"
        class="cat-row"
      >
        <div class="cat-left">
          <span class="cat-icon">{{ cat.categoryIcon }}</span>
          <span class="cat-name">{{ cat.categoryName }}</span>
        </div>
        <div class="cat-right">
          <div class="cat-bar-wrapper">
            <div class="cat-bar">
              <div
                class="cat-bar-fill"
                :style="{
                  width: (cat.amount / currentMember.total * 100) + '%',
                  background: currentMember.color
                }"
              ></div>
            </div>
          </div>
          <span class="cat-amount">¥{{ formatMoney(cat.amount) }}</span>
          <span class="cat-percent">
            {{ (cat.amount / currentMember.total * 100).toFixed(0) }}%
          </span>
        </div>
      </div>

      <div v-if="currentMember.categories.length === 0" class="no-data">
        暂无消费记录
      </div>
    </div>

    <!-- 全员对比 -->
    <div class="section-title" style="margin-top: 24px">全员消费对比</div>
    <div class="compare-card">
      <div v-for="m in memberSpendings" :key="m.memberId" class="compare-row">
        <div class="compare-left">
          <span class="compare-dot" :style="{ background: m.color }"></span>
          <span class="compare-name">{{ m.name }}</span>
        </div>
        <div class="compare-right">
          <div class="compare-bar-wrapper">
            <div class="compare-bar">
              <div
                class="compare-bar-fill"
                :style="{
                  width: maxTotal > 0 ? (m.total / maxTotal * 100) + '%' : '0%',
                  background: m.color
                }"
              ></div>
            </div>
          </div>
          <span class="compare-amount">¥{{ formatMoney(m.total) }}</span>
        </div>
      </div>
    </div>

    <!-- 分类对比矩阵 -->
    <div class="section-title" style="margin-top: 24px">分类对比</div>
    <div class="matrix-card">
      <div class="matrix-header">
        <div class="matrix-cell"></div>
        <div v-for="m in trip?.members" :key="m.id" class="matrix-cell header-cell">
          <span class="matrix-dot" :style="{ background: m.color }"></span>
          {{ m.name }}
        </div>
      </div>
      <div v-for="cat in allCategories" :key="cat.id" class="matrix-row">
        <div class="matrix-cell label-cell">
          {{ cat.icon }} {{ cat.name }}
        </div>
        <div v-for="m in memberSpendings" :key="m.memberId" class="matrix-cell value-cell">
          {{ getCatAmount(m, cat.id) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useTripStore } from '../../stores/trip'
import { formatMoney } from '../../utils/trip-storage'
import type { MemberSpending, TripCategory } from '../../types/trip'

const route = useRoute()
const store = useTripStore()
const tripId = route.params.id as string

const trip = computed(() => store.getTripById(tripId))
const memberSpendings = computed(() => trip.value ? store.getMemberSpending(trip.value) : [])
const allCategories = computed(() => store.categories)

const maxTotal = computed(() =>
  Math.max(...memberSpendings.value.map(m => m.total), 1)
)

const selectedMember = ref<string>('')

// 初始化选中第一个成员
if (memberSpendings.value.length > 0) {
  selectedMember.value = memberSpendings.value[0].memberId
}

const currentMember = computed(() =>
  memberSpendings.value.find(m => m.memberId === selectedMember.value)
)

function getCatAmount(member: MemberSpending, catId: string): string {
  const cat = member.categories.find(c => c.categoryId === catId)
  return cat ? '¥' + formatMoney(cat.amount) : '-'
}
</script>

<style scoped>
.spending-page {
  padding: 0 16px 40px;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
}

.back-btn {
  width: 34px;
  height: 34px;
  border: none;
  background: var(--card-bg);
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.header-title {
  font-size: 17px;
  font-weight: 600;
}

/* 成员切换 */
.member-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  margin-bottom: 16px;
}

.member-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1.5px solid var(--border);
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
  color: var(--text-secondary);
}

.member-tab.active {
  border-color: currentColor;
}

.tab-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* 概览 */
.overview-card {
  background: var(--card-bg);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.overview-name {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.overview-total {
  font-size: 32px;
  font-weight: 700;
}

/* 分类列表 */
.category-list {
  background: var(--card-bg);
  border-radius: 14px;
  padding: 4px 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.cat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
}

.cat-row:last-child {
  border-bottom: none;
}

.cat-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 80px;
}

.cat-icon {
  font-size: 20px;
}

.cat-name {
  font-size: 14px;
  font-weight: 500;
}

.cat-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  justify-content: flex-end;
}

.cat-bar-wrapper {
  width: 80px;
}

.cat-bar {
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.cat-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.cat-amount {
  font-size: 14px;
  font-weight: 600;
  min-width: 60px;
  text-align: right;
}

.cat-percent {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 36px;
  text-align: right;
}

.no-data {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
  font-size: 14px;
}

/* 全员对比 */
.section-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 10px;
  color: var(--text-secondary);
}

.compare-card {
  background: var(--card-bg);
  border-radius: 14px;
  padding: 4px 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.compare-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.compare-row:last-child {
  border-bottom: none;
}

.compare-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 60px;
}

.compare-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.compare-name {
  font-size: 14px;
  font-weight: 500;
}

.compare-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  justify-content: flex-end;
}

.compare-bar-wrapper {
  width: 100px;
}

.compare-bar {
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.compare-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}

.compare-amount {
  font-size: 14px;
  font-weight: 600;
  min-width: 60px;
  text-align: right;
}

/* 矩阵 */
.matrix-card {
  background: var(--card-bg);
  border-radius: 14px;
  padding: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  overflow-x: auto;
}

.matrix-header {
  display: flex;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 8px;
  margin-bottom: 4px;
}

.matrix-row {
  display: flex;
  padding: 6px 0;
}

.matrix-cell {
  min-width: 70px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.header-cell {
  justify-content: center;
  font-weight: 500;
}

.matrix-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.label-cell {
  font-weight: 500;
  color: var(--text-secondary);
}

.value-cell {
  justify-content: center;
  font-weight: 500;
  color: var(--text);
}
</style>
