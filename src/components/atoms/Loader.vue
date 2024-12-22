<template>
  <div class="vl-parent">
    <loading :active="isLoading"
             :can-cancel="true"

             @update:active="updateIsLoading"
             :is-full-page="fullPage">
      <img src="/icon.png" alt="icon" class="w-16 animate-spin">
    </loading>
  </div>
</template>

<script setup>
import { ref, watch, defineEmits } from 'vue'
import Loading from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/css/index.css'

const props = defineProps({
  isLoading: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:isLoading'])

const fullPage = ref(true)

const onCancel = () => {
  console.log('User cancelled the loader.')
}

const updateIsLoading = (value) => {
  emit('update:isLoading', value)
}

watch(() => props.isLoading, (newVal) => {
  if (!newVal) {
    console.log('Loading finished.')
  }
})
</script>
