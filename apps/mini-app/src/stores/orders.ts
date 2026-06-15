import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { api } from "@/services/api";
import type { Order } from "@/types";

export const useOrdersStore = defineStore("orders", () => {
  const orders = ref<Order[]>([]);
  const loading = ref(false);

  const activeOrders = computed(() =>
    orders.value.filter((o) => o.status === "ACTIVE")
  );

  const pastOrders = computed(() =>
    orders.value.filter((o) => o.status !== "ACTIVE")
  );

  const activeOfferCount = computed(() =>
    activeOrders.value.reduce((sum, o) => sum + (o.offers?.filter(f => f.status === "PENDING").length ?? 0), 0)
  );

  async function fetchOrders() {
    loading.value = true;
    try {
      orders.value = await api.getOrders();
    } finally {
      loading.value = false;
    }
  }

  async function cancelOrder(id: number) {
    await api.cancelOrder(id);
    const idx = orders.value.findIndex((o) => o.id === id);
    if (idx !== -1) orders.value[idx].status = "CANCELLED";
  }

  async function extendOrder(id: number) {
    const updated = await api.extendOrder(id);
    const idx = orders.value.findIndex((o) => o.id === id);
    if (idx !== -1) orders.value[idx] = updated;
  }

  return { orders, loading, activeOrders, pastOrders, activeOfferCount, fetchOrders, cancelOrder, extendOrder };
});
