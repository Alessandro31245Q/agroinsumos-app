<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { iniciarSesion } from '../lib/auth'

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const router = useRouter()

async function handleLogin() {
  error.value = ''
  loading.value = true
  const err = await iniciarSesion(email.value, password.value)
  loading.value = false

  if (err) {
    error.value = 'Correo o contraseña incorrectos'
    return
  }
  router.push('/erp')
}
</script>

<template>
  <v-container class="fill-height bg-background" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card elevation="8" class="rounded-xl pa-4">
          <div class="text-center mt-4 mb-2">
            <v-icon size="64" color="primary">mdi-sprout</v-icon>
          </div>
          
          <v-card-title class="text-center text-h5 font-weight-bold text-primary mb-2">
            Agroinsumos del Huila
          </v-card-title>
          
          <v-card-subtitle class="text-center text-subtitle-1 mb-6">
            Inicia sesión para continuar
          </v-card-subtitle>
          
          <v-card-text>
            <v-form @submit.prevent="handleLogin">
              <v-text-field
                v-model="email"
                label="Correo electrónico"
                type="email"
                prepend-inner-icon="mdi-email-outline"
                variant="outlined"
                density="comfortable"
                class="mb-4"
                required
                hide-details="auto"
              />
              
              <v-text-field
                v-model="password"
                label="Contraseña"
                type="password"
                prepend-inner-icon="mdi-lock-outline"
                variant="outlined"
                density="comfortable"
                class="mb-6"
                required
                hide-details="auto"
              />
              
              <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-6">
                {{ error }}
              </v-alert>
              
              <v-btn
                type="submit"
                color="primary"
                block
                size="large"
                class="rounded-lg text-none font-weight-bold"
                elevation="2"
                :loading="loading"
              >
                Ingresar
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
