import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { api } from "@/services/api";
import type { User } from "@/types";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem("token"));
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!token.value && !!user.value);

  if (token.value) api.setToken(token.value);

  async function init() {
    loading.value = true;
    error.value = null;

    try {
      const tg = window.Telegram?.WebApp;
      let initData = tg?.initData || import.meta.env.VITE_DEV_INIT_DATA || "";

      if (!initData) {
        // Dev mode: BOT_TOKEN yo'q bo'lsa backend HMAC tekshirmaydi,
        // shuning uchun parseable fake initData bilan real JWT olishga urinamiz
        const fakeUser = JSON.stringify({ id: 100001, first_name: "Dev", last_name: "User" });
        initData = `user=${encodeURIComponent(fakeUser)}&auth_date=9999999999&hash=dev`;
      }

      const res = await api.init(initData);
      token.value = res.token;
      user.value = res.user;
      localStorage.setItem("token", res.token);
      api.setToken(res.token);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Xatolik yuz berdi";
    } finally {
      loading.value = false;
    }
  }

  function logout() {
    user.value = null;
    token.value = null;
    localStorage.removeItem("token");
  }

  return { user, token, loading, error, isAuthenticated, init, logout };
});
