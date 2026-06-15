<template>
  <div class="flex flex-col h-full relative">

    <!-- Header -->
    <header class="app-header">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs mb-0.5" style="color:rgba(255,255,255,0.55)">Xush kelibsiz</p>
          <h1 class="text-white font-semibold text-lg leading-tight">
            {{ authStore.user?.name ?? "Foydalanuvchi" }}
          </h1>
        </div>
        <button
          class="w-9 h-9 rounded-full flex items-center justify-center"
          style="background:rgba(255,255,255,0.12)"
          @click="router.push({ name: 'profile' })"
        >
          <span class="text-white font-bold text-sm">{{ initials }}</span>
        </button>
      </div>
    </header>

    <!-- FAB -->
    <Transition name="fab">
      <button
        v-show="fabVisible"
        class="absolute right-4 z-50 rounded-full flex items-center justify-center shadow-xl transition-transform active:scale-90"
        style="bottom: 1rem; background: var(--primary); width: 52px; height: 52px"
        @click="router.push({ name: 'create-order' })"
      >
        <PlusOutlined style="color: white; font-size: 20px" />
      </button>
    </Transition>

    <!-- Content -->
    <div ref="scrollEl" class="page-content slide-up" @scroll="onScroll">

      <!-- ── 1 ta faol buyurtma: offerlarni to'g'ridan ko'rsat ── -->
      <template v-if="activeOrders.length === 1">
        <div class="px-4 pt-4">

          <!-- Order summary card -->
          <div class="card p-4 mb-4">
            <div class="flex items-start justify-between gap-3 mb-3">
              <div class="min-w-0 flex-1">
                <p class="font-semibold text-sm truncate" style="color:var(--text)">
                  {{ routeLabel(activeOrders[0]) }}
                </p>
                <p class="text-xs mt-0.5" style="color:var(--muted)">
                  {{ formatDate(activeOrders[0].travelDate) }}
                </p>
              </div>
              <span class="text-sm font-bold flex-shrink-0" style="color:var(--primary)">
                {{ activeOrders[0].price.toLocaleString() }} so'm
              </span>
            </div>
            <div class="flex items-center gap-3 text-xs" style="color:var(--muted)">
              <span>{{ activeOrders[0].seatType === 'FULL' ? 'Butun salon' : `${activeOrders[0].seatCount} o'rin` }}</span>
              <span>·</span>
              <span>{{ activeOrders[0].viewCount ?? 0 }} ko'rdi</span>
              <span v-if="activeOrders[0].isUrgent">·</span>
              <span v-if="activeOrders[0].isUrgent" style="color:#B45309">Tez</span>
            </div>
          </div>

          <!-- Offers section -->
          <div class="flex items-center justify-between mb-3">
            <p class="section-title">
              Takliflar
              <span v-if="singleOffers.length > 0" class="ml-1 font-bold normal-case" style="color:var(--primary)">
                {{ singleOffers.length }}
              </span>
            </p>
            <button
              class="text-xs font-medium"
              style="color:var(--primary)"
              @click="goToOffers(activeOrders[0].id)"
            >
              Hammasini ko'rish →
            </button>
          </div>

          <!-- Loading -->
          <div v-if="offersLoading" class="space-y-3">
            <div v-for="i in 2" :key="i" class="skeleton h-16 rounded-xl" />
          </div>

          <!-- No offers yet -->
          <div v-else-if="singleOffers.length === 0" class="card p-5 text-center">
            <p class="font-medium text-sm mb-1" style="color:var(--text)">Takliflar kutilmoqda</p>
            <p class="text-xs" style="color:var(--muted)">
              {{ activeOrders[0].viewCount ?? 0 }} ta haydovchi ko'rdi — yangi taklif kelganda bildirishnoma olasiz
            </p>
          </div>

          <!-- Offer cards -->
          <div v-else class="space-y-2">
            <div
              v-for="(offer, idx) in singleOffers"
              :key="offer.id"
              class="card p-3 press-scale cursor-pointer flex items-center gap-3"
              :style="idx === 0 ? 'border-color:#FDE68A' : ''"
              @click="goToOffers(activeOrders[0].id)"
            >
              <!-- Rank -->
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                :style="idx === 0
                  ? 'background:#FEF3C7; color:#B45309'
                  : 'background:var(--bg); color:var(--muted)'"
              >
                {{ idx + 1 }}
              </div>

              <!-- Avatar + name -->
              <div class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white text-sm"
                   style="background:linear-gradient(135deg,#1D56C3,#1744A0)">
                {{ offer.driverName[0] }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-sm truncate" style="color:var(--text)">{{ offer.driverName }}</p>
                <div class="flex items-center gap-1 mt-0.5">
                  <StarFilled style="color:#F59E0B; font-size:11px" />
                  <span class="text-xs" style="color:var(--muted)">{{ offer.driverRating.toFixed(1) }}</span>
                  <span v-if="offer.isFavorite" class="ml-1 text-xs font-medium" style="color:#B45309">Sevimli</span>
                </div>
              </div>

              <!-- Price -->
              <div class="text-right flex-shrink-0">
                <p class="font-bold text-sm" style="color:var(--primary)">
                  {{ offer.price.toLocaleString() }}
                </p>
                <p class="text-xs" style="color:var(--muted)">so'm</p>
              </div>
            </div>

            <!-- Accept CTA -->
            <button
              class="w-full py-3 rounded-xl text-sm font-semibold text-white mt-1"
              style="background:var(--primary)"
              @click="goToOffers(activeOrders[0].id)"
            >
              Haydovchi tanlash
            </button>
          </div>
        </div>
      </template>

      <!-- ── Bir nechta faol buyurtma: har birida statistika ── -->
      <template v-else-if="activeOrders.length > 1">
        <div class="px-4 pt-4">
          <div class="flex items-center justify-between mb-3">
            <p class="section-title">Faol buyurtmalar</p>
            <router-link :to="{ name: 'orders' }" class="text-xs font-medium" style="color:var(--primary)">
              Barchasi
            </router-link>
          </div>
          <div class="space-y-3">
            <div
              v-for="order in activeOrders"
              :key="order.id"
              class="card p-4 press-scale cursor-pointer"
              @click="goToOffers(order.id)"
            >
              <div class="flex items-start justify-between gap-3 mb-3">
                <div class="min-w-0 flex-1">
                  <p class="font-semibold text-sm truncate" style="color:var(--text)">
                    {{ routeLabel(order) }}
                  </p>
                  <p class="text-xs mt-0.5" style="color:var(--muted)">{{ formatDate(order.travelDate) }}</p>
                </div>
                <span class="text-sm font-bold flex-shrink-0" style="color:var(--primary)">
                  {{ order.price.toLocaleString() }} so'm
                </span>
              </div>

              <!-- Stats row -->
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5" style="background:var(--bg)">
                  <EyeOutlined style="font-size:12px; color:var(--muted)" />
                  <span class="text-xs font-medium" style="color:var(--text)">{{ order.viewCount ?? 0 }}</span>
                </div>
                <div
                  class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
                  :style="pendingOffers(order) > 0
                    ? 'background:#FEF3C7'
                    : 'background:var(--bg)'"
                >
                  <MessageOutlined style="font-size:12px" :style="pendingOffers(order) > 0 ? 'color:#B45309' : 'color:var(--muted)'" />
                  <span class="text-xs font-medium" :style="pendingOffers(order) > 0 ? 'color:#B45309' : 'color:var(--text)'">
                    {{ pendingOffers(order) }} taklif
                  </span>
                </div>
                <span class="text-xs ml-auto" style="color:var(--primary)">Ko'rish →</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ── Faol buyurtma yo'q ── -->
      <template v-else>
        <div class="px-4 pt-4">
          <div class="card p-5 text-center">
            <div class="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3" style="background:#EEF3FF">
              <CarOutlined style="font-size:22px; color:var(--primary)" />
            </div>
            <p class="text-sm font-medium" style="color:var(--muted)">Faol buyurtmalar yo'q</p>
          </div>
        </div>
      </template>

      <!-- Past orders -->
      <div v-if="ordersStore.pastOrders.length > 0" class="px-4 pt-5 pb-4">
        <div class="flex items-center justify-between mb-3">
          <p class="section-title">O'tgan safarlar</p>
          <router-link :to="{ name: 'orders' }" class="text-xs font-medium" style="color:var(--primary)">
            Barchasi
          </router-link>
        </div>
        <div class="card overflow-hidden">
          <div v-for="(order, i) in ordersStore.pastOrders.slice(0, 4)" :key="order.id">
            <div class="flex items-center gap-3 px-4 py-3">
              <span
                class="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
                :class="statusBg(order.status)"
              >{{ statusIcon(order.status) }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate" style="color:var(--text)">{{ routeLabel(order) }}</p>
                <p class="text-xs" style="color:var(--muted)">{{ formatDate(order.travelDate) }}</p>
              </div>
              <span class="text-xs font-medium flex-shrink-0" :class="statusColor(order.status)">
                {{ statusLabel(order.status) }}
              </span>
            </div>
            <div v-if="i < Math.min(ordersStore.pastOrders.length, 4) - 1" class="divider mx-4" />
          </div>
        </div>
      </div>

      <div v-else class="pb-4" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, useTemplateRef } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useOrdersStore } from "@/stores/orders";
