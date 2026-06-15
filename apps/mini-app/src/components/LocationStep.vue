<template>
  <div class="p-4 slide-up">
    <p class="font-semibold mb-0.5" style="color:var(--text)">{{ title }}</p>
    <p class="text-sm mb-4" style="color:var(--muted)">Viloyat yoki tuman nomini yozing</p>

    <div class="space-y-3">
      <!-- Search card -->
      <div class="card p-4">
        <div class="relative">
          <input
            ref="inputRef"
            :value="query"
            placeholder="Qidirish… (masalan: Samarqand)"
            class="w-full pl-4 pr-10 py-3 rounded-xl text-sm outline-none transition-all"
            style="border: 1.5px solid var(--border); background: var(--bg); color: var(--text)"
            :style="focused ? 'border-color:var(--primary)' : ''"
            @input="onQueryInput"
            @compositionend="onQueryInput"
            @focus="focused = true"
            @blur="focused = false"
          />
          <button
            v-if="query"
            class="absolute right-3 inset-y-0 my-auto w-6 h-6 flex items-center justify-center rounded-full"
            style="color:var(--muted)"
            @click="query = ''; inputRef?.focus()"
          >
            ✕
          </button>
        </div>

        <!-- Loading skeleton -->
        <div v-if="loading" class="mt-3 space-y-2">
          <div v-for="i in 3" :key="i" class="skeleton h-12 rounded-xl" />
        </div>

        <!-- Search results -->
        <template v-else-if="query.trim()">
          <div v-if="searchResults.length" class="mt-3 space-y-1.5">
            <button
              v-for="result in searchResults"
              :key="result.id"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all border-2"
              :style="selectedLocationId === result.id
                ? 'border-color:var(--primary); background:#EEF3FF'
                : 'border-color:var(--border); background:var(--bg)'"
              @click="selectLocation(result)"
            >
              <span class="text-lg leading-none">{{ result.parentName ? '📍' : '🗺️' }}</span>
              <div class="min-w-0">
                <p
                  class="text-sm font-semibold truncate"
                  :style="selectedLocationId === result.id ? 'color:var(--primary)' : 'color:var(--text)'"
                >
                  {{ result.name }}
                </p>
                <p v-if="result.parentName" class="text-xs truncate" style="color:var(--muted)">
                  {{ result.parentName }}
                </p>
              </div>
            </button>
          </div>
          <div v-else class="mt-3 py-6 text-center">
            <p class="text-3xl mb-2">🔍</p>
            <p class="text-sm" style="color:var(--muted)">Natija topilmadi</p>
          </div>
        </template>

        <!-- Empty state / validation -->
        <div v-else-if="!selectedLocationId" class="mt-3 py-4 text-center">
          <p class="text-sm" style="color:var(--muted)">Shahar yoki tuman nomini kiriting</p>
        </div>

        <!-- Validation error -->
        <p v-if="showError && !selectedLocationId" class="mt-2 text-xs font-medium" style="color:#DC2626">
          Davom etish uchun joylashuvni tanlang
        </p>
      </div>

      <!-- Selected location badge -->
      <div
        v-if="selectedLocationId > 0"
        class="card p-4 flex items-center justify-between gap-3"
        style="border: 1.5px solid var(--primary)"
      >
        <div class="flex items-center gap-3 min-w-0">
          <span class="text-xl leading-none flex-shrink-0">{{ selectedParentName ? '📍' : '🗺️' }}</span>
          <div class="min-w-0">
            <p class="text-sm font-semibold truncate" style="color:var(--primary)">
              {{ selectedName }}
            </p>
            <p v-if="selectedParentName" class="text-xs truncate" style="color:var(--muted)">
              {{ selectedParentName }}
            </p>
          </div>
        </div>
        <button
          class="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium"
          style="background:var(--border); color:var(--muted)"
          @click="clearSelection"
        >
          O'zgartirish
        </button>
      </div>

      <!-- Place input -->
      <div v-if="selectedLocationId > 0" class="card p-4">
        <p class="section-title mb-2">Aniq joy <span style="color:var(--muted); font-weight:400">(ixtiyoriy)</span></p>
        <input
          :value="localPlace"
          placeholder="masalan: Markaziy bozor yaqini"
          class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
          style="border: 1.5px solid var(--border); background: var(--bg); color: var(--text)"
          @focus="($event.target as HTMLInputElement).style.borderColor = 'var(--primary)'"
          @blur="($event.target as HTMLInputElement).style.borderColor = 'var(--border)'"
          @input="onPlaceInput"
        />
      </div>
    </div>

    <div class="mt-4">
      <button class="btn-primary" @click="handleNext">
        Davom etish
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { Location } from "@/types";

interface SearchResult {
  id: number;
  name: string;
  parentName: string | null;
}

const props = defineProps<{
  title?: string;
  locations: Location[];
  loading?: boolean;
  locationId?: number;
  locationName?: string;
  place?: string;
  excludeLocationId?: number;
}>();

const emit = defineEmits<{
  (e: "update:locationId", v: number): void;
  (e: "update:locationName", v: string): void;
  (e: "update:place", v: string): void;
  (e: "next"): void;
}>();

const query = ref("");
const focused = ref(false);
const showError = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);

const selectedLocationId = ref(props.locationId ?? 0);
const selectedName = ref(props.locationName ?? "");
const selectedParentName = ref<string | null>(null);
const localPlace = ref(props.place ?? "");


const flatLocations = computed<SearchResult[]>(() => {
  const results: SearchResult[] = [];
  for (const parent of props.locations) {
    results.push({ id: parent.id, name: parent.name, parentName: null });
    for (const child of parent.children ?? []) {
      results.push({ id: child.id, name: child.name, parentName: parent.name });
    }
  }
  return results;
});

const searchResults = computed<SearchResult[]>(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return [];
  return flatLocations.value
    .filter(
      (loc) =>
        loc.id !== props.excludeLocationId &&
        loc.name.toLowerCase().includes(q)
    )
    .slice(0, 5);
});

function onQueryInput(e: Event) {
  query.value = (e.target as HTMLInputElement).value;
}

function selectLocation(result: SearchResult) {
  selectedLocationId.value = result.id;
  selectedName.value = result.name;
  selectedParentName.value = result.parentName;
  showError.value = false;
  query.value = "";
  emit("update:locationId", result.id);
  emit("update:locationName", result.name);
}

function clearSelection() {
  selectedLocationId.value = 0;
  selectedName.value = "";
  selectedParentName.value = null;
  localPlace.value = "";
  emit("update:locationId", 0);
  emit("update:locationName", "");
  emit("update:place", "");
  setTimeout(() => inputRef.value?.focus(), 50);
}

function onPlaceInput(e: Event) {
  localPlace.value = (e.target as HTMLInputElement).value;
  emit("update:place", localPlace.value);
}

function handleNext() {
  if (!selectedLocationId.value) {
    showError.value = true;
    inputRef.value?.focus();
    return;
  }
  emit("next");
}
</script>
