<template>
    <div class="mb-6 h-screen mt-10">
      <Loader :is-loading="isLoading" />
      <LineChart :chart-data="chartData" :chart-options="chartOptions" />
    </div>
</template>
  
  <script>
  import { ref, onMounted } from "vue";
  import { LineChart } from "vue-chart-3";
  import { Chart, registerables } from "chart.js";
  import * as tf from "@tensorflow/tfjs";
  import Loader from '@/components/atoms/Loader.vue'
  
  Chart.register(...registerables);
  
  const csvUrl = `/LowestTemperatures.csv`;
  
  async function processDataset(dataset) {
    const data = [];
    await dataset.forEachAsync((row) => {        
        const date = row.date; 
        const minTemp = parseFloat(row.minTemp); 

        data.push({ date, minTemp });
    });    
    
    return data;
  }
  
async function trainTemperatureModel(data) {
    const dateToFeatures = (date) => {
    const d = new Date(date);
    const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000); // Day of the year
    const normalizedDay = dayOfYear / 365; // Normalize between 0 and 1
    return [
      Math.sin(2 * Math.PI * normalizedDay), // Sine for seasonality
      Math.cos(2 * Math.PI * normalizedDay), // Cosine for seasonality
    ];
  };

  const inputs = data.map((d) => dateToFeatures(d.date)); // Generate features for all inputs
  const labels = data.map((d) => d.minTemp); // Minimum temperatures as labels

  // Convert inputs and labels to tensors
  const inputTensor = tf.tensor2d(inputs, [inputs.length, 2]); // Two features per input
  const labelTensor = tf.tensor2d(labels, [labels.length, 1]); // Single output label per input

  // Define the model
  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [2], units: 64, activation: "relu" })); // Adjust inputShape to [2]
  model.add(tf.layers.dense({ units: 32, activation: "relu" }));
  model.add(tf.layers.dense({ units: 1 })); // Output a single float value

  // Compile the model
  model.compile({
    optimizer: tf.train.adam(),
    loss: "meanSquaredError", // Use MSE for regression
    metrics: ["mae"], // Mean Absolute Error for evaluation
  });

  // Train the model
  await model.fit(inputTensor, labelTensor, {
    epochs: 100,
    batchSize: 32,
    shuffle: true,
  });

  return model;
}

function generateNextYearDates() {
  const nextYear = new Date().getFullYear() + 1;
  const dates = [];
  for (let month = 0; month < 12; month++) {
    for (let day = 1; day <= new Date(nextYear, month + 1, 0).getDate(); day++) {
      dates.push(`${nextYear}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    }
  }
  return dates;
}
  
async function predictTemperatures(model, nextYearDates) {
  const dateToFeatures = (date) => {
    const d = new Date(date);
    const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000); // Day of the year
    const normalizedDay = dayOfYear / 365; // Normalize between 0 and 1
    return [
      Math.sin(2 * Math.PI * normalizedDay), // Sine for seasonality
      Math.cos(2 * Math.PI * normalizedDay), // Cosine for seasonality
    ];
  };

  const features = nextYearDates.map((date) => dateToFeatures(date)); // Generate features
  const inputTensor = tf.tensor2d(features, [nextYearDates.length, 2]); // Match input shape

  const predictions = model.predict(inputTensor);

  return predictions.array().then((predictedLabels) =>
    nextYearDates.map((date, index) => ({
      date,
      prediction: predictedLabels[index],
    }))
  );
}
  
export default {
    components: {
      LineChart,
      Loader
    },
    setup() {      
      const isLoading = ref(true)
      const chartData = ref({
        labels: [],
        datasets: [
          {
            label: "Temperature Predictions",
            backgroundColor: "#42A5F5",
            borderColor: "#1E88E5",
            data: [],
          },
        ],
      });
  
      const chartOptions = ref({
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
            callback: (value, index, ticks) => {
              const date = ticks[index].value;
              const [year, month, day] = date.split("-");
              return `${day}.${month}`;
            },
            },
          },
          y: {
            min: 15,
            max: 30,
            ticks: {
                stepSize: 5,
            },
            },
        },
      });

    async function fetchData() {
      const rawDataset = tf.data.csv(csvUrl);

      const processedDataset = await processDataset(rawDataset);
      localStorage.setItem('temperatureData', JSON.stringify(processedDataset));

      return processedDataset;
    }

    async function loadFromLocalStorage() {
      const storedData = localStorage.getItem('temperatureData');
      if (storedData) {
        return JSON.parse(storedData);
      }
      return null;
    }
      
    onMounted(async () => {
        const storedDataset = await loadFromLocalStorage();

        let processedDataset;

        if (storedDataset) {
            console.log("usao");
            
            processedDataset = storedDataset;
        } else {
            processedDataset = await fetchData();
        }
  
        const model = await trainTemperatureModel(processedDataset);
        
        const nextYearDates = generateNextYearDates();        
  
        const predictions = await predictTemperatures(model, nextYearDates);
        
        isLoading.value = false;
        
        chartData.value.labels = predictions.map((p) => p.date);
        chartData.value.datasets[0].data = predictions.map((p) => {            
            const prediction = Array.isArray(p.prediction) ? p.prediction[0] : p.prediction;
            return parseFloat(prediction).toFixed(5);
        });

    });
  

      return {
        chartData,
        chartOptions,
        isLoading
      };
    },
};
</script>