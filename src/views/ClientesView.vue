<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../lib/supabase'

import { guardarEnCache } from '../lib/erpDataCache'

const clientes = ref([])
const loading = ref(true)
const search = ref('')
const filtroEstado = ref('Todos')
const dialog = ref(false)
const editando = ref(false)
const guardando = ref(false)
const snackbar = ref({ show: false, text: '', color: 'success' })

const defaultForm = {
  id: null,
  cedula: '',
  nombre: '',
  apellidos: '',
  telefono: '',
  correo: '',
  direccion: '',
  estado: 'Activo',
}

const form = ref({ ...defaultForm })

const headers = [
  { title: 'Cédula / NIT', key: 'cedula' },
  { title: 'Cliente', key: 'nombre_completo' },
  { title: 'Teléfono', key: 'telefono' },
  { title: 'Correo', key: 'correo' },
  { title: 'Dirección', key: 'direccion' },
  { title: 'Estado', key: 'estado' },
  { title: '', key: 'acciones', sortable: false, align: 'end' },
]

// ─── Columnas y KPIs para Exportación Excel (Desde Caché en Memoria) ────────
const columnasExcel = [
  { header: 'Cédula / NIT', key: 'cedula', width: 16, align: 'center' },
  { header: 'Nombre', key: 'nombre', width: 22 },
  { header: 'Apellidos', key: 'apellidos', width: 22 },
  { header: 'Nombre Completo', key: 'nombre_completo', width: 28 },
  { header: 'Teléfono', key: 'telefono', width: 16, align: 'center' },
  { header: 'Correo Electrónico', key: 'correo', width: 26 },
  { header: 'Dirección', key: 'direccion', width: 30 },
  { header: 'Estado', key: 'estado', width: 14, align: 'center' },
  {
    header: 'Fecha Registro',
    key: 'created_at',
    width: 20,
    align: 'center',
    transform: val => val ? new Date(val).toLocaleDateString('es-CO') : 'Sin fecha'
  },
]

async function cargarClientes() {
  loading.value = true
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('nombre', { ascending: true })

  if (error) {
    mostrarMensaje('Error cargando clientes: ' + error.message, 'error')
  } else {
    clientes.value = data || []
    guardarEnCache('clientes', clientes.value)
  }
  loading.value = false
}

const clientesFiltrados = computed(() => {
  return clientes.value
    .map(c => ({
      ...c,
      nombre_completo: `${c.nombre || ''} ${c.apellidos || ''}`.trim() || 'Sin nombre',
    }))
    .filter(c => {
      const pasaEstado = filtroEstado.value === 'Todos' || c.estado === filtroEstado.value
      return pasaEstado
    })
})

// Métricas de clientes
const totalClientes = computed(() => clientes.value.length)
const totalActivos = computed(() => clientes.value.filter(c => c.estado === 'Activo').length)
const totalConCorreo = computed(() => clientes.value.filter(c => c.correo && c.correo.trim().length > 0).length)

const kpisExcel = computed(() => [
  { title: 'Total Clientes', value: totalClientes.value, subtext: 'Cargados en memoria actual' },
  { title: 'Clientes Activos', value: totalActivos.value, subtext: `${Math.round((totalActivos.value / (totalClientes.value || 1)) * 100)}% de la base de datos` },
  { title: 'Con Correo Electrónico', value: totalConCorreo.value, subtext: 'Habilitados para facturación digital' },
  { title: 'Inactivos', value: totalClientes.value - totalActivos.value, subtext: 'Sin actividad reciente' },
])

function mostrarMensaje(text, color = 'success') {
  snackbar.value = { show: true, text, color }
}

function iniciales(nombre, apellidos) {
  const n = (nombre || '').trim()[0] || ''
  const a = (apellidos || '').trim()[0] || ''
  return (n + a).toUpperCase() || 'CL'
}

function nuevoCliente() {
  editando.value = false
  form.value = { ...defaultForm }
  dialog.value = true
}

function editarCliente(cliente) {
  editando.value = true
  form.value = {
    id: cliente.id,
    cedula: cliente.cedula || '',
    nombre: cliente.nombre || '',
    apellidos: cliente.apellidos || '',
    telefono: cliente.telefono || '',
    correo: cliente.correo || '',
    direccion: cliente.direccion || '',
    estado: cliente.estado || 'Activo',
  }
  dialog.value = true
}

