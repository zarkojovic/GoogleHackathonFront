<script setup>
import L from 'leaflet'
import { computed, onMounted, ref, watch, watchEffect } from 'vue'
import * as tf from '@tensorflow/tfjs'
import { marked } from 'marked'
import { Dialog } from 'primevue'
import Loader from '@/components/atoms/Loader.vue'

const map = ref(null)
const text = ref('')
const mapImage = ref(null)
const markerLoader = ref(false)
const isLoading = ref(true)
const showDialog = ref(false)
const headerTitle = ref('Header')
const areMarkersLoaded = ref(false)

const formattedText = computed(() => {
  return marked(text.value)
})

watch(markerLoader, (newValue) => {
  if (newValue) {
    isLoading.value = false
  } else {
    isLoading.value = true
  }
})
watch(text, (newValue) => {
  if (newValue) {
    isLoading.value = false
  } else {
    isLoading.value = true
  }
})


const latMin = 44.6,
  latMax = 45.0
const lonMin = 20.3,
  lonMax = 20.6


// Normalize function
function normalizeCoordinates(lat, lon) {
  return [
    (lat - latMin) / (latMax - latMin),
    (lon - lonMin) / (lonMax - lonMin)
  ]
}

// Denormalize function
function denormalizeCoordinates(normalizedLat, normalizedLon) {
  return [
    normalizedLat * (latMax - latMin) + latMin,
    normalizedLon * (lonMax - lonMin) + lonMin
  ]
}

const csvUrl = `/HeatmapData.csv`
const dataset = tf.data.csv(csvUrl)

async function formatJsonString(inputString) {
  const formattedString = inputString.replace(/""/g, '"')
  return JSON.parse(formattedString)
}

async function trainModel(data) {
  // Prepare tensors
  const inputs = data.map((d) => tf.tensor(d.ys)) // Input: ys values
  const labels = data.map((d) => {
    const [normalizedLat, normalizedLon] = normalizeCoordinates(
      d.xs[0],
      d.xs[1]
    )
    return tf.tensor([normalizedLat, normalizedLon])
  }) // Normalize coordinates for labels

  // Normalize data
  const inputTensor = tf.stack(inputs).div(255) // Normalize ys
  const labelTensor = tf.stack(labels)

  // Define the model
  const model = tf.sequential()
  model.add(
    tf.layers.dense({ inputShape: [3], units: 64, activation: 'relu' })
  ) // Increased complexity
  model.add(tf.layers.dense({ units: 32, activation: 'relu' }))
  model.add(tf.layers.dense({ units: 2 })) // Output: 2 normalized coordinates

  model.compile({
    optimizer: tf.train.adam(),
    loss: 'meanSquaredError',
    metrics: ['mse']
  })

  // Train the model
  await model.fit(inputTensor, labelTensor, {
    epochs: 200, // Increased epochs
    batchSize: 32,
    shuffle: true // Shuffle data for better training
  })

  return model
}

async function predictHeatIslands(model, newBandValues) {
  const input = tf.tensor([newBandValues]).div(255) // Normalize input
  const prediction = model.predict(input)
  const [normalizedLat, normalizedLon] = prediction.arraySync()[0]
  return denormalizeCoordinates(normalizedLat, normalizedLon) // Denormalize prediction
}

// Send the request

var mapboxImageUrl
const azureOpenAiUrl =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyDyC6R9_D_HCskAJ06IRUXCPU2gRPI3_iE'

async function sendRequestToAzure(payload) {
  const response = await fetch(azureOpenAiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  const responseData = await response.json()
  console.log('Azure OpenAI Response: ', responseData)
}

async function fetchImageAsBase64(url) {
  const response = await fetch(url)
  const blob = await response.blob()

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result.split(',')[1]) // Remove metadata prefix
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

const sendRequestToGemini = async (base64Image, apiKey, prompt) => {
  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: base64Image
            }
          }
        ]
      }
    ]
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  )

  return response.json()
}

