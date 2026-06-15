<template>
  <div class="flex flex-col h-full">

    <!-- Header -->
    <header class="app-header">
      <h1 class="text-white font-semibold text-lg">Buyurtmalarim</h1>
    </header>

    <!-- Tabs -->
    <div class="flex-shrink-0 flex" style="background:var(--surface); border-bottom: 1px solid var(--border)">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="flex-1 py-3 text-sm font-semibold transition-colors relative"
        :style="activeTab === tab.key
          ? 'color:var(--primary)'
          : 'color:var(--muted)'"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
        <span
          v-if="tab.key === 'active' && ordersStore.activeOrders.length > 0"
          class="ml-1.5 text-xs font-bold px-1.5 py-0.5 rounded-full"
          style="background:#DBEAFE; color:var(--primary)"
        >{{ ordersStore.activeOrders.length }}</span>
        <span
          v-if="activeTab === tab.key"
          class="absolute bottom-0 left-0 right-0 h-0.5 rounded-t"
          style="background:var(--primary)"
        />
      </button>
    </div>

    <!-- Content -->
    <div class="page-content px-4 py-4" :key="activeTab">

      <template v-if="ordersStore.loading">
        <div v-for="i in 3" :key="i" class="skeleton h-24 mb-3" />
      </template>

      <template v-else-if="currentOrders.length === 0">
        <div class="flex flex-col items-center justify-center pt-16 px-8 text-center">
          <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style="background:#EEF3FF">
            <span class="text-2xl">{{ activeTab === 'active' ? '📭' : '🗂' }}</span>
          </div>
          <p class="font-semibold" style="color:var(--text)">
            {{ activeTab === 'active' ? "Faol buyurtma yo'q" : "Tarix bo'sh" }}
          </p>
          <p class="text-sm mt-1 leading-relaxed" style="color:var(--muted)">
            {{ activeTab === 'active'
              ? "Yangi buyurtma yarating — haydovchi topamiz"
              : "Tugagan safarlaringiz bu yerda ko'rinadi" }}
          </p>
          <button
            v-if="activeTab === 'active'"
            class="mt-5 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
            style="background:var(--primary)"
            @click="router.push({ name: 'create-order' })"
          >
            Buyurtma berish
          </button>
        </div>
      </template>

      <template v-else>
        <div class="space-y-3 slide-up">
          <OrderCard
            v-for="order in currentOrders"
            :key="order.id"
            :order="order"
            @click="openOrder(order)"
            @cancel="cancelOrder(order.id)"
            @extend="extendOrder(order.id)"
            @rate="openRate(order)"
          />
        </div>
      </template>
    </div>

    <!-- Rate modal -->
    <a-modal v-model:open="rateModal.open" title="Haydovchini baholang" :footer="null" centered>
      <div class="py-2 space-y-4">
        <a-rate v-model:value="rateModal.rating" allow-half class="text-2xl block text-center" />
        <a-textarea v-model:value="rateModal.comment" placeholder="Izoh (ixtiyoriy)" :rows="3" />
        <a-button type="primary" block size="large" :loading="rateModal.loading"
          :disabled="!rateModal.rating" @click="submitRate">
          Baholash
        </a-button>
      </div>
    </a-modal>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineComponent, h } from "vue";
import { useRouter } from "vue-router";
import { message, Modal } from "ant-design-vue";
import { StarFilled } from "@ant-design/icons-vue";
import { useOrdersStore } from "@/stores/orders";
import { api } from "@/services/api";
import type { Order, OrderStatus } from "@/types";

const router = useRouter();
const ordersStore = useOrdersStore();
const activeTab = ref<"active" | "history">("active");

const tabs = [
  { key: "active"  as const, label: "Faol" },
  { key: "history" as const, label: "Tarix" },
];

const currentOrders = computed(() =>
  activeTab.value === "active" ? ordersStore.activeOrders : ordersStore.pastOrders
);

onMounted(() => ordersStore.fetchOrders());

function openOrder(order: Order) {
  if (order.status === "ACTIVE") router.push({ name: "offers", params: { id: order.id } });
}

async function cancelOrder(id: number) {
  Modal.confirm({
    title: "Bekor qilish",
    content: "Buyurtmani bekor qilmoqchimisiz?",
    okText: "Ha, bekor", okType: "danger", cancelText: "Yo'q",
    async onOk() {
      try {
        await ordersStore.cancelOrder(id);
        message.success("Bekor qilindi");
      } catch { message.error("Xatolik yuz berdi"); }
    },
  });
}

async function extendOrder(id: number) {
  try {
    await ordersStore.extendOrder(id);
    message.success("1 soatga uzaytirildi");
  } catch { message.error("Uzaytirish imkoni yo'q"); }
}

const rateModal = ref({ open: false, orderId: 0, rating: 0, comment: "", loading: false });

function openRate(order: Order) {
  rateModal.value = { open: true, orderId: order.id, rating: 0, comment: "", loading: false };
}

