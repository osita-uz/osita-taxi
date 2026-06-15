<template>
  <div class="flex flex-col h-full" style="background:var(--bg)">
    <!-- Header -->
    <header class="app-header relative">
      <button
        class="absolute left-4 top-5 w-8 h-8 flex items-center justify-center rounded-full text-white"
        style="background:rgba(255,255,255,0.12)"
        @click="handleBack"
      >
        <LeftOutlined style="font-size:14px" />
      </button>
      <div class="text-center">
        <p class="text-xs" style="color:rgba(255,255,255,0.5)">{{ stepLabels[step] }}</p>
        <h2 class="text-white font-semibold text-base mt-0.5">Yangi buyurtma</h2>
      </div>
      <div class="flex items-center gap-1 mt-3">
        <div v-for="i in totalSteps" :key="i" class="step-dot" :class="{ active: i - 1 === step }" />
      </div>
    </header>

    <!-- Step content -->
    <div class="page-content">
      <transition name="step" mode="out-in">
        <!-- Step 0: From location -->
        <LocationStep
          v-if="step === 0"
          key="from"
          title="Qayerdan ketasiz?"
          :locations="locations"
          :loading="locLoading"
          v-model:locationId="form.fromLocationId"
          v-model:locationName="form.fromLocationName"
          v-model:place="form.fromPlace"
          @next="step++"
        />

        <!-- Step 1: To location -->
        <LocationStep
          v-else-if="step === 1"
          key="to"
          title="Qayerga borasiz?"
          :locations="locations"
          :loading="locLoading"
          :excludeLocationId="form.fromLocationId"
          v-model:locationId="form.toLocationId"
          v-model:locationName="form.toLocationName"
          v-model:place="form.toPlace"
          @next="handleToNext"
        />

        <!-- Step 2: Date & time -->
        <div v-else-if="step === 2" key="date" class="p-4 slide-up">
          <p class="font-semibold mb-0.5" style="color:var(--text)">Sana va vaqt</p>
          <p class="text-sm mb-4" style="color:var(--muted)">Qachon yo'lga chiqasiz?</p>

          <div class="space-y-2">
            <!-- Date picker -->
            <div class="card px-3 pt-3 pb-2">
              <!-- Quick badges -->
              <div class="flex gap-2 mb-2">
                <button
                  v-for="(badge, i) in quickDates"
                  :key="i"
                  class="px-3 py-1 rounded-lg text-xs font-semibold border-2 transition-all"
                  :style="selectedDateMs === badge.value
                    ? 'border-color:var(--primary); background:#EEF3FF; color:var(--primary)'
                    : 'border-color:var(--border); background:var(--bg); color:var(--muted)'"
                  @click="selectedDateMs = badge.value"
                >
                  {{ badge.label }}
                </button>
              </div>

              <ScrollPicker v-model="selectedDateMs" :items="dateItems" />
            </div>

            <!-- Time picker (optional) -->
            <div class="card px-3 pt-3 pb-2">
              <div class="flex items-center justify-between mb-2">
                <p class="section-title">Vaqt <span style="font-weight:400; text-transform:none; letter-spacing:0">(ixtiyoriy)</span></p>
                <a-switch v-model:checked="timeEnabled" size="small" />
              </div>

              <div v-if="timeEnabled" class="flex items-center gap-1">
                <ScrollPicker v-model="selectedHour" :items="hourItems" class="flex-1" />
                <span class="text-xl font-bold" style="color:var(--primary); flex-shrink:0">:</span>
                <ScrollPicker v-model="selectedMinute" :items="minuteItems" class="flex-1" />
              </div>
              <p v-else class="text-sm text-center py-3" style="color:var(--muted)">
                Soat ko'rsatilmaydi
              </p>
            </div>

            <div v-if="driverCount > 0" class="flex items-center gap-2 rounded-xl px-3 py-2.5 card">
              <span style="color:var(--primary)">🚗</span>
              <p class="text-sm font-medium" style="color:var(--primary)">
                Bu yo'nalishda <strong>{{ driverCount }}</strong> ta haydovchi mavjud
              </p>
            </div>
          </div>

          <div class="mt-4">
            <button class="btn-primary" @click="step++">Davom etish</button>
          </div>
        </div>

        <!-- Step 3: Seats & luggage -->
        <div v-else-if="step === 3" key="seats" class="p-4 slide-up">
          <p class="font-semibold mb-0.5" style="color:var(--text)">O'rin va bagaj</p>
          <p class="text-sm mb-4" style="color:var(--muted)">O'rin turini va bagajni belgilang</p>

          <div class="space-y-3">
            <div class="card p-4">
              <p class="section-title mb-3">O'rin turi</p>
              <div class="grid grid-cols-2 gap-3">
                <button
                  v-for="opt in seatOptions" :key="opt.value"
                  class="rounded-xl p-3 text-center border-2 border-solid transition-all"
                  :style="form.seatType === opt.value
                    ? 'border-color:var(--primary); background:#EEF3FF'
                    : 'border-color:var(--border); background:var(--bg)'"
                  @click="form.seatType = opt.value; if (opt.value === 'FULL') form.seatCount = undefined"
                >
                  <div class="text-2xl mb-1.5">{{ opt.icon }}</div>
                  <p class="text-sm font-semibold" :style="form.seatType === opt.value ? 'color:var(--primary)' : 'color:var(--text)'">
                    {{ opt.label }}
                  </p>
                  <p class="text-xs mt-0.5" style="color:var(--muted)">{{ opt.desc }}</p>
                </button>
              </div>

              <div v-if="form.seatType === 'PARTIAL'" class="mt-4">
                <p class="text-sm mb-2" style="color:var(--muted)">Nechta o'rin?</p>
                <div class="flex gap-2">
                  <button v-for="n in [1,2,3,4]" :key="n"
                    class="flex-1 h-11 rounded-xl font-bold text-base border-2 transition-all"
                    :style="form.seatCount === n
                      ? 'background:var(--primary); color:white; border-color:var(--primary)'
                      : 'background:var(--bg); color:var(--primary); border-color:var(--border)'"
                    @click="form.seatCount = n">
                    {{ n }}
                  </button>
                </div>
              </div>
            </div>

            <div class="card p-4">
              <p class="section-title mb-3">Bagaj</p>
              <div class="grid grid-cols-3 gap-2">
                <button v-for="opt in luggageOptions" :key="opt.value"
                  class="rounded-xl py-3 text-center border-2 border-solid transition-all"
                  :style="form.luggage === opt.value
                    ? 'border-color:var(--primary); background:#EEF3FF'
                    : 'border-color:var(--border); background:var(--bg)'"
                  @click="form.luggage = opt.value">
                  <div class="text-xl mb-1">{{ opt.icon }}</div>
                  <p class="text-xs font-medium" :style="form.luggage === opt.value ? 'color:var(--primary)' : 'color:var(--muted)'">
                    {{ opt.label }}
                  </p>
                </button>
              </div>
            </div>
          </div>

          <div class="mt-4">
            <a-button type="primary" block size="large"
              :disabled="form.seatType === 'PARTIAL' && !form.seatCount" @click="step++">
              Davom etish
            </a-button>
          </div>
        </div>

        <!-- Step 4: Price -->
        <div v-else-if="step === 4" key="price" class="p-4 slide-up">
          <p class="font-semibold mb-0.5" style="color:var(--text)">Narx</p>
          <p class="text-sm mb-4" style="color:var(--muted)">Taklif qiladigan narxni kiriting</p>

          <div v-if="routeStats?.hasEnoughData" class="card p-4 mb-3">
            <p class="section-title mb-3">Bozor narxi</p>
            <div class="flex items-center gap-2">
              <div class="text-center">
                <p class="text-sm font-bold" style="color:#16A34A">{{ fmtPrice(routeStats.min) }}</p>
                <p class="text-xs" style="color:var(--muted)">Min</p>
              </div>
              <div class="flex-1 h-1 rounded-full" style="background:linear-gradient(to right, #16A34A, #F59E0B, #DC2626)" />
              <div class="text-center">
                <p class="text-sm font-bold" style="color:var(--accent)">{{ fmtPrice(routeStats.avg) }}</p>
                <p class="text-xs" style="color:var(--muted)">O'rta</p>
              </div>
              <div class="flex-1 h-1 rounded-full" style="background:linear-gradient(to right, #F59E0B, #DC2626)" />
              <div class="text-center">
                <p class="text-sm font-bold" style="color:#DC2626">{{ fmtPrice(routeStats.max) }}</p>
                <p class="text-xs" style="color:var(--muted)">Maks</p>
              </div>
            </div>
          </div>

          <div class="card p-4">
            <p class="section-title mb-2">Narxingiz (so'mda)</p>
            <a-input-number v-model:value="form.price" :min="1000" :step="5000"
              :formatter="(v: number) => v ? v.toLocaleString() : ''"
              :parser="(v: string) => Number(v.replace(/[^0-9]/g, '')) || 0"
              placeholder="masalan: 150 000" class="w-full" size="large" />
            <div v-if="routeStats?.hasEnoughData" class="flex gap-2 mt-3">
              <button v-for="preset in pricePresets" :key="preset.label"
                class="flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all"
                :style="form.price === preset.value
                  ? 'border-color:var(--primary); background:#EEF3FF; color:var(--primary)'
                  : 'border-color:var(--border); background:var(--bg); color:var(--muted)'"
                @click="form.price = preset.value">
                {{ preset.label }}
              </button>
            </div>
          </div>

          <div class="card p-4 mt-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-sm" style="color:var(--text)">Tez ketaman</p>
                <p class="text-xs mt-0.5" style="color:var(--muted)">Yo'lda haydovchilarga ustuvor</p>
              </div>
              <a-switch v-model:checked="form.isUrgent" />
            </div>
          </div>

          <div class="card p-4 mt-3">
            <p class="section-title mb-2">Izoh (ixtiyoriy)</p>
            <a-textarea v-model:value="form.note" placeholder="Qo'shimcha ma'lumot…"
              :rows="2" :maxlength="200" show-count />
          </div>

          <div class="mt-4">
            <a-button type="primary" block size="large" :disabled="!form.price || form.price < 1000" @click="step++">
              Davom etish
            </a-button>
          </div>
        </div>

        <!-- Step 5: Confirm -->
        <div v-else-if="step === 5" key="confirm" class="p-4 slide-up">
          <p class="font-semibold mb-0.5" style="color:var(--text)">Tasdiqlash</p>
          <p class="text-sm mb-4" style="color:var(--muted)">Ma'lumotlarni tekshiring</p>

          <div class="card overflow-hidden mb-4">
            <ConfirmRow label="Yo'nalish">
              <span class="font-semibold" style="color:var(--text)">{{ fromLabel }}</span>
              <RightOutlined style="font-size:10px; color:var(--muted); margin:0 4px" />
              <span class="font-semibold" style="color:var(--text)">{{ toLabel }}</span>
            </ConfirmRow>
            <div class="divider mx-4" />
            <ConfirmRow label="Joy">{{ form.fromPlace }} → {{ form.toPlace }}</ConfirmRow>
            <div class="divider mx-4" />
            <ConfirmRow label="Sana">{{ formatDateTime() }}</ConfirmRow>
            <div class="divider mx-4" />
            <ConfirmRow label="O'rin">
              {{ form.seatType === 'FULL' ? "Butun salon" : `${form.seatCount} ta o'rin` }}
            </ConfirmRow>
            <div class="divider mx-4" />
            <ConfirmRow label="Bagaj">
              {{ { NONE: "Yo'q", SMALL: "Kichik", LARGE: "Katta" }[form.luggage] }}
            </ConfirmRow>
            <div class="divider mx-4" />
            <ConfirmRow label="Narx">
              <span class="font-bold" style="color:var(--primary)">{{ fmtPrice(form.price) }} so'm</span>
            </ConfirmRow>
            <template v-if="form.isUrgent">
              <div class="divider mx-4" />
              <ConfirmRow label="Rejim">
                <span class="font-medium" style="color:#B45309">Tezkor</span>
              </ConfirmRow>
            </template>
            <template v-if="form.note">
              <div class="divider mx-4" />
              <ConfirmRow label="Izoh">{{ form.note }}</ConfirmRow>
            </template>
          </div>

          <div class="space-y-3">
            <a-button type="primary" block size="large" :loading="submitting" @click="submit">
              Buyurtma berish
            </a-button>
            <a-button block size="large" @click="step--">Ortga</a-button>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, defineComponent, h } from "vue";
