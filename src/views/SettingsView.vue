<template>
  <div class="settings-page">
    <div class="page-header">
      <span class="page-title">设置</span>
    </div>

    <!-- 账户管理 -->
    <div class="card">
      <div class="section-title">账户管理</div>
      <div v-for="acc in store.accounts" :key="acc.id" class="account-item">
        <span class="acc-icon">{{ acc.icon }}</span>
        <div class="acc-info">
          <div class="acc-name">{{ acc.name }}</div>
          <div class="acc-balance">余额: ¥{{ formatMoney(acc.balance) }}</div>
        </div>
      </div>
    </div>

    <!-- 分类管理 -->
    <div class="card">
      <div class="section-title">
        分类管理
        <button class="btn btn-ghost" style="padding: 4px 10px; font-size: 12px" @click="showAddCategory = true">
          + 添加
        </button>
      </div>

      <div class="category-section">
        <div class="category-type-label">支出分类</div>
        <div class="category-manage-list">
          <div
            v-for="cat in store.expenseCategories"
            :key="cat.id"
            class="category-manage-item"
          >
            <span class="cm-icon">{{ cat.icon }}</span>
            <span class="cm-name">{{ cat.name }}</span>
            <button
              v-if="!cat.isDefault"
              class="cm-delete"
              @click="deleteCategory(cat.id)"
            >×</button>
          </div>
        </div>
      </div>

      <div class="category-section">
        <div class="category-type-label">收入分类</div>
        <div class="category-manage-list">
          <div
            v-for="cat in store.incomeCategories"
            :key="cat.id"
            class="category-manage-item"
          >
            <span class="cm-icon">{{ cat.icon }}</span>
            <span class="cm-name">{{ cat.name }}</span>
            <button
              v-if="!cat.isDefault"
              class="cm-delete"
              @click="deleteCategory(cat.id)"
            >×</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 数据管理 -->
    <div class="card">
      <div class="section-title">数据管理</div>
      <div class="data-actions">
        <button class="btn btn-primary btn-block" @click="exportData">导出数据</button>
        <button class="btn btn-ghost btn-block" @click="triggerImport">导入数据</button>
        <input ref="fileInput" type="file" accept=".json" style="display: none" @change="importData" />
        <button class="btn btn-danger btn-block" @click="clearData">清空所有数据</button>
      </div>
    </div>

    <!-- 用户与登录 -->
    <div class="card">
      <div class="section-title">账号</div>
      <div class="user-info" v-if="userEmail">
        <span class="user-email">{{ userEmail }}</span>
      </div>
      <button class="btn btn-ghost btn-block" style="margin-top: 8px" @click="handleLogout">退出登录</button>
    </div>

    <!-- 关于 -->
    <div class="card">
      <div class="section-title">关于</div>
      <div class="about-info">
        <p>记账本 v2.0</p>
        <p class="about-desc">数据已同步至云端，支持多设备登录。</p>
      </div>
    </div>

    <!-- 添加分类弹窗 -->
    <div v-if="showAddCategory" class="modal-overlay" @click.self="showAddCategory = false">
      <div class="modal">
        <div class="modal-title">添加分类</div>
        <div class="form-row">
          <label class="form-label">类型</label>
          <div class="type-switch">
            <button
              class="type-btn"
              :class="{ active: newCategory.type === 'expense' }"
              @click="newCategory.type = 'expense'"
            >
              支出
            </button>
            <button
              class="type-btn"
              :class="{ active: newCategory.type === 'income' }"
              @click="newCategory.type = 'income'"
            >
              收入
            </button>
          </div>
        </div>
        <div class="form-row">
          <label class="form-label">名称</label>
          <input v-model="newCategory.name" type="text" class="input" placeholder="分类名称" />
        </div>
        <div class="form-row">
          <label class="form-label">图标（Emoji）</label>
          <div class="emoji-picker">
            <button
              v-for="emoji in commonEmojis"
              :key="emoji"
              class="emoji-btn"
              :class="{ selected: newCategory.icon === emoji }"
              @click="newCategory.icon = emoji"
            >
              {{ emoji }}
            </button>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="showAddCategory = false">取消</button>
          <button class="btn btn-primary" @click="addCategory">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useExpenseStore } from '../stores/expense'
