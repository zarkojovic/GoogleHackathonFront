<template>
  <main class="p-5">
    <h1 class="font-bold mb-3 text-2xl">
      Minimalna temperatura za sledeću godine 📅
    </h1>
    <PredictionChart />
  </main>
</template>

<script>
import PredictionChart from '@/components/molecules/PredictionChart.vue'

export default {
  components: {
    PredictionChart
  }
}
</script>
