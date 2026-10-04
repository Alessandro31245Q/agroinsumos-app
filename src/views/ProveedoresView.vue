<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { guardarEnCache } from '../lib/erpDataCache'

const proveedores = ref([])
const loading = ref(true)
const search = ref('')
const dialog = ref(false)
const editando = ref(false)
const snackbar = ref({ show: false, text: '', color: 'success' })

const defaultForm = {
  id: null,
  codigo: '',
  nombre: '',
  nit: '',
  contacto: '',
  telefono: '',
  correo: '',
  ciudad: '',
  estado: 'Activo',
}

const form = ref({ ...defaultForm })

const headers = [
  { title: 'Código', key: 'codigo' },
  { title: 'NIT', key: 'nit' },
  { title: 'Nombre', key: 'nombre' },
  { title: 'Contacto', key: 'contacto' },
  { title: 'Teléfono', key: 'telefono' },
  { title: 'Ciudad', key: 'ciudad' },
  { title: 'Estado', key: 'estado' },
  { title: '', key: 'acciones', sortable: false, align: 'end' },
]

async function cargarProveedores() {
  loading.value = true
  const { data, error } = await supabase.from('proveedores').select('*').order('nombre')
  if (error) return mostrarMensaje('Error cargando proveedores: ' + error.message, 'error')
  proveedores.value = data
  guardarEnCache('proveedores', data)
  loading.value = false
}

function mostrarMensaje(text, color = 'success') {
  snackbar.value = { show: true, text, color }
}

function nuevoProveedor() {
  editando.value = false
  form.value = { ...defaultForm }
  dialog.value = true
}

function editarProveedor(proveedor) {
  editando.value = true
  form.value = { ...proveedor }
  dialog.value = true
}

async function guardarProveedor() {
  if (!form.value.codigo || !form.value.nombre) return mostrarMensaje('El código y el nombre son obligatorios', 'error')

  const { id, created_at, ...payload } = form.value

  const request = editando.value ? supabase.from('proveedores').update(payload).eq('id', id) : supabase.from('proveedores').insert(payload)

  const { error } = await request

  if (error) return mostrarMensaje(`Error ${editando.value ? 'actualizando' : 'creando'}: ${error.message}`, 'error')
  mostrarMensaje(editando.value ? 'Proveedor actualizado' : 'Proveedor creado')
  dialog.value = false
  await cargarProveedores()
}

async function eliminarProveedor(proveedor) {
  if (!confirm(`¿Eliminar al proveedor "${proveedor.nombre}"?`)) return

  const { error } = await supabase.from('proveedores').delete().eq('id', proveedor.id)
  
  if (error) return mostrarMensaje('Error eliminando: ' + error.message, 'error')
  mostrarMensaje('Proveedor eliminado')
  await cargarProveedores()
}

onMounted(cargarProveedores)
</script>

<template>
  <v-container fluid class="pa-6">
    <v-card elevation="2" class="rounded-lg">
      <v-toolbar color="transparent" flat class="px-2 pt-2">
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
          Gestión de Proveedores
        </v-toolbar-title>
        <v-spacer />
        <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="nuevoProveedor" class="text-none">
          Nuevo proveedor
        </v-btn>
      </v-toolbar>

      <v-card-text>
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          label="Buscar proveedor, NIT o código..."
          density="comfortable"
          variant="outlined"
          hide-details
          class="mb-4"
          style="max-width: 400px"
        />

        <v-data-table
          :headers="headers"
          :items="proveedores"
          :search="search"
          :loading="loading"
          item-value="id"
          hover
          class="border rounded-lg"
        >
          <template #item.estado="{ item }">
            <v-chip
              :color="item.estado === 'Activo' ? 'success' : 'grey'"
              size="small"
              variant="flat"
              class="font-weight-medium"
            >
              {{ item.estado }}
            </v-chip>
          </template>
          <template #item.acciones="{ item }">
            <div class="d-flex align-center justify-end flex-nowrap">
              <v-btn icon="mdi-pencil" variant="text" size="small" color="primary" class="mr-1" @click="editarProveedor(item)"></v-btn>
              <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="eliminarProveedor(item)"></v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Diálogo de crear/editar -->
    <v-dialog v-model="dialog" max-width="600" persistent>
      <v-card class="rounded-lg">
        <v-card-title class="bg-primary text-white d-flex align-center px-4 py-3">
          <span class="text-h6">{{ editando ? 'Editar proveedor' : 'Nuevo proveedor' }}</span>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" density="comfortable" color="white" @click="dialog = false"></v-btn>
        </v-card-title>
        <v-card-text class="pt-4">
          <v-row dense>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.codigo" label="Código *" :disabled="editando" variant="outlined" density="comfortable" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.nit" label="NIT" variant="outlined" density="comfortable" />
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="form.nombre" label="Nombre/Razón Social *" variant="outlined" density="comfortable" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.contacto" label="Persona de contacto" variant="outlined" density="comfortable" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.telefono" label="Teléfono" variant="outlined" density="comfortable" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.correo" label="Correo electrónico" type="email" variant="outlined" density="comfortable" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.ciudad" label="Ciudad" variant="outlined" density="comfortable" />
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
          </v-row>
        </v-card-text>
        <v-divider />
        <v-card-actions class="px-4 py-3">
          <v-spacer />
          <v-btn variant="text" color="grey-darken-1" @click="dialog = false" class="text-none">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" @click="guardarProveedor" class="text-none px-4">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="top right" elevation="24">
      <div class="d-flex align-center">
        <v-icon class="mr-2">{{ snackbar.color === 'error' ? 'mdi-alert-circle' : 'mdi-check-circle' }}</v-icon>
        {{ snackbar.text }}
      </div>
    </v-snackbar>
  </v-container>
</template>
