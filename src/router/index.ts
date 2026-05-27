import { createRouter, createWebHashHistory } from 'vue-router'
import { getSession, currentUser } from '../lib/auth'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      redirect: '/trips',
    },
    {
      path: '/home',
      name: 'Home',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/add',
      name: 'AddRecord',
      component: () => import('../views/AddRecordView.vue'),
    },
    {
      path: '/records',
      name: 'Records',
      component: () => import('../views/RecordsView.vue'),
    },
    {
      path: '/stats',
      name: 'Stats',
      component: () => import('../views/StatsView.vue'),
    },
    {
      path: '/budget',
      name: 'Budget',
      component: () => import('../views/BudgetView.vue'),
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('../views/SettingsView.vue'),
    },
    // ===== 旅行分账（公开，无需登录） =====
    {
      path: '/trips',
      name: 'Trips',
      component: () => import('../views/trip/TripsView.vue'),
      meta: { public: true },
    },
    {
      path: '/join/:code',
      name: 'JoinTrip',
      component: () => import('../views/trip/JoinTripView.vue'),
      meta: { public: true },
    },
    {
      path: '/trip/:id',
      name: 'TripDetail',
      component: () => import('../views/trip/TripDetailView.vue'),
      meta: { public: true },
    },
    {
      path: '/trip/:id/add',
      name: 'TripAddExpense',
      component: () => import('../views/trip/TripAddExpenseView.vue'),
      meta: { public: true },
    },
    {
      path: '/trip/:id/settle',
      name: 'TripSettle',
      component: () => import('../views/trip/TripSettleView.vue'),
      meta: { public: true },
    },
    {
      path: '/trip/:id/spending',
      name: 'TripSpending',
      component: () => import('../views/trip/TripSpendingView.vue'),
      meta: { public: true },
    },
  ],
})

// 路由守卫：未登录跳转登录页（旅行相关页面除外）
router.beforeEach(async (to) => {
  // 公开页面不需要认证
  if (to.meta.public) return true

  // 先检查 currentUser（可能已被登录页设置）
  if (currentUser) return true

  try {
    const session = await getSession()
    if (session) return true
  } catch {
    // ignore
  }

  // 未登录，跳转登录页
  return { path: '/login', query: { redirect: to.fullPath } }
})

export default router
