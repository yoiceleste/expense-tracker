import { createRouter, createWebHashHistory } from 'vue-router'
import { getSession } from '../lib/auth'

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
      redirect: '/home',
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
    // ===== 旅行分账 =====
    {
      path: '/trips',
      name: 'Trips',
      component: () => import('../views/trip/TripsView.vue'),
    },
    {
      path: '/trip/:id',
      name: 'TripDetail',
      component: () => import('../views/trip/TripDetailView.vue'),
    },
    {
      path: '/trip/:id/add',
      name: 'TripAddExpense',
      component: () => import('../views/trip/TripAddExpenseView.vue'),
    },
    {
      path: '/trip/:id/settle',
      name: 'TripSettle',
      component: () => import('../views/trip/TripSettleView.vue'),
    },
    {
      path: '/trip/:id/spending',
      name: 'TripSpending',
      component: () => import('../views/trip/TripSpendingView.vue'),
    },
  ],
})

// 路由守卫：未登录跳转登录页
router.beforeEach(async (to) => {
  // 公开页面不需要认证
  if (to.meta.public) return true

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
