<template>
  <div class="flex flex-col h-full">

    <!-- Header -->
    <header class="app-header">
      <button class="flex items-center gap-1.5 text-sm mb-3 press-scale" style="color:rgba(255,255,255,0.65)" @click="router.back()">
        <LeftOutlined style="font-size:11px" /> Orqaga
      </button>
      <div v-if="order">
        <h1 class="text-white font-semibold text-base">{{ routeLabel }}</h1>
        <p class="text-xs mt-0.5" style="color:rgba(255,255,255,0.55)">{{ formatDate(order.travelDate) }}</p>
      </div>
    </header>

    <!-- Status strip -->
    <div
      v-if="order"
      class="flex-shrink-0 flex items-center justify-between px-4 py-3"
      style="background:var(--surface); border-bottom:1px solid var(--border)"
    >
      <div class="flex items-center gap-3">
        <StepChip label="Yaratildi"         :done="true" />
        <ChipConnector />
        <StepChip :label="`${order.viewCount ?? 0} ko'rdi`" :done="true" />
        <ChipConnector />
        <StepChip :label="`${offers.length} taklif`"         :done="offers.length > 0" accent />
        <ChipConnector />
        <StepChip label="Tanlandi"           :done="!!accepted" />
      </div>
      <span class="text-sm font-bold" style="color:var(--primary)">
        {{ order.price.toLocaleString() }} so'm
      </span>
    </div>

    <!-- Content -->
    <div class="page-content px-4 pt-4">

      <template v-if="loading">
        <div v-for="i in 3" :key="i" class="skeleton h-20 mb-3" />
      </template>

      <!-- Accepted -->
      <div v-else-if="accepted" class="slide-up">
        <div class="card p-6 text-center">
          <div class="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4"
               style="background: linear-gradient(135deg,#1D56C3,#1744A0)">
            <span class="text-white font-bold text-3xl">{{ accepted.driverName[0] }}</span>
          </div>
          <h2 class="font-bold text-lg" style="color:var(--text)">{{ accepted.driverName }}</h2>
          <div class="flex items-center justify-center gap-1 mt-1">
            <StarFilled style="color:#F59E0B; font-size:13px" />
            <span class="text-sm font-medium" style="color:var(--text)">{{ accepted.driverRating.toFixed(1) }}</span>
          </div>

          <div
            v-if="driverPhone"
            class="mt-5 rounded-2xl px-5 py-4"
            style="background:#F0FDF4; border:1px solid #BBF7D0"
          >
            <p class="text-xs font-medium mb-1" style="color:#16A34A">Telefon raqam</p>
            <a :href="`tel:${driverPhone}`" class="text-xl font-bold" style="color:#15803D">
              {{ driverPhone }}
            </a>
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="offers.length === 0" class="flex flex-col items-center pt-12 text-center px-6">
        <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style="background:#EEF3FF">
          <ClockCircleOutlined style="font-size:28px; color:var(--primary)" />
        </div>
        <p class="font-semibold" style="color:var(--text)">Takliflar kutilmoqda</p>
        <p class="text-sm mt-1 leading-relaxed" style="color:var(--muted)">
          Haydovchilar buyurtmangizni ko'rib chiqmoqda.
          Taklif kelganda bildirishnoma olasiz.
        </p>
        <div class="mt-4 card w-full max-w-xs flex items-center gap-3 px-4 py-3">
          <EyeOutlined style="color:var(--primary)" />
          <span class="text-sm" style="color:var(--text)">
            <strong>{{ order?.viewCount ?? 0 }}</strong> ta haydovchi ko'rdi
          </span>
        </div>
      </div>

      <!-- Offers list -->
      <div v-else class="space-y-3 slide-up">
        <p class="section-title mb-1">{{ offers.length }} ta taklif — narx bo'yicha</p>
        <div
          v-for="(offer, idx) in offers"
          :key="offer.id"
          class="card p-4 press-scale cursor-pointer"
          :style="idx === 0 ? 'border-color:#FDE68A' : ''"
          @click="selectOffer(offer)"
        >
          <div v-if="idx === 0" class="flex items-center gap-1 mb-3">
            <span class="badge" style="background:#FEF3C7; color:#B45309">Eng arzon narx</span>
          </div>
          <div class="flex items-center gap-3">
            <!-- Avatar -->
            <div class="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-lg text-white"
                 style="background:linear-gradient(135deg,#1D56C3,#1744A0)">
              {{ offer.driverName[0] }}
            </div>
            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <p class="font-semibold text-sm truncate" style="color:var(--text)">{{ offer.driverName }}</p>
                <span v-if="offer.isFavorite" class="badge" style="background:#FEF3C7;color:#B45309">Sevimli</span>
              </div>
              <div class="flex items-center gap-1 mt-0.5">
                <StarFilled style="color:#F59E0B; font-size:11px" />
                <span class="text-xs" style="color:var(--muted)">{{ offer.driverRating.toFixed(1) }}</span>
              </div>
            </div>
            <!-- Price -->
            <div class="text-right flex-shrink-0">
              <p class="font-bold text-base" style="color:var(--primary)">
                {{ offer.price.toLocaleString() }}
              </p>
              <p class="text-xs" style="color:var(--muted)">so'm</p>
              <p
                v-if="order && offer.price < order.price"
                class="text-xs font-semibold"
                style="color:#16A34A"
              >{{ ((order.price - offer.price) / order.price * 100).toFixed(0) }}% arzon</p>
              <p
                v-else-if="order && offer.price > order.price"
                class="text-xs"
                style="color:#DC2626"
              >+{{ (offer.price - order.price).toLocaleString() }}</p>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Accept modal -->
    <a-modal v-model:open="confirmModal.open" :title="null" :footer="null" centered>
      <div v-if="confirmModal.offer" class="py-3">
        <div class="text-center mb-5">
          <div class="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-3 font-bold text-2xl text-white"
               style="background:linear-gradient(135deg,#1D56C3,#1744A0)">
            {{ confirmModal.offer.driverName[0] }}
          </div>
          <h3 class="font-bold text-lg" style="color:var(--text)">{{ confirmModal.offer.driverName }}</h3>
          <div class="flex items-center justify-center gap-1 mt-1">
            <StarFilled style="color:#F59E0B; font-size:13px" />
            <span class="text-sm" style="color:var(--muted)">{{ confirmModal.offer.driverRating.toFixed(1) }} reyting</span>
          </div>
        </div>

        <div class="rounded-xl p-4 mb-4 space-y-2" style="background:var(--bg); border:1px solid var(--border)">
          <div class="flex justify-between text-sm">
            <span style="color:var(--muted)">Haydovchi taklifi</span>
            <span class="font-bold" style="color:var(--primary)">{{ confirmModal.offer.price.toLocaleString() }} so'm</span>
          </div>
          <div class="flex justify-between text-sm">
            <span style="color:var(--muted)">Sizning narxingiz</span>
            <span class="font-medium" style="color:var(--text)">{{ order?.price.toLocaleString() }} so'm</span>
          </div>
        </div>

        <p class="text-xs text-center mb-4" style="color:var(--muted)">
          Tasdiqlasangiz haydovchining telefon raqami ko'rsatiladi
        </p>
        <div class="space-y-2">
          <a-button type="primary" block size="large" :loading="confirmModal.loading" @click="confirmAccept">
            Haydovchini tanlash
          </a-button>
          <a-button block size="large" @click="confirmModal.open = false">Bekor qilish</a-button>
        </div>
      </div>
    </a-modal>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, defineComponent, h } from "vue";
