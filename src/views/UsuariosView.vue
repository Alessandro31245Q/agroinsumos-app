<script setup>
import { ref, onMounted, computed } from 'vue'
import {
  getUsers,
  createUser,
  updateUser,
  updateUserRole,
  deleteUser,
} from '../lib/userService'
import { user } from '../lib/auth'

const usuarios = ref([])
const cargando = ref(true)
const busqueda = ref('')
const filtroRol = ref('todos')

// Estados de modales
const modalCrear = ref(false)
const modalEditar = ref(false)
const modalRol = ref(false)
const modalDetalle = ref(false)
const modalEliminar = ref(false)

// Estados de carga de acciones
const guardando = ref(false)
const eliminando = ref(false)
const cambiandoRol = ref(false)

// Contraseña visible en creación
const mostrarPassword = ref(false)

// Notificaciones
const snackbar = ref({
  show: false,
  text: '',
  color: 'success',
})

// Formularios
const formCrear = ref({
  nombre: '',
  correo: '',
  password: '',
  rol: 'usuario',
})

const formEditar = ref({
  id: '',
  nombre: '',
  correo: '',
})

const formRol = ref({
  id: '',
  nombre: '',
  correo: '',
  rol: 'usuario',
})

const usuarioSeleccionado = ref(null)

const rolesDisponibles = [
  { title: 'Usuario estándar', value: 'usuario', icon: 'mdi-account', color: 'teal' },
  { title: 'Administrador', value: 'admin', icon: 'mdi-shield-crown', color: 'primary' },
]

function mostrarMensaje(text, color = 'success') {
  snackbar.value = { show: true, text, color }
}

async function cargarUsuarios() {
  cargando.value = true
  try {
    const data = await getUsers()
    usuarios.value = Array.isArray(data) ? data : []
  } catch (error) {
    mostrarMensaje('Error al obtener la lista de usuarios: ' + error.message, 'error')
  } finally {
    cargando.value = false
  }
}

// Métricas computadas
const totalUsuarios = computed(() => usuarios.value.length)
const totalAdmins = computed(() => usuarios.value.filter((u) => u.rol === 'admin').length)
const totalEstandar = computed(() => usuarios.value.filter((u) => u.rol !== 'admin').length)

// Usuarios filtrados
const usuariosFiltrados = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  return usuarios.value.filter((u) => {
    const coincideRol =
      filtroRol.value === 'todos' || (u.rol || 'usuario').toLowerCase() === filtroRol.value.toLowerCase()

    const nombre = (u.nombre || '').toLowerCase()
    const correo = (u.correo || '').toLowerCase()
    const id = (u.id || '').toLowerCase()
    const rol = (u.rol || '').toLowerCase()

    const coincideBusqueda =
      !q || nombre.includes(q) || correo.includes(q) || id.includes(q) || rol.includes(q)

    return coincideRol && coincideBusqueda
  })
})

function obtenerIniciales(nombre, correo) {
  const texto = nombre || correo || 'U'
  const partes = texto.trim().split(' ')
  if (partes.length >= 2) {
    return (partes[0][0] + partes[1][0]).toUpperCase()
  }
  return texto.slice(0, 2).toUpperCase()
}

// Abrir Modales
function abrirModalCrear() {
  formCrear.value = {
    nombre: '',
    correo: '',
    password: '',
    rol: 'usuario',
  }
  mostrarPassword.value = false
  modalCrear.value = true
}

function abrirModalEditar(u) {
  formEditar.value = {
    id: u.id,
    nombre: u.nombre || '',
    correo: u.correo || '',
  }
  modalEditar.value = true
}

function abrirModalRol(u) {
  formRol.value = {
    id: u.id,
    nombre: u.nombre || 'Sin nombre',
    correo: u.correo || '',
    rol: u.rol || 'usuario',
  }
  modalRol.value = true
}

function verDetalle(u) {
  usuarioSeleccionado.value = { ...u }
  modalDetalle.value = true
}

function confirmarEliminar(u) {
  usuarioSeleccionado.value = { ...u }
  modalEliminar.value = true
}

