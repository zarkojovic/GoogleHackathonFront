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
  <main>
    <Button @click="increment">Pozz</Button>
    <h1>Home</h1>

    <p>Counter: {{ store.count }}</p>
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