import { useRouter } from "vue-router";
import { message } from "ant-design-vue";
import { LeftOutlined, StarFilled, ClockCircleOutlined, EyeOutlined } from "@ant-design/icons-vue";
import { api } from "@/services/api";
import type { Order, Offer } from "@/types";

const props = defineProps<{ orderId: number }>();
const router = useRouter();

const order = ref<Order | null>(null);
const offers = ref<Offer[]>([]);
const loading = ref(true);
const driverPhone = ref<string | null>(null);
let pollTimer: ReturnType<typeof setInterval> | null = null;

const accepted = computed(() => offers.value.find((o) => o.status === "ACCEPTED"));

const routeLabel = computed(() => {
  if (!order.value) return "";
  return `${order.value.route?.from?.name ?? "—"} → ${order.value.route?.to?.name ?? "—"}`;
});

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("uz-UZ", {
    day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });
}

async function loadData() {
  try {
    const [ord, ofs] = await Promise.all([api.getOrder(props.orderId), api.getOffers(props.orderId)]);
    order.value = ord;
    offers.value = ofs;
  } finally {
    loading.value = false;
  }
}

onMounted(() => { loadData(); pollTimer = setInterval(loadData, 15_000); });
onUnmounted(() => { if (pollTimer) clearInterval(pollTimer); });

const confirmModal = ref({ open: false, offer: null as Offer | null, loading: false });

function selectOffer(offer: Offer) {
  if (order.value?.status !== "ACTIVE") return;
  confirmModal.value = { open: true, offer, loading: false };
}

async function confirmAccept() {
  if (!confirmModal.value.offer) return;
  confirmModal.value.loading = true;
  try {
    const res = await api.acceptOffer(props.orderId, confirmModal.value.offer.id);
    driverPhone.value = res.driverPhone;
    await loadData();
    confirmModal.value.open = false;
    message.success("Haydovchi tanlandi!");
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
  } catch {
    message.error("Xatolik yuz berdi");
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("error");
  } finally {
    confirmModal.value.loading = false;
  }
}

// Sub-components
const StepChip = defineComponent({
  props: { label: String, done: Boolean, accent: Boolean },
  setup(p) {
    return () =>
      h("div", { class: "flex flex-col items-center gap-0.5" }, [
        h("div", {
          class: "w-2 h-2 rounded-full",
          style: `background: ${p.done ? (p.accent ? "var(--accent)" : "var(--primary)") : "var(--border)"}`,
        }),
        h("span", {
          class: "text-[10px] whitespace-nowrap",
          style: `color: ${p.done ? "var(--text)" : "var(--muted)"}`,
        }, p.label),
      ]);
  },
});

const ChipConnector = defineComponent({
  setup: () => () => h("div", { class: "flex-1 h-px", style: "background:var(--border)" }),
});
</script>