import { useRouter } from "vue-router";
import { message } from "ant-design-vue";
import { LeftOutlined, RightOutlined } from "@ant-design/icons-vue";
import { api } from "@/services/api";
import { useOrdersStore } from "@/stores/orders";
import LocationStep from "@/components/LocationStep.vue";
import ScrollPicker from "@/components/ScrollPicker.vue";
import type { Location, RouteStats, SeatType, Luggage } from "@/types";

const router = useRouter();
const ordersStore = useOrdersStore();

const step = ref(0);
const totalSteps = 6;
const stepLabels = [
  "1-qadam: Chiqish joyi",
  "2-qadam: Borish joyi",
  "3-qadam: Sana va vaqt",
  "4-qadam: O'rin va bagaj",
  "5-qadam: Narx",
  "6-qadam: Tasdiqlash",
];

const form = reactive({
  fromLocationId: 0,
  fromLocationName: "",
  fromPlace: "",
  toLocationId: 0,
  toLocationName: "",
  toPlace: "",
  seatType: "PARTIAL" as SeatType,
  seatCount: 1 as number | undefined,
  luggage: "NONE" as Luggage,
  price: undefined as number | undefined,
  note: "",
  isUrgent: false,
});

const locations = ref<Location[]>([]);
const locLoading = ref(false);
const routeStats = ref<RouteStats | null>(null);
const driverCount = ref(0);
const routeId = ref<number | null>(null);
const submitting = ref(false);