async function submitRate() {
  rateModal.value.loading = true;
  try {
    await api.rateOrder(rateModal.value.orderId, rateModal.value.rating, rateModal.value.comment || undefined);
    message.success("Bahoyingiz qabul qilindi");
    rateModal.value.open = false;
  } catch { message.error("Baholashda xatolik"); }
  finally { rateModal.value.loading = false; }
}

function statusInfo(s: OrderStatus) {
  return {
    ACTIVE:    { label: "Faol",         bg: "#DBEAFE", color: "#1D56C3" },
    COMPLETED: { label: "Yakunlandi",   bg: "#DCFCE7", color: "#16A34A" },
    CANCELLED: { label: "Bekor",        bg: "#FEE2E2", color: "#DC2626" },
    EXPIRED:   { label: "Muddati o'tdi", bg: "#F3F4F6", color: "#6B7280" },
  }[s] ?? { label: s, bg: "#F3F4F6", color: "#6B7280" };
}

// OrderCard
const OrderCard = defineComponent({
  props: { order: { type: Object as () => Order, required: true } },
  emits: ["click", "cancel", "extend", "rate"],
  setup(props, { emit }) {
    const si = computed(() => statusInfo(props.order.status));
    const pending = computed(() => props.order.offers?.filter((f) => f.status === "PENDING").length ?? 0);
    const routeLabel = computed(() =>
      `${props.order.route?.from?.name ?? "—"} → ${props.order.route?.to?.name ?? "—"}`
    );
    const dateLabel = computed(() =>
      new Date(props.order.travelDate).toLocaleDateString("uz-UZ", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      })
    );

    return () =>
      h("div", {
        class: "card p-4 press-scale cursor-pointer",
        onClick: () => emit("click"),
      }, [
        // Top row
        h("div", { class: "flex items-start justify-between gap-3 mb-3" }, [
          h("div", { class: "min-w-0 flex-1" }, [
            h("p", { class: "font-semibold text-sm truncate", style: "color:var(--text)" }, routeLabel.value),
            h("p", { class: "text-xs mt-0.5", style: "color:var(--muted)" }, dateLabel.value),
          ]),
          h("span", {
            class: "badge flex-shrink-0",
            style: `background:${si.value.bg}; color:${si.value.color}`,
          }, si.value.label),
        ]),

        // Price + seat row
        h("div", { class: "flex items-center gap-3" }, [
          h("span", { class: "text-sm font-bold", style: "color:var(--primary)" },
            `${props.order.price.toLocaleString()} so'm`),
          h("span", { style: "color:var(--border)" }, "·"),
          h("span", { class: "text-xs", style: "color:var(--muted)" },
            props.order.seatType === "FULL" ? "Butun salon" : `${props.order.seatCount} o'rin`),
          props.order.isUrgent
            ? h("span", { class: "text-xs px-2 py-0.5 rounded-full font-medium", style: "background:#FEF3C7; color:#B45309" }, "Tez")
            : null,
        ]),

        // Active order actions
        props.order.status === "ACTIVE" && h("div", {}, [
          h("div", { class: "divider my-3" }),
          pending.value > 0
            ? h("div", { class: "flex items-center justify-between rounded-xl px-3 py-2.5", style: "background:#EEF3FF" }, [
                h("span", { class: "text-sm font-medium", style: "color:var(--primary)" }, `${pending.value} ta taklif keldi`),
                h("span", { class: "text-xs font-semibold", style: "color:var(--primary)" }, "Ko'rish →"),
              ])
            : h("p", { class: "text-xs text-center py-1", style: "color:var(--muted)" }, "Haydovchilar ko'rib chiqmoqda…"),
          h("div", { class: "flex gap-2 mt-2" }, [
            !props.order.isExtended
              ? h("button", {
                  class: "flex-1 py-2 text-xs font-medium rounded-xl border",
                  style: "border-color:var(--border); color:var(--text)",
                  onClick: (e: MouseEvent) => { e.stopPropagation(); emit("extend"); },
                }, "Muddatni uzaytirish")
              : null,
            h("button", {
              class: "flex-1 py-2 text-xs font-medium rounded-xl",
              style: "background:#FEE2E2; color:#DC2626",
              onClick: (e: MouseEvent) => { e.stopPropagation(); emit("cancel"); },
            }, "Bekor qilish"),
          ]),
        ]),

        // Completed: rate
        props.order.status === "COMPLETED" && h("div", {}, [
          h("div", { class: "divider my-3" }),
          h("button", {
            class: "w-full py-2 text-xs font-semibold rounded-xl border",
            style: "border-color:var(--border); color:var(--text)",
            onClick: (e: MouseEvent) => { e.stopPropagation(); emit("rate"); },
          }, [
            h(StarFilled, { class: "text-yellow-400 mr-1" }),
            "Haydovchini baholash",
          ]),
        ]),
      ]);
  },
});
</script>
