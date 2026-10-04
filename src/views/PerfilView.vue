<script setup>
import { ref, onMounted, computed } from 'vue'
import { user, perfil } from '../lib/auth'
import { getUsers, getUserById, updateUser, createUser } from '../lib/userService'

const cargando = ref(true)
const guardando = ref(false)
const copiado = ref(false)
const modalRegistro = ref(false)
const passwordRegistro = ref('')
const registrando = ref(false)

const usuarioService = ref({
  id: '',
  nombre: '',
  correo: '',
  rol: 'usuario',
})

const form = ref({
  nombre: '',
  correo: '',
})

const snackbar = ref({
  show: false,
  text: '',
  color: 'success',
})

function mostrarMensaje(text, color = 'success') {
  snackbar.value = { show: true, text, color }
}

const iniciales = computed(() => {
  const nom = form.value.nombre || perfil.value?.nombre || user.value?.email || 'U'
  const partes = nom.trim().split(' ')
  if (partes.length >= 2) {
    return (partes[0][0] + partes[1][0]).toUpperCase()
  }
  return nom.slice(0, 2).toUpperCase()
})

async function cargarDatosPerfil() {
  cargando.value = true
  try {
    const emailActual = user.value?.email || ''
    const idActual = user.value?.id || ''

    // Intentamos buscar primero por ID directo en UserService
    let usuarioEncontrado = null
    if (idActual) {
      try {
        usuarioEncontrado = await getUserById(idActual)
      } catch {
        // Puede que en UserService los IDs sean distintos o generados
      }
    }

    // Si no se halló por ID, buscamos por correo en la lista
    if (!usuarioEncontrado) {
      const lista = await getUsers()
      if (Array.isArray(lista)) {
        usuarioEncontrado = lista.find(
          (u) => (u.correo || '').toLowerCase() === emailActual.toLowerCase()
        )
      }
    }

    if (usuarioEncontrado) {
      usuarioService.value = {
        id: usuarioEncontrado.id,
        nombre: usuarioEncontrado.nombre || '',
        correo: usuarioEncontrado.correo || emailActual,
        rol: usuarioEncontrado.rol || 'usuario',
      }
      form.value.nombre = usuarioEncontrado.nombre || perfil.value?.nombre || ''
      form.value.correo = usuarioEncontrado.correo || emailActual
    } else {
      // Valores por defecto basados en la sesión activa
      usuarioService.value = {
        id: idActual || 'No registrado en UserService',
        nombre: perfil.value?.nombre || '',
        correo: emailActual,
        rol: perfil.value?.rol || 'usuario',
      }
      form.value.nombre = perfil.value?.nombre || ''
      form.value.correo = emailActual
    }
  } catch (error) {
    mostrarMensaje('Error al sincronizar con UserService: ' + error.message, 'error')
  } finally {
    cargando.value = false
  }
}

async function guardarCambios() {
  if (!form.value.correo || !form.value.correo.includes('@')) {
    mostrarMensaje('Por favor ingresa un correo electrónico válido', 'error')
    return
  }
  if (!form.value.nombre.trim()) {
    mostrarMensaje('El nombre no puede estar vacío', 'error')
    return
  }

  if (!usuarioService.value.id || usuarioService.value.id === 'No registrado en UserService') {
    mostrarMensaje('No se encontró el ID del usuario en UserService para actualizar', 'error')
    return
  }

  guardando.value = true
  try {
    await updateUser(usuarioService.value.id, {
      nombre: form.value.nombre.trim(),
      correo: form.value.correo.trim(),
    })

    usuarioService.value.nombre = form.value.nombre.trim()
    usuarioService.value.correo = form.value.correo.trim()

    // Sincronizar estado local del perfil para que la barra y el Home se actualicen de inmediato
    if (perfil.value) {
      perfil.value.nombre = form.value.nombre.trim()
    }

    mostrarMensaje('Perfil actualizado exitosamente en UserService', 'success')
  } catch (error) {
    mostrarMensaje('Error al actualizar el perfil: ' + error.message, 'error')
  } finally {
    guardando.value = false
  }
}

