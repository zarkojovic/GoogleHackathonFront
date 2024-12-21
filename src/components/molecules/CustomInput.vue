<script setup>

import { FloatLabel, InputText } from 'primevue'

const props = defineProps({
  label: String,
  modelValue: String,
});

const emit = defineEmits(['update:modelValue'])

</script>

<template>

  <FloatLabel variant="on">
    <InputText id="on_label" :value="props.modelValue" autocomplete="off"
               @input="emit('update:modelValue', $event.target.value)" />
    <label for="on_label">On Label</label>
  </FloatLabel>
</template>

<style scoped>

</style>
