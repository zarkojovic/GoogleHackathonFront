<script setup>
import { useCounterStore } from '../store/store.js'
import { useFetch } from '@/http/useFetch.js'
import Card from '@/components/molecules/Card.vue'
import { ref } from 'vue'
import CustomInput from '@/components/molecules/CustomInput.vue'
// access the `store` variable anywhere in the component ✨
const store = useCounterStore()

// increment the count value
const increment = () => {
  store.increment()
}

const formTest = ref({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const cardArray = ref([
  {
    title: 'Card 1',
    subtitle: 'Subtitle 1',
    content: 'Content 1',
  },
  {
    title: 'Card 2',
    subtitle: 'Subtitle 2',
    content: 'Content 2',
  },
  {
    title: 'Card 3',
    subtitle: 'Subtitle 3',
    content: 'Content 3',
  },
  {
    title: 'Card 4',
    subtitle: 'Subtitle 4',
    content: 'Content 4',
  },
])

const { data: todos, loading, error } = useFetch('https://jsonplaceholder.typicode.com/todos')
</script>

<template>
  <main>
    <Button @click="increment">Pozz</Button>
    <h1>Home</h1>

    <p>Counter: {{ store.count }}</p>

    <p v-if="loading">Loading...</p>
    <p v-if="error">{{ error }}</p>
    <CustomInput v-model="formTest.name" label="Name" />

    <div class="grid grid-cols-4 gap-4 mt-4">
      <Card
        v-for="card in cardArray"
        :title="card.title"
        :subtitle="card.subtitle"
        :content="card.content"
        v-bind:key="card.title"
      >
      </Card>
    </div>
  </main>
</template>

<style>
@media (min-width: 1024px) {
  main {
    min-height: 100vh;
  }
}
</style>
