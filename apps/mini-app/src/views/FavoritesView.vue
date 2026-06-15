<template>
  <div class="flex flex-col h-full">

    <header class="app-header">
      <h1 class="text-white font-semibold text-lg">Sevimli haydovchilar</h1>
      <p class="text-xs mt-0.5" style="color:rgba(255,255,255,0.55)">
        {{ favorites.length ? `${favorites.length} ta haydovchi` : "Hali haydovchi qo'shilmagan" }}
      </p>
    </header>

    <div class="page-content px-4 py-4">

      <template v-if="loading">
        <div v-for="i in 3" :key="i" class="skeleton h-20 mb-3" />
      </template>

      <div v-else-if="favorites.length === 0" class="flex flex-col items-center pt-16 text-center px-6">
        <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style="background:#FFF7ED">
          <HeartOutlined style="font-size:28px; color:#F59E0B" />
        </div>
        <p class="font-semibold" style="color:var(--text)">Sevimlilar bo'sh</p>
        <p class="text-sm mt-1 leading-relaxed" style="color:var(--muted)">
          Safardan so'ng haydovchini sevimlilarga qo'shing —
          keyingi safar to'g'ridan unga buyurtma yuboring.
        </p>
      </div>

      <div v-else class="space-y-4 slide-up">

        <!-- Active order selector -->
        <div v-if="activeOrders.length > 0" class="card p-4">
          <p class="section-title mb-2">Buyurtma yuborish</p>
          <a-select
            v-model:value="selectedOrderId"
            placeholder="Faol buyurtma tanlang"
            class="w-full"
            :options="orderOptions"
            allow-clear
            size="large"
          />
        </div>

        <!-- Driver cards -->
        <div class="card overflow-hidden">
          <div
            v-for="(fav, i) in favorites"
            :key="fav.driverId"
          >
            <div class="flex items-center gap-3 px-4 py-3.5">
              <!-- Avatar -->
              <div class="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-lg text-white"
                   style="background:linear-gradient(135deg,#1D56C3,#1744A0)">
                {{ fav.driver.name[0] }}
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-sm" style="color:var(--text)">{{ fav.driver.name }}</p>
                <div v-if="fav.driver.driver" class="flex items-center gap-1 mt-0.5">
                  <StarFilled style="color:#F59E0B; font-size:11px" />
                  <span class="text-xs" style="color:var(--muted)">{{ fav.driver.driver.rating.toFixed(1) }}</span>
                  <span style="color:var(--border)" class="mx-1">·</span>
                  <span class="text-xs" style="color:var(--muted)">{{ fav.driver.driver.ratingCount }} safar</span>
                </div>
                <p v-if="fav.driver.phone" class="text-xs mt-0.5" style="color:var(--primary)">
                  {{ fav.driver.phone }}
                </p>
              </div>

              <!-- Actions -->
              <div class="flex gap-2 flex-shrink-0">
                <button
                  v-if="selectedOrderId"
                  class="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity"
                  :style="`background:var(--primary); opacity:${sending === fav.driverId ? 0.55 : 1}`"
                  :disabled="sending === fav.driverId"
                  @click="sendOrder(fav.driverId)"
                >
                  {{ sending === fav.driverId ? '…' : 'Yuborish' }}
                </button>
                <button
                  class="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style="background:#FEE2E2; color:#DC2626"
                  @click="removeFav(fav.driverId)"
                >
                  Olib tashlash
                </button>
              </div>
            </div>
            <div v-if="i < favorites.length - 1" class="divider mx-4" />
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { message } from "ant-design-vue";
import { StarFilled, HeartOutlined } from "@ant-design/icons-vue";
import { api } from "@/services/api";
import { useOrdersStore } from "@/stores/orders";
import type { FavoriteDriver } from "@/types";

const ordersStore = useOrdersStore();
const favorites = ref<FavoriteDriver[]>([]);
const loading = ref(true);
const sending = ref<number | null>(null);
const selectedOrderId = ref<number | null>(null);

const activeOrders = computed(() => ordersStore.activeOrders);
const orderOptions = computed(() =>
  activeOrders.value.map((o) => ({
    value: o.id,
    label: `#${o.id} — ${o.route?.from?.name ?? "?"} → ${o.route?.to?.name ?? "?"}`,
  }))
);

onMounted(async () => {
  try {
    [favorites.value] = await Promise.all([api.getFavorites(), ordersStore.fetchOrders()]);
  } finally {
    loading.value = false;
  }
});

async function removeFav(driverId: number) {
  try {
    await api.removeFavorite(driverId);
    favorites.value = favorites.value.filter((f) => f.driverId !== driverId);
    message.success("Olib tashlandi");
  } catch { message.error("Xatolik yuz berdi"); }
}

async function sendOrder(driverId: number) {
  if (!selectedOrderId.value) return;
  sending.value = driverId;
  try {
    await api.sendOrderToFavorite(driverId, selectedOrderId.value);
    message.success("Buyurtma yuborildi!");
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
  } catch { message.error("Yuborishda xatolik"); }
  finally { sending.value = null; }
}
</script>
