<script setup>
  import { Card, Button } from 'primevue'

  const props = defineProps({
    title: String,
    subtitle: String,
    content: String
  });
</script>

<template>
  <Card style="width: 25rem; overflow: hidden">
    <template #header>
      <img alt="user header" src="https://images.pexels.com/photos/29677343/pexels-photo-29677343/free-photo-of-rural-life-in-hoi-an-s-rice-fields-at-dusk.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" />
    </template>
    <template #title>{{props.title}}</template>
    <template #subtitle>{{props.subtitle}}</template>
    <template #content>
      <p class="m-0">
        {{props.content}}
      </p>
    </template>
    <template #footer>
      <slot name="footer">
        <div class="flex gap-4 mt-1">
          <Button label="Cancel" severity="secondary" outlined class="w-full" />
          <Button label="Save" class="w-full" />
        </div>
      </slot>
    </template>
  </Card>
</template>

<style scoped>

</style>