async function fetchAddressFromCoordinates(lng, lat) {
  const mapboxGeocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=pk.eyJ1IjoibGlubmlrYWdlbmN5IiwiYSI6ImNtMzRtZWlnYzAxNmUyanF4ZmxxZnJnc24ifQ.PyWdx3E09PfzIcF_SQyvWA`

  const response = await fetch(mapboxGeocodingUrl)
  const data = await response.json()

  // Return the address or a fallback
  return data.features?.[0]?.place_name || 'Address not found'
}


onMounted(async () => {
  // Initialize the map
  const mapInstance = L.map('map').setView([44.81, 20.45], 14)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(mapInstance)

  const processedDataset = []
  const predictions = JSON.parse(localStorage.getItem('predictionsCoordinates')) || []

  if (!predictions.length) {
    await dataset.forEachAsync(async (row) => {
      const geo = await formatJsonString(row['.geo'])
      processedDataset.push({
        xs: [geo.coordinates[1], geo.coordinates[0]],
        ys: [row.b1, row.b2, row.b3]
      })
    })

    processedDataset.reverse()

    const model = await trainModel(processedDataset)

    const inputsForPrediction = [
      [243, 142, 43],
      [225, 216, 30],
      [225, 212, 51],
      [255, 100, 50],
      [244, 168, 40]
    ]


    for (const bandValues of inputsForPrediction) {
      const predictedCoordinate = await predictHeatIslands(
        model,
        bandValues
      )
      predictions.push(predictedCoordinate)
    }
  }else{
    areMarkersLoaded.value = true
  }

  predictions.forEach((coordinate, index) => {
    const marker = L.marker(coordinate)
      .addTo(mapInstance)
      // make it red
      .setIcon(
        new L.Icon({
          iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        })
      )
      .openPopup()

    marker.on('click', async function() {
      const { lat, lng } = marker.getLatLng()

      const storedCoordinates = JSON.parse(localStorage.getItem('predictionsCoordinates')) || []
      console.log(storedCoordinates)
      if (storedCoordinates.length < 5) {
        storedCoordinates.push({ lat, lng })
        localStorage.setItem('predictionsCoordinates', JSON.stringify(storedCoordinates))
      }

      const mapboxImageUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lng},${lat},15/640x640?access_token=pk.eyJ1IjoibGlubmlrYWdlbmN5IiwiYSI6ImNtMzRtZWlnYzAxNmUyanF4ZmxxZnJnc24ifQ.PyWdx3E09PfzIcF_SQyvWA`
      mapImage.value = mapboxImageUrl
      const googleApiKey = 'AIzaSyDyC6R9_D_HCskAJ06IRUXCPU2gRPI3_iE'

      const address = await fetchAddressFromCoordinates(lng, lat)
      headerTitle.value = `Analiza lokacije: ${address}`

      const prompt = `Molim te da analiziraš sledeću lokaciju u Beogradu i predložiš konkretna poboljšanja za održivi razvoj. Fokusiraj se na aspekte kao što su zelene površine, energetska efikasnost, saobraćajna infrastruktura, otpad, kvalitet vazduha i drugi relevantni faktori za poboljšanje održivosti. Navedi konkretne korake koji se mogu preduzeti, kao i potencijalne koristi od tih promena.

                      Naziv adrese: ${address}.

                      Odgovor treba da bude u sledećem standardizovanom formatu:
                      1. Predlozi za poboljšanje:
                      ===========================
                         - [Predlog 1]
                         - [Predlog 2]
                         - [Predlog 3]

                      2. Potencijalne koristi za zajednicu:
                      =====================================
                         - [Korist 1]
                         - [Korist 2]
                         - [Korist 3]

                      3. Preporučeni akcioni koraci:
                      =============================
                         - [Korak 1]
                         - [Korak 2]
                         - [Korak 3]

                      Format odgovora treba biti jasan i sažet, sa tačkama i podnaslovima, kako bi mogao da se iskoristi za štampanje ili prikaz u aplikaciji. Ovaj odgovor treba biti direktno upotrebljiv u aplikaciji, sa jasno označenim delovima koji će se prikazivati kao liste ili tekst.`

      fetchImageAsBase64(mapboxImageUrl)
        .then((base64Image) => {
          isLoading.value = true
          showDialog.value = true
          return sendRequestToGemini(base64Image, googleApiKey, prompt)
        })
        .then((response) => {
          text.value = response.candidates[0].content.parts[0].text
        })
        .catch((error) => {
          console.error('Error:', error)
        })

    })

  })

  markerLoader.value = true
})
</script>

<template>
  <Loader :is-loading="isLoading" />
  <div class=" overflow-hidden">
  <div id="map" ref="map" class="rounded-2xl" style="height: 75vh; width: 100%"></div>
  </div>
  <Dialog v-model:visible="showDialog" modal :header="headerTitle" :style="{ width: '50rem' }"
          :breakpoints="{ '1199px': '75vw', '575px': '90vw' }">
    <div v-if="mapImage" class="flex justify-center">
      <img :src="mapImage" alt="Map" style="max-width: 100%; height: auto" />
    </div>
    <div v-if="text">
      <p v-html="formattedText" class="p-4"></p>
    </div>
  </Dialog>

</template>

<style scoped>

</style>
