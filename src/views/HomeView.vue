<script setup>
import { useCounterStore } from '../store/store.js'
import Map from '../components/molecules/Map.vue'

// access the `store` variable anywhere in the component ✨
const store = useCounterStore()

// increment the count value
const increment = () => {
  store.increment()
}
</script>

<template>
  <main class="p-5">
    <h1 class="font-bold mb-3 text-2xl">
      Zdravo, Žarko! 🌍
    </h1>
    <Map/>
  </main>
</template>

<style>
@media (min-width: 1024px) {
  main {
    min-height: 100vh;
  }
}
</style>
