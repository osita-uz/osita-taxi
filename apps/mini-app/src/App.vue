<template>
  <a-config-provider :theme="antTheme">
    <div class="app-shell">

      <template v-if="authStore.loading">
        <div class="flex-1 flex items-center justify-center">
          <div class="text-center">
            <a-spin size="large" />
            <p class="mt-3 text-sm" style="color: var(--muted)">Yuklanmoqda…</p>
          </div>
        </div>
      </template>

      <template v-else-if="authStore.error">
        <div class="flex-1 flex items-center justify-center p-6">
          <div class="text-center">
            <div class="text-4xl mb-3">⚠️</div>
            <p class="text-sm mb-4" style="color: var(--danger)">{{ authStore.error }}</p>
            <a-button @click="authStore.init()">Qayta urinish</a-button>
          </div>
        </div>
      </template>

      <template v-else>
        <!-- Router view wrapper: takes remaining height, views scroll inside -->
        <div class="flex-1 min-h-0 flex flex-col overflow-hidden">
          <router-view v-slot="{ Component }">
            <transition name="page" mode="out-in">
              <component :is="Component" class="flex-1 flex flex-col min-h-0" />
            </transition>
          </router-view>
        </div>
        <BottomNav v-if="showNav" />
      </template>

    </div>
  </a-config-provider>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import BottomNav from "@/components/BottomNav.vue";

const authStore = useAuthStore();
const route = useRoute();

const showNav = computed(() => route.name !== "create-order");

const antTheme = {
  token: {
    colorPrimary: "#1D56C3",
    colorSuccess: "#16a34a",
    colorWarning: "#f59e0b",
    colorError: "#dc2626",
    colorInfo: "#1D56C3",
    colorLink: "#1D56C3",
    borderRadius: 10,
    borderRadiusLG: 12,
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 14,
    colorBgContainer: "#ffffff",
    colorBgLayout: "#F2F5FB",
    colorBorder: "#E4EAF4",
    controlHeight: 42,
  },
  components: {
    Button: { primaryColor: "#ffffff", controlHeight: 46, fontWeight: 600, borderRadius: 12 },
    Input: { borderRadius: 10 },
    Select: { borderRadius: 10 },
    Card: { borderRadius: 14 },
    Tag: { borderRadius: 6 },
  },
};

onMounted(async () => {
  const tg = window.Telegram?.WebApp;
  if (tg) { tg.ready(); tg.expand(); }
  await authStore.init();
});
</script>
