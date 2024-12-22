import './index.css'
import 'leaflet/dist/leaflet.css'
import Aura from '@primevue/themes/aura';
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import PrimeVue from 'primevue/config'
import Button from 'primevue/button'

const app = createApp(App)
// Force the light theme by adding 'light' class to the root element
document.documentElement.classList.add('light') // Ensure light theme is always applied

app.use(createPinia())
app.use(PrimeVue,{
  theme: {
    preset: Aura,
  },
})
app.use(router)
app.component('Button', Button)

app.mount('#app')
