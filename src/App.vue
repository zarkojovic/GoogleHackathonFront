<script setup>
import { RouterLink, RouterView } from 'vue-router'
import Navbar from '@/components/shared/Navbar.vue'
import Footer from '@/components/shared/Footer.vue'
</script>

<template>
  <Navbar/>
  <RouterView />
  <Footer/>
</template>

<style scoped>
</style>