// Date/time state
const _todayMidnight = (() => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); })();
const _now = new Date();
const selectedDateMs = ref<number>(_todayMidnight);
const selectedHour = ref(_now.getHours());
const selectedMinute = ref(Math.floor(_now.getMinutes() / 5) * 5);
const timeEnabled = ref(false);

const DAY_SHORT = ["Yak", "Du", "Se", "Chor", "Pay", "Ju", "Sha"];
const MONTH_SHORT = ["yan","fev","mar","apr","may","iyn","iyl","avg","sen","okt","noy","dek"];

const dateItems = computed(() => {
  const items: { label: string; value: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(_todayMidnight);
    d.setDate(d.getDate() + i);
    const label =
      i === 0 ? "Bugun" :
      i === 1 ? "Ertaga" :
      i === 2 ? "Indin" :
      `${DAY_SHORT[d.getDay()]}, ${d.getDate()}-${MONTH_SHORT[d.getMonth()]}`;
    items.push({ label, value: d.getTime() });
  }
  return items;
});

const quickDates = computed(() => dateItems.value.slice(0, 3));

const hourItems = Array.from({ length: 24 }, (_, i) => ({
  label: String(i).padStart(2, "0"),
  value: i,
}));

const minuteItems = Array.from({ length: 12 }, (_, i) => ({
  label: String(i * 5).padStart(2, "0"),
  value: i * 5,
}));

