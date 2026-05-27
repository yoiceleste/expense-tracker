<template>
  <div class="trips-page">
    <div class="page-header">
      <span class="page-title">旅行分账</span>
    </div>

    <div v-if="store.trips.length === 0" class="empty-state">
      <div class="icon">✈️</div>
      <div class="text">还没有旅行计划</div>
      <div class="sub-text">创建一个旅行，轻松管理多人花销</div>
    </div>

    <div
      v-for="trip in store.trips"
      :key="trip.id"
      class="trip-card"
      @click="$router.push(`/trip/${trip.id}`)"
    >
      <div class="trip-top">
        <div class="trip-info">
          <div class="trip-name">{{ trip.name }}</div>
          <div class="trip-meta">
            <template v-if="trip.startDate">{{ trip.startDate }}</template>
            <template v-if="trip.startDate && trip.endDate"> ~ {{ trip.endDate }}</template>
            <template v-if="!trip.startDate">创建于 {{ new Date(trip.createdAt).toLocaleDateString() }}</template>
            · {{ trip.members.length }}人 · {{ trip.expenses.length }}笔
          </div>
        </div>
        <div class="trip-amount">¥{{ formatMoney(getTripTotal(trip)) }}</div>
      </div>
      <div class="trip-members">
        <div
          v-for="member in trip.members.slice(0, 6)"
          :key="member.id"
          class="avatar"
          :style="{ background: member.color }"
        >
          {{ member.name[0] }}
        </div>
        <div v-if="trip.members.length > 6" class="avatar more">
          +{{ trip.members.length - 6 }}
        </div>
      </div>
    </div>

    <!-- 新建旅行弹窗 -->
    <button class="fab" style="display:none" @click="showCreate = true">+</button>

    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal">
        <div class="modal-title">新建旅行</div>
        <div class="form-row">
          <input v-model="tripName" class="input" placeholder="旅行名称，如：三亚之旅" />
        </div>
        <div class="form-row">
          <label class="form-label">当地货币</label>
          <select v-model="selectedCurrency" class="input currency-select">
            <option v-for="cur in popularCurrencies" :key="cur.code" :value="cur.code">
              {{ cur.flag }} {{ cur.name }} ({{ cur.code }})
            </option>
          </select>
        </div>
        <div class="form-row date-row">
          <div class="date-field">
            <label class="form-label">开始日期</label>
            <input v-model="startDate" type="date" class="input" />
          </div>
          <div class="date-field">
            <label class="form-label">结束日期</label>
            <input v-model="endDate" type="date" class="input" />
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="showCreate = false">取消</button>
          <button class="btn btn-primary" @click="createTrip">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTripStore } from '../../stores/trip'
import { formatMoney } from '../../utils/trip-storage'
import { popularCurrencies } from '../../types/currencies'
import type { Trip } from '../../types/trip'

const router = useRouter()
const route = useRoute()
const store = useTripStore()

const showCreate = ref(false)
const tripName = ref('')
const selectedCurrency = ref('CNY')
const startDate = ref('')
const endDate = ref('')

// 打开创建弹窗
function openCreateModal() {
  showCreate.value = true
  // 清除 query 参数
  if (route.query.create) {
    router.replace({ path: '/trips', query: {} })
  }
}

// 监听底部导航 + 按钮传来的 create 参数
watch(() => route.query.create, (val) => {
  if (val === '1') {
    openCreateModal()
  }
})

// 组件挂载时也检查 query 参数（处理直接导航到 /trips?create=1 的情况）
onMounted(() => {
  if (route.query.create === '1') {
    openCreateModal()
  }
})

function getTripTotal(trip: Trip) {
  return trip.expenses.reduce((s, e) => s + e.amount, 0)
}

async function createTrip() {
  const name = tripName.value.trim()
  if (!name) { alert('请输入旅行名称'); return }

  const trip = await store.createTrip(name, selectedCurrency.value, startDate.value, endDate.value)
  showCreate.value = false
  tripName.value = ''
  selectedCurrency.value = 'CNY'
  startDate.value = ''
  endDate.value = ''

  // 创建者自动加入（使用默认昵称"我"）
  await store.joinTrip(trip.id, '我')

  // 复制分享链接
  const link = store.getShareLink(trip)
  try {
    await navigator.clipboard.writeText(link)
    alert(`旅行创建成功！邀请链接已复制，发给朋友即可加入`)
  } catch {
    alert(`旅行创建成功！\n\n邀请链接：\n${link}`)
  }

  router.push(`/trip/${trip.id}`)
}
</script>

<style scoped>
.trips-page {
  padding: 0 16px;
}

.empty-state {
  padding: 60px 20px;
  text-align: center;
}

.empty-state .icon {
  font-size: 56px;
  margin-bottom: 16px;
}

.empty-state .text {
  font-size: 17px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 6px;
}

.empty-state .sub-text {
  font-size: 13px;
  color: var(--text-secondary);
}

.trip-card {
  background: var(--card-bg);
  border-radius: 14px;
  padding: 18px;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  cursor: pointer;
  transition: transform 0.15s;
}

.trip-card:active {
  transform: scale(0.98);
}

.trip-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
}

.trip-name {
  font-size: 17px;
  font-weight: 600;
  margin-bottom: 4px;
}

.trip-meta {
  font-size: 13px;
  color: var(--text-secondary);
}

.trip-amount {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary);
}

.trip-members {
  display: flex;
  gap: 6px;
}

.avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: white;
}

.avatar.more {
  background: var(--bg);
  color: var(--text-secondary);
  font-size: 11px;
}

/* FAB */
.fab {
  display: none;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 200;
}

.modal {
  background: var(--card-bg);
  border-radius: 20px 20px 0 0;
  padding: 28px 20px;
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 20px;
}

.form-row {
  margin-bottom: 16px;
}

.date-row {
  display: flex;
  gap: 10px;
}

.date-field {
  flex: 1;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.member-inputs {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.member-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.member-input {
  flex: 1;
}

.remove-member {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--bg);
  border-radius: 50%;
  font-size: 16px;
  color: var(--text-secondary);
  cursor: pointer;
  flex-shrink: 0;
}

.add-member-btn {
  width: 100%;
  padding: 10px;
  border: 1px dashed var(--border);
  background: transparent;
  border-radius: 10px;
  font-size: 14px;
  color: var(--primary);
  cursor: pointer;
  margin-top: 4px;
}

/* 货币选择 */
.currency-select {
  width: 100%;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 24px;
}

.modal-actions .btn {
  flex: 1;
  padding: 12px;
}
</style>