import { CarOutlined, StarFilled, EyeOutlined, MessageOutlined, PlusOutlined } from "@ant-design/icons-vue";
import { api } from "@/services/api";
import type { Offer, Order, OrderStatus } from "@/types";

const router = useRouter();
const authStore = useAuthStore();
const ordersStore = useOrdersStore();

const scrollEl = useTemplateRef<HTMLElement>("scrollEl");
const fabVisible = ref(true);
let lastScrollY = 0;

function onScroll() {
  const y = scrollEl.value?.scrollTop ?? 0;
  if (y < 10) { fabVisible.value = true; }
  else if (y > lastScrollY) { fabVisible.value = false; }
  else if (y < lastScrollY) { fabVisible.value = true; }
  lastScrollY = y;
}

const singleOffers = ref<Offer[]>([]);
const offersLoading = ref(false);
let pollTimer: ReturnType<typeof setInterval> | null = null;

const activeOrders = computed(() => ordersStore.activeOrders);

const initials = computed(() => {
  const name = authStore.user?.name ?? "";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
});

async function loadSingleOffers() {
  if (activeOrders.value.length !== 1) return;
  try {
    singleOffers.value = await api.getOffers(activeOrders.value[0].id);
  } catch { /* silent */ }
}

onMounted(async () => {
  offersLoading.value = true;
  await ordersStore.fetchOrders();
  await loadSingleOffers();
  offersLoading.value = false;

  // Poll har 15s da, faqat 1 ta faol buyurtma bo'lganda
  pollTimer = setInterval(async () => {
    await ordersStore.fetchOrders();
    await loadSingleOffers();
  }, 15_000);
});

