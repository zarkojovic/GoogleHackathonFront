<template>
  <div class="card">
    <Menubar :model="items" >
      <template #start>
        <img src="/icon.png" alt="logo" class="w-8 h-8" />
      </template>
      <template #item="{ item, props, hasSubmenu, root }">
        <RouterLink class="flex items-center" v-bind="props.action" :to="item.to">
          <span class="fw-bold">{{ item.label }}</span>
          <Badge v-if="item.badge" :class="{ 'ml-auto': !root, 'ml-2': root }" :value="item.badge" />
          <span v-if="item.shortcut" class="ml-auto border border-surface rounded bg-emphasis text-muted-color text-xs p-1">{{ item.shortcut }}</span>
          <i v-if="hasSubmenu" :class="['pi pi-angle-down ml-auto', { 'pi-angle-down': root, 'pi-angle-right': !root }]"></i>
        </RouterLink>
      </template>
      <template #end>
        <div class="flex items-center gap-2">
          <InputText placeholder="Pretraži" type="text" class="w-32 rounded-3xl  sm:w-auto" rounded-full />
          <Avatar image="https://primefaces.org/cdn/primevue/images/avatar/amyelsner.png" shape="circle" />
        </div>
      </template>
    </Menubar>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { RouterLink } from 'vue-router'
import { Menubar, Badge, InputText, Avatar } from 'primevue'

const items = ref([
  {
    label: 'Početna',
    icon: 'pi pi-home',
    to: '/'
  },
  {
    label: 'O nama',
    icon: 'pi pi-info-circle',
    to: '/about'
  },
  {
    label: 'Projekti',
    icon: 'pi pi-search',
    badge: 3,
    to: '/projects',
  },
  {
    label: 'Predictions',
    to: '/predictions',
  }
]);
</script>
