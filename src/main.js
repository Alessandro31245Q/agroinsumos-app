import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { cargarSesion } from './lib/auth'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'agroTheme',
    themes: {
      agroTheme: {
        dark: false,
        colors: {
          primary: '#1B5E20',
          secondary: '#0F6E56',
          accent: '#C86236',
          success: '#2E7D32',
          error: '#C82828',
          background: '#F6F9F5',
          surface: '#FFFFFF',
        },
      },
    },
  },
})

cargarSesion().then(async () => {
  const app = createApp(App).use(router).use(vuetify)
  await router.isReady()
  app.mount('#app')
})