// Acciones API
async function guardarNuevoUsuario() {
  if (!formCrear.value.correo || !formCrear.value.correo.includes('@')) {
    mostrarMensaje('Ingresa un correo electrónico válido', 'error')
    return
  }
  if (!formCrear.value.password || formCrear.value.password.length < 6) {
    mostrarMensaje('La contraseña debe tener al menos 6 caracteres', 'error')
    return
  }

  guardando.value = true
  try {
    await createUser({
      correo: formCrear.value.correo.trim(),
      password: formCrear.value.password,
      nombre: formCrear.value.nombre.trim(),
      rol: formCrear.value.rol,
    })
    mostrarMensaje('Usuario creado exitosamente', 'success')
    modalCrear.value = false
    await cargarUsuarios()
  } catch (error) {
    mostrarMensaje('Error al crear usuario: ' + error.message, 'error')
  } finally {
    guardando.value = false
  }
}

async function guardarEdicionUsuario() {
  if (!formEditar.value.correo || !formEditar.value.correo.includes('@')) {
    mostrarMensaje('Ingresa un correo electrónico válido', 'error')
    return
  }
  if (!formEditar.value.nombre.trim()) {
    mostrarMensaje('El nombre no puede estar vacío', 'error')
    return
  }

  guardando.value = true
  try {
    await updateUser(formEditar.value.id, {
      nombre: formEditar.value.nombre.trim(),
      correo: formEditar.value.correo.trim(),
    })
    mostrarMensaje('Usuario actualizado correctamente', 'success')
    modalEditar.value = false
    await cargarUsuarios()
  } catch (error) {
    mostrarMensaje('Error al actualizar usuario: ' + error.message, 'error')
  } finally {
    guardando.value = false
  }
}

async function guardarCambioRol() {
  cambiandoRol.value = true
  try {
    await updateUserRole(formRol.value.id, formRol.value.rol)
    mostrarMensaje(`Rol cambiado a "${formRol.value.rol}" correctamente`, 'success')
    modalRol.value = false
    await cargarUsuarios()
  } catch (error) {
    mostrarMensaje('Error al cambiar rol: ' + error.message, 'error')
  } finally {
    cambiandoRol.value = false
  }
}

async function ejecutarEliminarUsuario() {
  if (!usuarioSeleccionado.value?.id) return

  eliminando.value = true
  try {
    await deleteUser(usuarioSeleccionado.value.id)
    mostrarMensaje('Usuario eliminado exitosamente', 'success')
    modalEliminar.value = false
    await cargarUsuarios()
  } catch (error) {
    mostrarMensaje('Error al eliminar usuario: ' + error.message, 'error')
  } finally {
    eliminando.value = false
  }
}

async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto)
    mostrarMensaje('Copiado al portapapeles', 'info')
  } catch {
    mostrarMensaje('No se pudo copiar', 'error')
  }
}

onMounted(() => {
  cargarUsuarios()
})
</script>

