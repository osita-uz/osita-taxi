<template>
  <!--
    isolation:isolate creates a stacking context so z-index:-1 works correctly:
    center fill (z-index:-1) → below scroll items → below fades overlay (z-index:1)
  -->
  <div
    class="relative overflow-hidden select-none"
    style="isolation: isolate"
    :style="{ height: `${VISIBLE * ITEM_H}px` }"
  >
    <!-- Center highlight: solid fill, z-index:-1 so it sits behind item text -->
    <div
      class="absolute inset-x-0 pointer-events-none rounded-xl"
      style="z-index: -1; background: var(--border)"
      :style="{
        top: `${Math.floor(VISIBLE / 2) * ITEM_H}px`,
        height: `${ITEM_H}px`,
      }"
    />

    <!-- Scroll list (normal flow → above z-index:-1 fill) -->
    <div
      ref="scrollEl"
      class="h-full overflow-y-scroll no-scrollbar"
      :style="{
        scrollSnapType: 'y mandatory',
        paddingTop: `${Math.floor(VISIBLE / 2) * ITEM_H}px`,
        paddingBottom: `${Math.floor(VISIBLE / 2) * ITEM_H}px`,
      }"
      @scroll.passive="onScroll"
    >
      <div
        v-for="(item, i) in items"
        :key="i"
        class="flex items-center justify-center cursor-pointer"
        :style="{
          height: `${ITEM_H}px`,
          scrollSnapAlign: 'center',
          fontSize: '16px',
          fontWeight: currentIdx === i ? '600' : '400',
          color: currentIdx === i ? 'var(--primary)' : 'var(--text)',
          opacity: currentIdx === i ? 1 : 0.55,
          transition: 'color 0.1s, opacity 0.1s, font-weight 0.1s',
        }"
        @click="selectByIndex(i)"
      >
        {{ item.label }}
      </div>
    </div>

    <!-- Fades overlay: z-index:1 — above scroll items -->
    <div class="absolute inset-0 pointer-events-none" style="z-index: 1">
      <div
        class="absolute inset-x-0 top-0"
        :style="{
          height: `${Math.floor(VISIBLE / 2) * ITEM_H}px`,
          background: 'linear-gradient(to bottom, var(--surface) 30%, transparent)',
        }"
      />
      <div
        class="absolute inset-x-0 bottom-0"
        :style="{
          height: `${Math.floor(VISIBLE / 2) * ITEM_H}px`,
          background: 'linear-gradient(to top, var(--surface) 30%, transparent)',
        }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";

const ITEM_H = 44;
const VISIBLE = 5;

const props = defineProps<{
  items: { label: string; value: any }[];
  modelValue: any;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", v: any): void;
}>();

const scrollEl = ref<HTMLElement | null>(null);
let scrollTimer = 0;

const selectedIdx = computed(() =>
  props.items.findIndex((item) => item.value === props.modelValue)
);

const currentIdx = ref(0);

function scrollToIndex(idx: number, smooth = false) {
  if (!scrollEl.value || idx < 0) return;
  scrollEl.value.scrollTo({
    top: idx * ITEM_H,
    behavior: smooth ? "smooth" : "instant",
  });
}

function selectByIndex(i: number) {
  currentIdx.value = i;
  emit("update:modelValue", props.items[i].value);
  scrollToIndex(i, true);
}

function onScroll() {
  if (!scrollEl.value) return;
  const idx = Math.round(scrollEl.value.scrollTop / ITEM_H);
  const clamped = Math.max(0, Math.min(props.items.length - 1, idx));
  currentIdx.value = clamped;

  clearTimeout(scrollTimer);
  scrollTimer = window.setTimeout(() => {
    const newVal = props.items[clamped]?.value;
    if (newVal !== undefined && newVal !== props.modelValue) {
      emit("update:modelValue", newVal);
    }
  }, 80);
}

onMounted(() => {
  const initIdx = Math.max(0, selectedIdx.value);
  currentIdx.value = initIdx;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (scrollEl.value) {
        scrollEl.value.scrollTop = initIdx * ITEM_H;
      }
    });
  });
});

watch(
  () => props.modelValue,
  () => {
    const idx = selectedIdx.value;
    if (idx >= 0) {
      currentIdx.value = idx;
      scrollToIndex(idx, true);
    }
  }
);
</script>
