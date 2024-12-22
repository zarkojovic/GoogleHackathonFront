<script setup>
import L from 'leaflet'
import { computed, onMounted, ref } from 'vue'
import * as tf from '@tensorflow/tfjs'
import { marked } from 'marked'

const map = ref(null)
const text = ref(null)
const mapImage = ref(null)

const formattedText = computed(() => {
  return marked(text.value);
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

function haversineDistance(coord1, coord2) {
  const R = 6371 // Earth's radius in km
  const [lat1, lon1] = coord1
  const [lat2, lon2] = coord2

  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Distance in km
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
  const mapInstance = L.map('map').setView([44.8, 20.5], 13)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(mapInstance)

  const processedDataset = []
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

  const predictions = []

  for (const bandValues of inputsForPrediction) {
    const predictedCoordinate = await predictHeatIslands(
      model,
      bandValues
    )
    predictions.push(predictedCoordinate)
  }

  predictions.forEach((coordinate, index) => {
    const marker = L.marker(coordinate)
      .addTo(mapInstance)
      .bindPopup(`Critical Coordinate ${index + 1}`)
      .openPopup()

    marker.on('click', async function() {
      const { lat, lng } = marker.getLatLng()
      const mapboxImageUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lng},${lat},15/640x640?access_token=pk.eyJ1IjoibGlubmlrYWdlbmN5IiwiYSI6ImNtMzRtZWlnYzAxNmUyanF4ZmxxZnJnc24ifQ.PyWdx3E09PfzIcF_SQyvWA`
      mapImage.value = mapboxImageUrl
      const googleApiKey = 'AIzaSyDyC6R9_D_HCskAJ06IRUXCPU2gRPI3_iE'

      const address = await fetchAddressFromCoordinates(lng, lat)

      const prompt = `Molim te da analiziraš sledeću lokaciju u Beogradu i predložiš konkretna poboljšanja za održivi razvoj. Fokusiraj se na aspekte kao što su zelene površine, energetska efikasnost, saobraćajna infrastruktura, otpad, kvalitet vazduha i drugi relevantni faktori za poboljšanje održivosti. Navedi konkretne korake koji se mogu preduzeti, kao i potencijalne koristi od tih promena.

                      Naziv adrese: ${address}.

                      Odgovor treba da bude u sledećem standardizovanom formatu:
                      1. **Predlozi za poboljšanje:**
                         - [Predlog 1]
                         - [Predlog 2]
                         - [Predlog 3]

                      2. **Potencijalne koristi za zajednicu:**
                         - [Korist 1]
                         - [Korist 2]
                         - [Korist 3]

                      3. **Preporučeni akcioni koraci:**
                         - [Korak 1]
                         - [Korak 2]
                         - [Korak 3]

                      Format odgovora treba biti jasan i sažet, sa tačkama i podnaslovima, kako bi mogao da se iskoristi za štampanje ili prikaz u aplikaciji. Ovaj odgovor treba biti direktno upotrebljiv u aplikaciji, sa jasno označenim delovima koji će se prikazivati kao liste ili tekst.`;

      fetchImageAsBase64(mapboxImageUrl)
        .then((base64Image) => {
          text.value = 'Image fetched'
          return sendRequestToGemini(base64Image, googleApiKey, prompt)
        })
        .then((response) => {
          text.value = response.candidates[0].content.parts[0].text
        })
        .catch((error) => {
          console.error('Error:', error)
        })

      alert(
        "Wait while we're generating suggestions for improving the area..."
      )
    })
  })
})
</script>

<template>
  <div id="map" ref="map" style="height: 50vh; width: 100%"></div>
  <div v-if="mapImage" class="flex justify-center">
    <img :src="mapImage" alt="Map" style="max-width: 100%; height: auto" />
  </div>
  <div v-if="text" v-html="formattedText"></div>
</template>

<style scoped>

</style>