import { formatMoney } from '../utils/storage'
import { currentUser, signOut } from '../lib/auth'

const store = useExpenseStore()
const router = useRouter()
const fileInput = ref<HTMLInputElement | null>(null)
const showAddCategory = ref(false)
const userEmail = ref('')

const newCategory = reactive({
  type: 'expense' as 'income' | 'expense',
  name: '',
  icon: '📌',
})

const commonEmojis = [
  '📌', '🍔', '🍕', '☕', '🚕', '🚌', '📱', '💻',
  '🎬', '⚽', '🎵', '📚', '✈️', '🏥', '🐾', '🎁',
  '🏠', '💡', '🔧', '👕', '💄', '🎮', '📷', '🛒',
]

async function deleteCategory(id: string) {
  if (confirm('确定删除此分类？已有记录的分类不会被删除。')) {
    await store.removeCategory(id)
  }
}

async function addCategory() {
  if (!newCategory.name.trim()) {
    alert('请输入分类名称')
    return
  }
  await store.addCategoryData({
    name: newCategory.name.trim(),
    icon: newCategory.icon,
    type: newCategory.type,
    isDefault: false,
  })
  newCategory.name = ''
  newCategory.icon = '📌'
  showAddCategory.value = false
}

async function exportData() {
  const data = await store.exportAllData()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `记账数据_${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function triggerImport() {
  fileInput.value?.click()
}

function importData(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string)
      if (confirm('导入将覆盖当前所有数据，确定继续吗？')) {
        store.importAllData(data)
        alert('导入成功！')
      }
    } catch {
      alert('文件格式错误，请选择正确的JSON文件')
    }
  }
  reader.readAsText(file)
}

function clearData() {
  if (confirm('确定清空所有数据？此操作不可恢复！')) {
    if (confirm('再次确认：真的要清空所有记账数据吗？')) {
      localStorage.clear()
      window.location.reload()
    }
  }
}

async function handleLogout() {
  if (confirm('确定退出登录？')) {
    await signOut()
    router.replace('/login')
  }
}

onMounted(() => {
  userEmail.value = currentUser?.email || ''
})
</script>

<style scoped>
.settings-page {
  padding: 0 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* 账户 */
.account-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.account-item:last-child {
  border-bottom: none;
}

.acc-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  border-radius: 10px;
}

.acc-name {
  font-size: 14px;
  font-weight: 500;
}

.acc-balance {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* 分类管理 */
.category-section {
  margin-bottom: 16px;
}

.category-type-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.category-manage-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.category-manage-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: var(--bg);
  border-radius: 8px;
}

.cm-icon {
  font-size: 16px;
}

.cm-name {
  font-size: 13px;
}

.cm-delete {
  border: none;
  background: none;
  color: #ccc;
  font-size: 16px;
  cursor: pointer;
  padding: 0 2px;
}

.cm-delete:hover {
  color: var(--expense);
}

/* 数据操作 */
.data-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 关于 */
.about-info {
  font-size: 14px;
  color: var(--text-secondary);
}

.about-desc {
  margin-top: 4px;
  font-size: 13px;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.modal {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px;
  width: 320px;
  max-width: 90vw;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 20px;
  text-align: center;
}

.form-row {
  margin-bottom: 14px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 6px;
  color: var(--text-secondary);
}

.type-switch {
  display: flex;
  background: var(--bg);
  border-radius: 8px;
  padding: 3px;
}

.type-btn {
  flex: 1;
  padding: 8px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.type-btn.active {
  background: var(--primary);
  color: white;
}

.emoji-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.emoji-btn {
  width: 36px;
  height: 36px;
  border: 2px solid transparent;
  background: var(--bg);
  border-radius: 8px;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emoji-btn.selected {
  border-color: var(--primary);
  background: var(--primary-light);
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.modal-actions .btn {
  flex: 1;
}
</style>
