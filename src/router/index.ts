// Composables
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    /*component: () => import('@/layouts/default/Default.vue'),*/
    children: [
      {
        path: '',
        name: 'Main',
        component: () => import('@/views/Tagger.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