async function guardarCliente() {
  if (!form.value.cedula?.trim() || !form.value.nombre?.trim()) {
    return mostrarMensaje('La cédula y el nombre son obligatorios', 'error')
  }

  guardando.value = true

  const payload = {
    cedula: form.value.cedula.trim(),
    nombre: form.value.nombre.trim(),
    apellidos: form.value.apellidos?.trim() || null,
    telefono: form.value.telefono?.trim() || null,
    correo: form.value.correo?.trim() || null,
    direccion: form.value.direccion?.trim() || null,
    estado: form.value.estado || 'Activo',
  }

  try {
    if (editando.value) {
      const { error } = await supabase
        .from('clientes')
        .update(payload)
        .eq('id', form.value.id)

      if (error) throw error
      mostrarMensaje('Cliente actualizado con éxito')
    } else {
      const { error } = await supabase
        .from('clientes')
        .insert([payload])

      if (error) throw error
      mostrarMensaje('Cliente registrado con éxito')
    }

    dialog.value = false
    await cargarClientes()
  } catch (error) {
    mostrarMensaje(`Error guardando: ${error.message}`, 'error')
  } finally {
    guardando.value = false
  }
}

async function eliminarCliente(cliente) {
  const nom = `${cliente.nombre} ${cliente.apellidos || ''}`.trim()
  if (!confirm(`¿Estás seguro de eliminar al cliente "${nom}"?`)) return

  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', cliente.id)

  if (error) {
    mostrarMensaje('No se pudo eliminar el cliente (puede tener facturas asociadas): ' + error.message, 'error')
  } else {
    mostrarMensaje('Cliente eliminado')
    await cargarClientes()
  }
}

onMounted(cargarClientes)
</script>

