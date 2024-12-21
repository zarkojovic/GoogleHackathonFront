<script setup>

import { defineProps } from 'vue';

const props = defineProps({
  type: {
    type: String,
    default: 'button',
  },
  text:{
    type: String,
    default: 'Button',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  onClick: {
    type: Function,
    default: () => {},
  },

});
</script>

<template>
  <button>
    {{props.text}}
  </button>
</template>

<style scoped>

</style>