<template>
  <v-container class="py-6 px-4 max-w-7xl">
    <!-- Header -->
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
          <h1 class="text-h4 font-weight-bold text-primary mb-0">Gestión de Usuarios</h1>
        </div>
        <p class="text-subtitle-1 text-medium-emphasis ml-10">
          Administración centralizada de cuentas de usuario, roles y credenciales (UserService API)
        </p>
      </div>

      <div class="d-flex gap-2 ml-10 ml-sm-0">
        <v-btn
          prepend-icon="mdi-refresh"
          variant="outlined"
          color="primary"
          :loading="cargando"
          @click="cargarUsuarios"
        >
          Recargar
        </v-btn>
        <v-btn
          prepend-icon="mdi-account-plus"
          color="primary"
          variant="flat"
          class="font-weight-bold"
          @click="abrirModalCrear"
        >
          Nuevo Usuario
        </v-btn>
      </div>
    </div>

    <!-- Tarjetas de métricas -->
    <v-row class="mb-6">
      <v-col cols="12" sm="4">
        <v-card elevation="1" class="rounded-xl border pa-4 bg-surface">
          <div class="d-flex align-center justify-space-between">
            <div>
              <p class="text-caption text-medium-emphasis font-weight-medium mb-1">TOTAL USUARIOS</p>
              <h2 class="text-h4 font-weight-bold text-primary">{{ totalUsuarios }}</h2>
            </div>
            <v-avatar color="primary" variant="tonal" size="50" class="rounded-xl">
              <v-icon size="28">mdi-account-group</v-icon>
            </v-avatar>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="4">
        <v-card elevation="1" class="rounded-xl border pa-4 bg-surface">
          <div class="d-flex align-center justify-space-between">
            <div>
              <p class="text-caption text-medium-emphasis font-weight-medium mb-1">ADMINISTRADORES</p>
              <h2 class="text-h4 font-weight-bold text-green-darken-3">{{ totalAdmins }}</h2>
            </div>
            <v-avatar color="green-lighten-4" size="50" class="rounded-xl">
              <v-icon color="green-darken-3" size="28">mdi-shield-crown</v-icon>
            </v-avatar>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="4">
        <v-card elevation="1" class="rounded-xl border pa-4 bg-surface">
          <div class="d-flex align-center justify-space-between">
            <div>
              <p class="text-caption text-medium-emphasis font-weight-medium mb-1">USUARIOS ESTÁNDAR</p>
              <h2 class="text-h4 font-weight-bold text-teal-darken-2">{{ totalEstandar }}</h2>
            </div>
            <v-avatar color="teal-lighten-5" size="50" class="rounded-xl">
              <v-icon color="teal-darken-2" size="28">mdi-account-check</v-icon>
            </v-avatar>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filtros y Búsqueda -->
    <v-card elevation="1" class="rounded-xl border mb-6 pa-4 bg-surface">
      <v-row dense align="center">
        <v-col cols="12" md="7">
          <v-text-field
            v-model="busqueda"
            prepend-inner-icon="mdi-magnify"
            placeholder="Buscar por nombre, correo, rol o ID..."
            density="comfortable"
            variant="outlined"
            clearable
            hide-details
          />
        </v-col>
        <v-col cols="12" md="5">
          <v-select
            v-model="filtroRol"
            label="Filtrar por Rol"
            density="comfortable"
            variant="outlined"
            hide-details
            :items="[
              { title: 'Todos los roles', value: 'todos' },
              { title: 'Solo Administradores', value: 'admin' },
              { title: 'Solo Usuarios estándar', value: 'usuario' },
            ]"
          />
        </v-col>
      </v-row>
    </v-card>

    <!-- Tabla de Usuarios -->
    <v-card elevation="2" class="rounded-xl border overflow-hidden">
      <v-progress-linear v-if="cargando" indeterminate color="primary" />

      <v-table hover>
        <thead>
          <tr class="bg-surface-variant text-uppercase text-caption font-weight-bold">
            <th class="py-3 px-4">Usuario</th>
            <th class="py-3 px-4">Correo Electrónico</th>
            <th class="py-3 px-4">Rol en Sistema</th>
            <th class="py-3 px-4">ID de Registro</th>
            <th class="py-3 px-4 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!cargando && usuariosFiltrados.length === 0">
            <td colspan="5" class="text-center py-8">
              <v-icon size="48" color="medium-emphasis" class="mb-2">mdi-account-search-outline</v-icon>
              <p class="text-body-1 font-weight-medium text-medium-emphasis mb-1">
                No se encontraron usuarios
              </p>
              <p class="text-caption text-medium-emphasis mb-4">
                Prueba ajustando el texto de búsqueda o crea un nuevo usuario
              </p>
              <v-btn
                size="small"
                color="primary"
                prepend-icon="mdi-account-plus"
                @click="abrirModalCrear"
              >
                Crear primer usuario
              </v-btn>
            </td>
          </tr>

          <tr v-for="u in usuariosFiltrados" :key="u.id">
            <!-- Usuario / Avatar -->
            <td class="py-3 px-4">
              <div class="d-flex align-center">
                <v-avatar
                  size="38"
                  :color="u.rol === 'admin' ? 'green-lighten-4' : 'primary'"
                  class="mr-3 font-weight-bold"
                  :class="u.rol === 'admin' ? 'text-green-darken-4' : 'text-white'"
                >
                  <span class="text-caption font-weight-bold">
                    {{ obtenerIniciales(u.nombre, u.correo) }}
                  </span>
                </v-avatar>
                <div>
                  <div class="font-weight-bold text-body-2">
                    {{ u.nombre || '(Sin nombre especificado)' }}
                  </div>
                  <div v-if="u.correo === user?.email" class="text-caption text-primary font-weight-medium">
                    (Tu usuario actual)
                  </div>
                </div>
              </div>
            </td>

            <!-- Correo -->
            <td class="py-3 px-4 text-body-2">
              <div class="d-flex align-center">
                <v-icon size="16" color="medium-emphasis" class="mr-1">mdi-email-outline</v-icon>
                <span>{{ u.correo }}</span>
              </div>
            </td>

            <!-- Rol -->
            <td class="py-3 px-4">
              <v-chip
                :color="u.rol === 'admin' ? 'primary' : 'teal'"
                variant="flat"
                size="small"
                class="font-weight-bold text-uppercase cursor-pointer"
                title="Haz clic para cambiar rol"
                @click="abrirModalRol(u)"
              >
                <v-icon start size="14">
                  {{ u.rol === 'admin' ? 'mdi-shield-crown' : 'mdi-account' }}
                </v-icon>
                {{ u.rol || 'usuario' }}
              </v-chip>
            </td>

            <!-- ID Corto / Copiable -->
            <td class="py-3 px-4 font-family-monospace text-caption">
              <span :title="u.id">
                {{ u.id ? `${u.id.substring(0, 8)}...${u.id.substring(u.id.length - 4)}` : 'N/A' }}
              </span>
              <v-btn
                icon="mdi-content-copy"
                variant="text"
                size="x-small"
                class="ml-1"
                title="Copiar ID completo"
                @click="copiarTexto(u.id)"
              />
            </td>

            <!-- Acciones -->
            <td class="py-3 px-4 text-right">
              <div class="d-inline-flex gap-1">
                <v-btn
                  icon="mdi-eye-outline"
                  variant="text"
                  size="small"
                  color="info"
                  title="Ver detalles"
                  @click="verDetalle(u)"
                />
                <v-btn
                  icon="mdi-pencil-outline"
                  variant="text"
                  size="small"
                  color="primary"
                  title="Editar nombre y correo"
                  @click="abrirModalEditar(u)"
                />
                <v-btn
                  icon="mdi-shield-edit-outline"
                  variant="text"
                  size="small"
                  color="primary"
                  title="Cambiar rol"
                  @click="abrirModalRol(u)"
                />
                <v-btn
                  icon="mdi-trash-can-outline"
                  variant="text"
                  size="small"
                  color="error"
                  title="Eliminar usuario"
                  @click="confirmarEliminar(u)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- MODAL CREAR USUARIO (POST /api/users) -->
    <v-dialog v-model="modalCrear" max-width="540px" persistent>
      <v-card class="rounded-xl overflow-hidden">
        <v-card-item class="bg-primary text-white py-4 px-6">
          <div class="d-flex align-center">
            <v-icon size="26" class="mr-2">mdi-account-plus</v-icon>
            <span class="text-h6 font-weight-bold">Crear Nuevo Usuario</span>
          </div>
          <span class="text-caption opacity-80">Registra un nuevo usuario en la base de datos de UserService</span>
        </v-card-item>

        <v-card-text class="pa-6">
          <v-form @submit.prevent="guardarNuevoUsuario">
            <v-row dense>
              <v-col cols="12">
                <v-text-field
                  v-model="formCrear.nombre"
                  label="Nombre Completo"
                  placeholder="Ej. Alessandro Martínez"
                  prepend-inner-icon="mdi-account"
                  variant="outlined"
                  density="comfortable"
                  required
                />
              </v-col>

              <v-col cols="12">
                <v-text-field
                  v-model="formCrear.correo"
                  label="Correo Electrónico"
                  placeholder="correo@ejemplo.com"
                  prepend-inner-icon="mdi-email-outline"
                  type="email"
                  variant="outlined"
                  density="comfortable"
                  required
                />
              </v-col>

              <v-col cols="12">
                <v-text-field
                  v-model="formCrear.password"
                  label="Contraseña"
                  placeholder="Mínimo 6 caracteres"
                  prepend-inner-icon="mdi-lock-outline"
                  :append-inner-icon="mostrarPassword ? 'mdi-eye-off' : 'mdi-eye'"
                  :type="mostrarPassword ? 'text' : 'password'"
                  variant="outlined"
                  density="comfortable"
                  @click:append-inner="mostrarPassword = !mostrarPassword"
                  required
                />
              </v-col>

              <v-col cols="12">
                <v-select
                  v-model="formCrear.rol"
                  label="Rol Asignado"
                  :items="rolesDisponibles"
                  item-title="title"
                  item-value="value"
                  prepend-inner-icon="mdi-shield-check-outline"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions class="pa-4 bg-surface-variant justify-end gap-2">
          <v-btn variant="text" :disabled="guardando" @click="modalCrear = false">
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            class="font-weight-bold px-4"
            :loading="guardando"
            @click="guardarNuevoUsuario"
          >
            Crear Usuario
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- MODAL EDITAR USUARIO (PUT /api/users/{userId}) -->
    <v-dialog v-model="modalEditar" max-width="520px" persistent>
      <v-card class="rounded-xl overflow-hidden">
        <v-card-item class="bg-primary text-white py-4 px-6">
          <div class="d-flex align-center">
            <v-icon size="26" class="mr-2">mdi-account-edit</v-icon>
            <span class="text-h6 font-weight-bold">Editar Usuario</span>
          </div>
          <span class="text-caption opacity-80">Actualiza los datos de nombre y correo del usuario</span>
        </v-card-item>

        <v-card-text class="pa-6">
          <v-form @submit.prevent="guardarEdicionUsuario">
            <v-row dense>
              <v-col cols="12">
                <v-text-field
                  :model-value="formEditar.id"
                  label="ID de Usuario"
                  prepend-inner-icon="mdi-identifier"
                  variant="outlined"
                  density="compact"
                  readonly
                  class="font-family-monospace mb-2"
                />
              </v-col>

              <v-col cols="12">
                <v-text-field
                  v-model="formEditar.nombre"
                  label="Nombre Completo"
                  prepend-inner-icon="mdi-account"
                  variant="outlined"
                  density="comfortable"
                  required
                />
              </v-col>

              <v-col cols="12">
                <v-text-field
                  v-model="formEditar.correo"
                  label="Correo Electrónico"
                  prepend-inner-icon="mdi-email-outline"
                  type="email"
                  variant="outlined"
                  density="comfortable"
                  required
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions class="pa-4 bg-surface-variant justify-end gap-2">
          <v-btn variant="text" :disabled="guardando" @click="modalEditar = false">
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            class="font-weight-bold px-4"
            :loading="guardando"
            @click="guardarEdicionUsuario"
          >
            Guardar Cambios
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- MODAL CAMBIAR ROL (PATCH /api/users/{userId}/role) -->
    <v-dialog v-model="modalRol" max-width="480px" persistent>
      <v-card class="rounded-xl overflow-hidden">
        <v-card-item class="bg-primary text-white py-4 px-6">
          <div class="d-flex align-center">
            <v-icon size="26" class="mr-2">mdi-shield-edit</v-icon>
            <span class="text-h6 font-weight-bold">Cambiar Rol de Usuario</span>
          </div>
          <span class="text-caption opacity-80">Actualiza los permisos de acceso del usuario</span>
        </v-card-item>

        <v-card-text class="pa-6">
          <p class="text-body-2 mb-4">
            Selecciona el nuevo rol para <strong>{{ formRol.nombre }}</strong> ({{ formRol.correo }}):
          </p>

          <v-radio-group v-model="formRol.rol">
            <v-radio
              value="usuario"
              color="teal"
              class="mb-2"
            >
              <template #label>
                <div>
                  <div class="font-weight-bold text-teal-darken-2">Usuario Estándar</div>
                  <div class="text-caption text-medium-emphasis">
                    Acceso regular a módulos del sistema según permisos asignados
                  </div>
                </div>
              </template>
            </v-radio>

            <v-radio
              value="admin"
              color="primary"
            >
              <template #label>
                <div>
                  <div class="font-weight-bold text-green-darken-3">Administrador</div>
                  <div class="text-caption text-medium-emphasis">
                    Control total sobre usuarios, roles, configuraciones y módulos
                  </div>
                </div>
              </template>
            </v-radio>
          </v-radio-group>
        </v-card-text>

        <v-card-actions class="pa-4 bg-surface-variant justify-end gap-2">
          <v-btn variant="text" :disabled="cambiandoRol" @click="modalRol = false">
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            class="font-weight-bold px-4"
            :loading="cambiandoRol"
            @click="guardarCambioRol"
          >
            Actualizar Rol
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- MODAL DETALLE DE USUARIO -->
    <v-dialog v-model="modalDetalle" max-width="500px">
      <v-card v-if="usuarioSeleccionado" class="rounded-xl overflow-hidden">
        <v-card-item class="bg-primary text-white py-4 px-6">
          <div class="d-flex align-center">
            <v-avatar color="white" class="mr-3" size="42">
              <span class="text-primary font-weight-bold">
                {{ obtenerIniciales(usuarioSeleccionado.nombre, usuarioSeleccionado.correo) }}
              </span>
            </v-avatar>
            <div>
              <div class="text-h6 font-weight-bold">
                {{ usuarioSeleccionado.nombre || 'Usuario sin nombre' }}
              </div>
              <div class="text-caption opacity-80">
                {{ usuarioSeleccionado.correo }}
              </div>
            </div>
          </div>
        </v-card-item>

        <v-card-text class="pa-6">
          <v-list density="compact" class="py-0">
            <v-list-item class="px-0 py-2">
              <template #prepend>
                <v-icon color="primary" class="mr-3">mdi-identifier</v-icon>
              </template>
              <v-list-item-title class="text-caption text-medium-emphasis">ID Único</v-list-item-title>
              <v-list-item-subtitle class="font-family-monospace font-weight-medium">
                {{ usuarioSeleccionado.id }}
              </v-list-item-subtitle>
              <template #append>
                <v-btn
                  icon="mdi-content-copy"
                  variant="text"
                  size="small"
                  title="Copiar ID"
                  @click="copiarTexto(usuarioSeleccionado.id)"
                />
              </template>
            </v-list-item>

            <v-divider />

            <v-list-item class="px-0 py-2">
              <template #prepend>
                <v-icon color="primary" class="mr-3">mdi-shield-account</v-icon>
              </template>
              <v-list-item-title class="text-caption text-medium-emphasis">Rol Asignado</v-list-item-title>
              <v-list-item-subtitle class="mt-1">
                <v-chip
                  :color="usuarioSeleccionado.rol === 'admin' ? 'primary' : 'teal'"
                  size="small"
                  class="font-weight-bold text-uppercase"
                >
                  {{ usuarioSeleccionado.rol || 'usuario' }}
                </v-chip>
              </v-list-item-subtitle>
            </v-list-item>

            <v-divider />

            <v-list-item class="px-0 py-2">
              <template #prepend>
                <v-icon color="primary" class="mr-3">mdi-email-check-outline</v-icon>
              </template>
              <v-list-item-title class="text-caption text-medium-emphasis">Correo</v-list-item-title>
              <v-list-item-subtitle class="font-weight-medium">
                {{ usuarioSeleccionado.correo }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>

        <v-card-actions class="pa-4 bg-surface-variant justify-end gap-2">
          <v-btn
            color="primary"
            variant="outlined"
            size="small"
            prepend-icon="mdi-pencil"
            @click="modalDetalle = false; abrirModalEditar(usuarioSeleccionado)"
          >
            Editar
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            prepend-icon="mdi-shield-edit"
            @click="modalDetalle = false; abrirModalRol(usuarioSeleccionado)"
          >
            Cambiar Rol
          </v-btn>
          <v-btn variant="text" size="small" @click="modalDetalle = false">
            Cerrar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- MODAL CONFIRMAR ELIMINAR (DELETE /api/users/{userId}) -->
    <v-dialog v-model="modalEliminar" max-width="480px" persistent>
      <v-card v-if="usuarioSeleccionado" class="rounded-xl overflow-hidden">
        <v-card-item class="bg-error text-white py-4 px-6">
          <div class="d-flex align-center">
            <v-icon size="26" class="mr-2">mdi-alert-octagon</v-icon>
            <span class="text-h6 font-weight-bold">Confirmar Eliminación</span>
          </div>
          <span class="text-caption opacity-80">Esta acción no se puede deshacer</span>
        </v-card-item>

        <v-card-text class="pa-6">
          <p class="text-body-1 mb-3">
            ¿Estás seguro de que deseas eliminar permanentemente al usuario:
          </p>
          <v-alert
            color="error"
            variant="tonal"
            density="comfortable"
            class="mb-3"
          >
            <div class="font-weight-bold">{{ usuarioSeleccionado.nombre || 'Sin nombre' }}</div>
            <div class="text-caption">{{ usuarioSeleccionado.correo }}</div>
            <div class="text-caption font-family-monospace mt-1">ID: {{ usuarioSeleccionado.id }}</div>
          </v-alert>

          <p v-if="usuarioSeleccionado.correo === user?.email" class="text-caption text-error font-weight-bold">
            ⚠️ ¡Atención! Estás intentando eliminar tu propia cuenta en sesión.
          </p>
        </v-card-text>

        <v-card-actions class="pa-4 bg-surface-variant justify-end gap-2">
          <v-btn variant="text" :disabled="eliminando" @click="modalEliminar = false">
            Cancelar
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            class="font-weight-bold px-4"
            :loading="eliminando"
            @click="ejecutarEliminarUsuario"
          >
            Eliminar Permanentemente
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
.font-family-monospace {
  font-family: monospace;
}
.gap-1 {
  gap: 4px;
}
.gap-2 {
  gap: 8px;
}
.gap-3 {
  gap: 12px;
}
</style>