onUnmounted(() => { if (pollTimer) clearInterval(pollTimer); });

function goToOffers(orderId: number) {
  router.push({ name: "offers", params: { id: orderId } });
}

function routeLabel(o: Order) {
  return `${o.route?.from?.name ?? "—"} → ${o.route?.to?.name ?? "—"}`;
}
function pendingOffers(o: Order) {
  return o.offers?.filter((f) => f.status === "PENDING").length ?? 0;
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("uz-UZ", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function statusIcon(s: OrderStatus)  { return { ACTIVE:"🟢", COMPLETED:"✅", CANCELLED:"✕", EXPIRED:"–" }[s]; }
function statusBg(s: OrderStatus)    { return { ACTIVE:"bg-blue-50", COMPLETED:"bg-green-50", CANCELLED:"bg-red-50", EXPIRED:"bg-gray-50" }[s]; }
function statusColor(s: OrderStatus) {
  return { ACTIVE:"text-blue-600", COMPLETED:"text-green-600", CANCELLED:"text-red-500", EXPIRED:"text-gray-400" }[s];
}
function statusLabel(s: OrderStatus) {
  return { ACTIVE:"Faol", COMPLETED:"Yakunlandi", CANCELLED:"Bekor", EXPIRED:"Tugadi" }[s];
}
</script>

<style scoped>
.fab-enter-active, .fab-leave-active { transition: opacity 0.2s, transform 0.2s; }
.fab-enter-from, .fab-leave-to { opacity: 0; transform: scale(0.8); }
</style>
