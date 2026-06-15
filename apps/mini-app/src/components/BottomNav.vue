<template>
  <nav class="bottom-nav">
    <div class="flex items-center justify-around px-2 pt-2 pb-2">

      <NavBtn
        v-for="item in navLeft"
        :key="item.name"
        :label="item.label"
        :active="isActive(item.name)"
        @click="go(item.name)"
      >
        <component :is="item.icon" />
      </NavBtn>

      <!-- Center: Asosiy -->
      <button
        class="flex flex-col items-center gap-1 px-3"
        @click="go('home')"
      >
        <span
          class="w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-95"
          :style="isActive('home')
            ? 'background:var(--primary)'
            : 'background:rgba(29,86,195,0.12)'"
        >
          <HomeOutlined
            :style="isActive('home')
              ? 'color:white; font-size:20px'
              : 'color:var(--primary); font-size:20px'"
          />
        </span>
        <span
          class="text-[10px] font-medium"
          :style="isActive('home') ? 'color:var(--primary)' : 'color:var(--muted)'"
        >
          Asosiy
        </span>
      </button>

      <NavBtn
        v-for="item in navRight"
        :key="item.name"
        :label="item.label"
        :active="isActive(item.name)"
        @click="go(item.name)"
      >
        <component :is="item.icon" />
      </NavBtn>

    </div>
  </nav>
</template>

<script setup lang="ts">
import { h, defineComponent } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  HomeOutlined,
  HeartOutlined,
  UserOutlined,
} from "@ant-design/icons-vue";

const route = useRoute();
const router = useRouter();

const isActive = (name: string) => route.name === name;
const go = (name: string) => router.push({ name });

const navLeft = [
  { name: "favorites", label: "Sevimlilar", icon: HeartOutlined },
];
const navRight = [
  { name: "profile", label: "Profil", icon: UserOutlined },
];

const NavBtn = defineComponent({
  props: {
    label:  { type: String },
    active: { type: Boolean, default: false },
  },
  emits: ["click"],
  setup(props, { slots, emit }) {
    return () =>
      h("button", {
        class: "flex flex-col items-center gap-0.5 px-3 py-1 relative",
        onClick: () => emit("click"),
      }, [
        h("span", {
          class: "relative text-xl transition-colors",
          style: `color: ${props.active ? "var(--primary)" : "var(--muted)"}`,
        }, [slots.default?.()]),
        h("span", {
          class: "text-[10px] font-medium transition-colors",
          style: `color: ${props.active ? "var(--primary)" : "var(--muted)"}`,
        }, props.label),
      ]);
  },
});
</script>