onMounted(async () => {
  locLoading.value = true;
  try {
    locations.value = await api.getLocations();
  } finally {
    locLoading.value = false;
  }
});

async function handleToNext() {
  step.value++;
  if (form.fromLocationId && form.toLocationId) {
    try {
      const route = await api.lookupRoute(form.fromLocationId, form.toLocationId);
      routeId.value = route.id;
      const [stats, cnt] = await Promise.all([
        api.getRouteStats(route.id),
        api.getRouteDriversCount(route.id),
      ]);
      routeStats.value = stats;
      driverCount.value = cnt.count;
    } catch { /* non-critical */ }
  }
}

const seatOptions = [
  { value: "FULL" as SeatType, icon: "🚌", label: "Butun salon", desc: "Mashina to'liq sizniki" },
  { value: "PARTIAL" as SeatType, icon: "💺", label: "N ta o'rin", desc: "Faqat kerakli o'rinlar" },
];

const luggageOptions = [
  { value: "NONE" as Luggage, icon: "🚫", label: "Yo'q" },
  { value: "SMALL" as Luggage, icon: "🧳", label: "Kichik" },
  { value: "LARGE" as Luggage, icon: "📦", label: "Katta" },
];

const pricePresets = computed(() => {
  if (!routeStats.value?.hasEnoughData) return [];
  return [
    { label: "Min", value: routeStats.value.min! },
    { label: "O'rta", value: routeStats.value.avg! },
    { label: "Maks", value: routeStats.value.max! },
  ];
});

