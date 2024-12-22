<template>
    <div class="mb-6">
      <LineChart :chart-data="chartData" :chart-options="chartOptions" />
    </div>
</template>
  
  <script>
  import { ref, onMounted } from "vue";
  import { LineChart } from "vue-chart-3";
  import { Chart, registerables } from "chart.js";
  import * as tf from "@tensorflow/tfjs";
  
  Chart.register(...registerables);
  
  // Define the CSV file path
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
    // Convert dates to numeric values and normalize them
  const dateToNumber = (date) => new Date(date).getTime();
  const inputs = data.map((d) => dateToNumber(d.date) / 1e12); // Normalize dates
  const labels = data.map((d) => d.minTemp); // Minimum temperatures as labels

  // Convert inputs and labels to tensors
  const inputTensor = tf.tensor2d(inputs, [inputs.length, 1]);
  const labelTensor = tf.tensor2d(labels, [labels.length, 1]); // Use tensor2d for continuous outputs

  // Define the model
  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [1], units: 64, activation: "relu" }));
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
  
  async function predictTemperatures(model, nextYearDates) {
    const dateToNumber = (date) => new Date(date).getTime();    
    const normalizedDates = nextYearDates.map((date) => dateToNumber(date) / 1e12);
    const inputTensor = tf.tensor2d(normalizedDates, [nextYearDates.length, 1]);
  
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
    },
    setup() {
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
            type: "time",
            time: {
              unit: "day",
            },
          },
          y: {
            min: 15,
            max: 50,
            // ticks: 5,
          },
        },
      });
      
      onMounted(async () => {
        const rawDataset = tf.data.csv(csvUrl);
        
        const processedDataset = await processDataset(rawDataset);
        
        const model = await trainTemperatureModel(processedDataset);
        
        const nextYearDates = [
          "2025-01-01",
          "2025-12-01",
        ];
  
        const predictions = await predictTemperatures(model, nextYearDates);
        
        // Update chart data
        chartData.value.labels = predictions.map((p) => p.date);
        chartData.value.datasets[0].data = predictions.map((p) => p.prediction);
      });
  
      return {
        chartData,
        chartOptions,
      };
    },
  };
  </script>