async function registrarEnUserService() {
  if (!passwordRegistro.value || passwordRegistro.value.length < 6) {
    mostrarMensaje('Ingresa una contraseña de al menos 6 caracteres', 'error')
    return
  }
  registrando.value = true
  try {
    await createUser({
      correo: form.value.correo.trim(),
      password: passwordRegistro.value,
      nombre: form.value.nombre.trim(),
      rol: 'usuario',
    })
    mostrarMensaje('Usuario registrado exitosamente en UserService', 'success')
    modalRegistro.value = false
    passwordRegistro.value = ''
    await cargarDatosPerfil()
  } catch (error) {
    mostrarMensaje('Error al registrar usuario: ' + error.message, 'error')
  } finally {
    registrando.value = false
  }
}

async function copiarId() {
  if (!usuarioService.value.id) return
  try {
    await navigator.clipboard.writeText(usuarioService.value.id)
    copiado.value = true
    setTimeout(() => {
      copiado.value = false
    }, 2500)
    mostrarMensaje('ID copiado al portapapeles', 'info')
  } catch {
    mostrarMensaje('No se pudo copiar el ID', 'error')
  }
}

onMounted(() => {
  cargarDatosPerfil()
})
</script>

<template>
  <v-container class="py-6 px-4 max-w-7xl">
    <!-- Encabezado de la página -->
    <div class="d-flex flex-column flex-sm-row justify-space-between align-sm-center mb-6 gap-3">
      <div>
        <div class="d-flex align-center gap-2 mb-1">
          <v-btn
            icon="mdi-arrow-left"
            variant="text"
            density="comfortable"
            class="mr-1"
            @click="$router.push('/')"
          />
          <h1 class="text-h4 font-weight-bold text-primary mb-0">Mi Perfil</h1>
        </div>
        <p class="text-subtitle-1 text-medium-emphasis ml-10">
          Gestiona tu información de cuenta y credenciales en el sistema
        </p>
      </div>

      <div class="d-flex gap-2 ml-10 ml-sm-0">
        <v-btn
          prepend-icon="mdi-refresh"
          variant="outlined"
          color="primary"
          :loading="cargando"
          @click="cargarDatosPerfil"
        >
          Recargar
        </v-btn>
        <v-btn
          to="/usuarios"
          prepend-icon="mdi-account-multiple-outline"
          color="primary"
          variant="flat"
        >
          Ver Usuarios
        </v-btn>
      </div>
    </div>

    <!-- Barra de progreso -->
    <v-progress-linear
      v-if="cargando"
      indeterminate
      color="primary"
      class="mb-6 rounded"
    />

    <v-row>
      <!-- Tarjeta Resumen Usuario -->
      <v-col cols="12" md="4">
        <v-card elevation="2" class="rounded-xl overflow-hidden mb-6 border">
          <div class="bg-primary pa-6 text-center position-relative">
            <v-avatar size="100" color="white" class="elevation-4 mb-3">
              <span class="text-h4 font-weight-bold text-primary">{{ iniciales }}</span>
            </v-avatar>
            <h2 class="text-h5 font-weight-bold text-white mb-1">
              {{ form.nombre || 'Usuario' }}
            </h2>
            <p class="text-caption text-white opacity-80 mb-2">
              {{ form.correo || user?.email }}
            </p>

            <v-chip
              :color="usuarioService.rol === 'admin' ? 'amber-lighten-4' : 'light-green-lighten-4'"
              :text-color="usuarioService.rol === 'admin' ? 'amber-darken-4' : 'green-darken-4'"
              size="small"
              class="font-weight-bold text-uppercase"
            >
              <v-icon start size="16">
                {{ usuarioService.rol === 'admin' ? 'mdi-shield-crown' : 'mdi-account' }}
              </v-icon>
              {{ usuarioService.rol || 'usuario' }}
            </v-chip>
          </div>

          <v-card-text class="pa-4">
            <v-list density="compact" class="py-0">
              <v-list-item class="px-0">
                <template #prepend>
                  <v-icon color="primary" class="mr-3">mdi-identifier</v-icon>
                </template>
                <v-list-item-title class="text-caption text-medium-emphasis">
                  ID en UserService
                </v-list-item-title>
                <v-list-item-subtitle class="font-family-monospace text-truncate font-weight-medium">
                  {{ usuarioService.id || 'N/A' }}
                </v-list-item-subtitle>
                <template #append>
                  <v-btn
                    :icon="copiado ? 'mdi-check' : 'mdi-content-copy'"
                    :color="copiado ? 'success' : 'medium-emphasis'"
                    variant="text"
                    size="small"
                    title="Copiar ID"
                    @click="copiarId"
                  />
                </template>
              </v-list-item>

              <v-divider class="my-2" />

              <v-list-item class="px-0">
                <template #prepend>
                  <v-icon color="primary" class="mr-3">mdi-server-network</v-icon>
                </template>
                <v-list-item-title class="text-caption text-medium-emphasis">
                  Servicio Conectado
                </v-list-item-title>
                <v-list-item-subtitle class="font-weight-medium text-success d-flex align-center">
                  <v-badge dot inline color="success" class="mr-1" />
                  UserService (Render API)
                </v-list-item-subtitle>
              </v-list-item>

              <v-divider class="my-2" />

              <v-list-item class="px-0">
                <template #prepend>
                  <v-icon color="primary" class="mr-3">mdi-check-decagram</v-icon>
                </template>
                <v-list-item-title class="text-caption text-medium-emphasis">
                  Estado de Cuenta
                </v-list-item-title>
                <v-list-item-subtitle class="font-weight-medium text-success">
                  Activa y Verificada
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <!-- Tarjeta de ayuda / rol -->
        <v-card elevation="1" class="rounded-xl pa-4 bg-surface-variant border">
          <div class="d-flex align-center mb-2">
            <v-icon color="primary" class="mr-2">mdi-shield-lock-outline</v-icon>
            <span class="font-weight-bold">Permisos y Rol</span>
          </div>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Tu rol actual es <strong>{{ usuarioService.rol }}</strong>. Para solicitar cambios en tu rol o permisos de administrador, contacta a la gerencia de sistemas.
          </p>
        </v-card>
      </v-col>

      <!-- Tarjeta Formulario de Edición -->
      <v-col cols="12" md="8">
        <v-card elevation="2" class="rounded-xl border">
          <v-card-item class="pa-6 border-b">
            <template #prepend>
              <v-icon color="primary" size="28" class="mr-2">mdi-account-edit-outline</v-icon>
            </template>
            <v-card-title class="text-h6 font-weight-bold">
              Editar Información Personal
            </v-card-title>
            <v-card-subtitle>
              Actualiza tu nombre y correo electrónico sincronizados con el UserService
            </v-card-subtitle>
          </v-card-item>

          <v-card-text class="pa-6">
            <v-form @submit.prevent="guardarCambios">
              <v-row>
                <v-col cols="12">
                  <v-alert
                    v-if="usuarioService.id && usuarioService.id.startsWith('No registrado')"
                    color="warning"
                    variant="tonal"
                    density="comfortable"
                    icon="mdi-alert-circle-outline"
                    class="mb-4"
                  >
                    <div class="d-flex flex-column flex-sm-row justify-space-between align-sm-center gap-2">
                      <div>
                        Tu usuario aún no está registrado en el UserService. Registra tu cuenta para poder actualizar tus datos directamente en el microservicio.
                      </div>
                      <v-btn
                        size="small"
                        color="warning"
                        variant="flat"
                        class="text-none font-weight-bold"
                        @click="modalRegistro = true"
                      >
                        Registrarme
                      </v-btn>
                    </div>
                  </v-alert>

                  <v-alert
                    v-else
                    color="primary"
                    variant="tonal"
                    density="comfortable"
                    icon="mdi-information-outline"
                    class="mb-4"
                  >
                    Los cambios realizados aquí se enviarán directamente a la API de usuarios (<code>PUT /api/users/{userId}</code>) y se verán reflejados en todo el sistema.
                  </v-alert>
                </v-col>

                <v-col cols="12">
                  <v-text-field
                    v-model="form.nombre"
                    label="Nombre Completo"
                    placeholder="Ej. Alessandro Ramírez"
                    prepend-inner-icon="mdi-account"
                    variant="outlined"
                    density="comfortable"
                    :disabled="guardando || cargando"
                    required
                  />
                </v-col>

                <v-col cols="12">
                  <v-text-field
                    v-model="form.correo"
                    label="Correo Electrónico"
                    placeholder="usuario@ejemplo.com"
                    prepend-inner-icon="mdi-email-outline"
                    type="email"
                    variant="outlined"
                    density="comfortable"
                    :disabled="guardando || cargando"
                    required
                  />
                </v-col>

                <v-col cols="12" sm="6">
                  <v-text-field
                    :model-value="usuarioService.rol"
                    label="Rol Asignado"
                    prepend-inner-icon="mdi-shield-outline"
                    variant="outlined"
                    density="comfortable"
                    readonly
                    hint="El rol solo puede ser modificado por un Administrador desde Gestión de Usuarios"
                    persistent-hint
                  />
                </v-col>

                <v-col cols="12" sm="6">
                  <v-text-field
                    :model-value="usuarioService.id"
                    label="Identificador Único (ID)"
                    prepend-inner-icon="mdi-key-variant"
                    variant="outlined"
                    density="comfortable"
                    readonly
                    hint="Identificador del registro en el microservicio"
                    persistent-hint
                  />
                </v-col>
              </v-row>

              <div class="d-flex justify-end gap-3 mt-6 pt-4 border-t">
                <v-btn
                  variant="text"
                  color="secondary"
                  :disabled="guardando || cargando"
                  @click="cargarDatosPerfil"
                >
                  Descartar
                </v-btn>
                <v-btn
                  type="submit"
                  color="primary"
                  prepend-icon="mdi-content-save-outline"
                  class="px-6 font-weight-bold"
                  elevation="2"
                  :loading="guardando"
                  :disabled="cargando"
                >
                  Guardar Cambios
                </v-btn>
              </div>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Modal Registrar en UserService si no existe -->
    <v-dialog v-model="modalRegistro" max-width="480px" persistent>
      <v-card class="rounded-xl overflow-hidden">
        <v-card-item class="bg-primary text-white py-4 px-6">
          <div class="d-flex align-center">
            <v-icon size="26" class="mr-2">mdi-account-plus</v-icon>
            <span class="text-h6 font-weight-bold">Registrar en UserService</span>
          </div>
          <span class="text-caption opacity-80">
            Crea tu registro en el servicio de usuarios para habilitar la edición
          </span>
        </v-card-item>

        <v-card-text class="pa-6">
          <p class="text-body-2 mb-4">
            Se registrará la cuenta con el correo <strong>{{ form.correo }}</strong> y nombre <strong>{{ form.nombre || 'Usuario' }}</strong>. Asigna una contraseña para el UserService:
          </p>

          <v-text-field
            v-model="passwordRegistro"
            label="Contraseña"
            type="password"
            prepend-inner-icon="mdi-lock-outline"
            placeholder="Mínimo 6 caracteres"
            variant="outlined"
            density="comfortable"
          />
        </v-card-text>

        <v-card-actions class="pa-4 bg-surface-variant justify-end gap-2">
          <v-btn variant="text" :disabled="registrando" @click="modalRegistro = false">
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            class="font-weight-bold px-4"
            :loading="registrando"
            @click="registrarEnUserService"
          >
            Registrar Ahora
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Notificaciones flotantes -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3500"
      location="top right"
      rounded="pill"
    >
      <div class="d-flex align-center">
        <v-icon
          class="mr-2"
          :icon="snackbar.color === 'error' ? 'mdi-alert-circle' : 'mdi-check-circle'"
        />
        {{ snackbar.text }}
      </div>
    </v-snackbar>
  </v-container>
</template>

<style scoped>
.border {
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
}
.border-b {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08) !important;
}
.border-t {
  border-top: 1px solid rgba(0, 0, 0, 0.08) !important;
}
.font-family-monospace {
  font-family: monospace;
}
.gap-2 {
  gap: 8px;
}
.gap-3 {
  gap: 12px;
}
</style>