const fromLabel = computed(() => form.fromLocationName || `Joyi: ${form.fromLocationId}`);
const toLabel = computed(() => form.toLocationName || `Joyi: ${form.toLocationId}`);

function fmtPrice(v: number | null | undefined) {
  if (!v) return "—";
  return v.toLocaleString();
}

function formatDateTime() {
  const d = new Date(selectedDateMs.value);
  if (timeEnabled.value) {
    d.setHours(selectedHour.value, selectedMinute.value, 0, 0);
    return d.toLocaleDateString("uz-UZ", {
      day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }
  return d.toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric" });
}

function buildTravelDate() {
  const d = new Date(selectedDateMs.value);
  d.setHours(
    timeEnabled.value ? selectedHour.value : 12,
    timeEnabled.value ? selectedMinute.value : 0,
    0, 0
  );
  return d.toISOString();
}

function handleBack() {
  if (step.value === 0) router.back();
  else step.value--;
}

async function submit() {
  if (!routeId.value) {
    message.error("Yo'nalish topilmadi");
    return;
  }
  submitting.value = true;
  try {
    await api.createOrder({
      routeId: routeId.value,
      fromPlace: form.fromPlace,
      toPlace: form.toPlace,
      travelDate: buildTravelDate(),
      seatType: form.seatType,
      seatCount: form.seatType === "PARTIAL" ? form.seatCount : undefined,
      luggage: form.luggage,
      price: form.price!,
      note: form.note || undefined,
      isUrgent: form.isUrgent,
    });
    message.success("Buyurtma muvaffaqiyatli yaratildi!");
    await ordersStore.fetchOrders();
    router.push({ name: "orders" });
  } catch {
    message.error("Xatolik yuz berdi. Qayta urinib ko'ring.");
  } finally {
    submitting.value = false;
  }
}

// ConfirmRow sub-component
const ConfirmRow = defineComponent({
  props: { label: String },
  setup(p, { slots }) {
    return () =>
      h("div", { class: "flex items-start justify-between gap-3 px-4 py-3.5" }, [
        h("span", { class: "text-sm flex-shrink-0", style: "color:var(--muted)" }, p.label),
        h("div", { class: "text-sm font-medium flex items-center flex-wrap gap-1 text-right", style: "color:var(--text)" },
          slots.default?.()),
      ]);
  },
});
</script>

<style scoped>
.step-enter-active, .step-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.step-enter-from { opacity: 0; transform: translateX(24px); }
.step-leave-to  { opacity: 0; transform: translateX(-24px); }
</style>