<template>
  <v-container fluid class="pa-6">
    <!-- MÉTRICAS SUPERIORES -->
    <v-row dense class="mb-4">
      <v-col cols="12" sm="4">
        <v-card variant="tonal" color="primary" class="rounded-lg pa-4">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption font-weight-medium">Total Clientes</div>
              <div class="text-h5 font-weight-bold">{{ totalClientes }}</div>
            </div>
            <v-avatar color="primary" variant="flat" size="40">
              <v-icon size="20">mdi-account-group</v-icon>
            </v-avatar>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="4">
        <v-card variant="tonal" color="success" class="rounded-lg pa-4">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption font-weight-medium">Clientes Activos</div>
              <div class="text-h5 font-weight-bold">{{ totalActivos }}</div>
            </div>
            <v-avatar color="success" variant="flat" size="40">
              <v-icon size="20">mdi-account-check</v-icon>
            </v-avatar>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="4">
        <v-card variant="tonal" color="info" class="rounded-lg pa-4">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption font-weight-medium">Con Correo / Contacto</div>
              <div class="text-h5 font-weight-bold">{{ totalConCorreo }}</div>
            </div>
            <v-avatar color="info" variant="flat" size="40">
              <v-icon size="20">mdi-email-check-outline</v-icon>
            </v-avatar>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- TARJETA PRINCIPAL Y TABLA -->
    <v-card elevation="2" class="rounded-lg">
      <v-toolbar color="transparent" flat class="px-4 pt-2">
        <v-btn
          icon="mdi-arrow-left"
          variant="tonal"
          color="primary"
          size="small"
          class="mr-3"
          @click="$router.push('/erp')"
        >
          <v-icon>mdi-arrow-left</v-icon>
          <v-tooltip activator="parent" location="bottom">Volver al Panel Principal</v-tooltip>
        </v-btn>
        <v-toolbar-title class="text-h5 font-weight-bold">
          Gestión de Clientes
        </v-toolbar-title>
        <v-spacer />

        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-account-plus"
          @click="nuevoCliente"
          class="text-none font-weight-bold"
        >
          Nuevo Cliente
        </v-btn>
      </v-toolbar>

      <v-card-text>
        <v-row class="mb-2 align-center">
          <v-col cols="12" sm="8" md="9">
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              label="Buscar por cédula, nombre, teléfono o correo..."
              density="comfortable"
              variant="outlined"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" sm="4" md="3">
            <v-select
              v-model="filtroEstado"
              :items="['Todos', 'Activo', 'Inactivo']"
              label="Estado"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </v-col>
        </v-row>

        <v-data-table
          :headers="headers"
          :items="clientesFiltrados"
          :search="search"
          :loading="loading"
          item-value="id"
          hover
          class="border rounded-lg mt-4"
        >
          <!-- Cédula -->
          <template #item.cedula="{ item }">
            <span class="font-weight-bold">{{ item.cedula }}</span>
          </template>

          <!-- Nombre Completo con Avatar -->
          <template #item.nombre_completo="{ item }">
            <div class="d-flex align-center py-2">
              <v-avatar size="32" color="primary" variant="tonal" class="mr-3 font-weight-bold text-caption">
                {{ iniciales(item.nombre, item.apellidos) }}
              </v-avatar>
              <div>
                <div class="font-weight-medium">{{ item.nombre }} {{ item.apellidos || '' }}</div>
              </div>
            </div>
          </template>

          <!-- Teléfono -->
          <template #item.telefono="{ item }">
            <span v-if="item.telefono" class="d-flex align-center text-body-2">
              <v-icon size="14" class="mr-1 text-medium-emphasis">mdi-phone-outline</v-icon>
              {{ item.telefono }}
            </span>
            <span v-else class="text-medium-emphasis text-caption">—</span>
          </template>

          <!-- Correo -->
          <template #item.correo="{ item }">
            <span v-if="item.correo" class="d-flex align-center text-body-2">
              <v-icon size="14" class="mr-1 text-medium-emphasis">mdi-email-outline</v-icon>
              {{ item.correo }}
            </span>
            <span v-else class="text-medium-emphasis text-caption">—</span>
          </template>

          <!-- Dirección -->
          <template #item.direccion="{ item }">
            <span v-if="item.direccion" class="text-caption text-truncate d-inline-block" style="max-width: 200px;">
              {{ item.direccion }}
            </span>
            <span v-else class="text-medium-emphasis text-caption">—</span>
          </template>

          <!-- Estado -->
          <template #item.estado="{ item }">
            <v-chip
              :color="item.estado === 'Activo' ? 'success' : 'grey'"
              size="small"
              variant="flat"
              class="font-weight-medium"
            >
              {{ item.estado || 'Activo' }}
            </v-chip>
          </template>

          <!-- Acciones -->
          <template #item.acciones="{ item }">
            <v-btn
              icon="mdi-pencil-outline"
              size="small"
              variant="text"
              color="primary"
              @click="editarCliente(item)"
              class="mr-1"
            />
            <v-btn
              icon="mdi-trash-can-outline"
              size="small"
              variant="text"
              color="error"
              @click="eliminarCliente(item)"
            />
          </template>

          <template #no-data>
            <div class="text-center py-6 text-medium-emphasis">
              No se encontraron clientes registrados.
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- DIÁLOGO NUEVO / EDITAR CLIENTE -->
    <v-dialog v-model="dialog" max-width="600px" persistent>
      <v-card class="rounded-lg">
        <v-card-title class="pa-4 bg-primary text-white d-flex align-center">
          <v-icon class="mr-2">{{ editando ? 'mdi-account-edit' : 'mdi-account-plus' }}</v-icon>
          <span>{{ editando ? 'Editar Cliente' : 'Nuevo Cliente' }}</span>
        </v-card-title>

        <v-card-text class="pt-4">
          <v-row dense>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.cedula"
                label="Cédula / NIT *"
                variant="outlined"
                density="comfortable"
                required
                prepend-inner-icon="mdi-card-account-details-outline"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="form.estado"
                :items="['Activo', 'Inactivo']"
                label="Estado"
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.nombre"
                label="Nombre(s) *"
                variant="outlined"
                density="comfortable"
                required
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.apellidos"
                label="Apellidos"
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.telefono"
                label="Teléfono / Celular"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-phone"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.correo"
                label="Correo Electrónico"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-email"
                type="email"
              />
            </v-col>

            <v-col cols="12">
              <v-text-field
                v-model="form.direccion"
                label="Dirección de Residencia / Despacho"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-map-marker-outline"
              />
            </v-col>
          </v-row>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn
            variant="text"
            color="grey-darken-1"
            @click="dialog = false"
            :disabled="guardando"
            class="text-none"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            @click="guardarCliente"
            :loading="guardando"
            class="text-none font-weight-bold"
          >
            {{ editando ? 'Guardar Cambios' : 'Registrar Cliente' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- NOTIFICACIONES -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="top right">
      {{ snackbar.text }}
    </v-snackbar>
  </v-container>
</template>

<style scoped>
.border {
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
}
</style>
