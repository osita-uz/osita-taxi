<template>
  <div class="flex flex-col h-full">

    <header class="app-header">
      <div class="flex items-center gap-4">
        <div
          class="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 text-2xl font-bold text-white"
          style="background:rgba(255,255,255,0.15)"
        >
          {{ initials }}
        </div>
        <div>
          <h1 class="text-white font-bold text-lg leading-tight">{{ user?.name }}</h1>
          <p class="text-xs mt-0.5" style="color:rgba(255,255,255,0.55)">
            {{ user?.phone ?? "Telefon raqam yo'q" }}
          </p>
          <span
            class="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full mt-1.5"
            style="background:rgba(245,158,11,0.2); color:#F59E0B"
          >
            {{ roleLabel }}
          </span>
        </div>
      </div>
    </header>

    <div class="page-content px-4 py-4 space-y-4 slide-up">

      <!-- Menu -->
      <div class="card overflow-hidden">
        <button
          class="flex items-center justify-between w-full px-4 py-3.5 active:bg-gray-50"
          @click="router.push({ name: 'orders' })"
        >
          <div class="flex items-center gap-3">
            <span class="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style="background:#EEF3FF">
              <UnorderedListOutlined style="color:var(--primary); font-size:14px" />
            </span>
            <span class="text-sm font-medium" style="color:var(--text)">Buyurtmalar tarixi</span>
          </div>
          <RightOutlined style="color:var(--muted); font-size:12px" />
        </button>
      </div>

      <!-- Info -->
      <div class="card overflow-hidden">
        <div class="px-4 py-3.5">
          <p class="text-xs mb-0.5" style="color:var(--muted)">To'liq ism</p>
          <p class="text-sm font-medium" style="color:var(--text)">{{ user?.name }}</p>
        </div>
        <div class="divider mx-4" />
        <div class="px-4 py-3.5">
          <p class="text-xs mb-0.5" style="color:var(--muted)">Telegram ID</p>
          <p class="text-sm font-mono font-medium" style="color:var(--text)">{{ user?.telegramId }}</p>
        </div>
        <div class="divider mx-4" />
        <div class="flex items-center justify-between px-4 py-3.5">
          <div>
            <p class="text-xs mb-0.5" style="color:var(--muted)">Telefon raqam</p>
            <p class="text-sm font-medium" style="color:var(--text)">{{ user?.phone ?? "—" }}</p>
          </div>
          <span
            v-if="!user?.phone"
            class="text-xs font-medium px-2.5 py-1 rounded-full"
            style="background:#FEF3C7; color:#B45309"
          >Kiritilmagan</span>
        </div>
      </div>

      <!-- App info -->
      <div class="flex items-center justify-between px-1 pb-2">
        <span class="text-xs" style="color:var(--muted)">TaxiUZ Mini App</span>
        <span class="text-xs" style="color:var(--muted)">v0.1.0</span>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { UnorderedListOutlined, RightOutlined } from "@ant-design/icons-vue";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const authStore = useAuthStore();
const user = computed(() => authStore.user);

const initials = computed(() => {
  const name = user.value?.name ?? "";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
});

const roleLabel = computed(() => {
  const map: Record<string, string> = { PASSENGER: "Yo'lovchi", DRIVER: "Haydovchi", ADMIN: "Admin" };
  return map[user.value?.role ?? ""] ?? "Foydalanuvchi";
});
</script>
