import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/views/HomeView.vue"),
    },
    {
      path: "/orders",
      name: "orders",
      component: () => import("@/views/OrdersView.vue"),
    },
    {
      path: "/orders/create",
      name: "create-order",
      component: () => import("@/views/CreateOrderView.vue"),
    },
    {
      path: "/orders/:id/offers",
      name: "offers",
      component: () => import("@/views/OffersView.vue"),
      props: (route) => ({ orderId: Number(route.params.id) }),
    },
    {
      path: "/favorites",
      name: "favorites",
      component: () => import("@/views/FavoritesView.vue"),
    },
    {
      path: "/profile",
      name: "profile",
      component: () => import("@/views/ProfileView.vue"),
    },
  ],
});

export default router;
