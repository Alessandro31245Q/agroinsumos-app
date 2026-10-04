<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { esAdmin } from '../lib/auth'
import Avatar from '../components/Avatar.vue'

const router = useRouter()

const empleados = ref([])
const loading = ref(true)
const sinPermisos = ref(false)
const snackbar = ref({ show: false, text: '', color: 'success' })

// Paginación real
const pagina = ref(1)
const tamanoPagina = ref(10) // Solo 5 o 10 por página
const opcionesTamano = [5, 10]
const totalRegistros = ref(0)

// Filtros
const busqueda = ref('')
const filtroEstado = ref(null)
const filtroArea = ref(null)
const areasDisponibles = ref([])

const estados = ['Activo', 'Inactivo', 'Retirado']

const headers = [
  { title: '', key: 'avatar', sortable: false, width: '60px' },
  { title: 'Cédula', key: 'cedula' },
  { title: 'Nombre', key: 'nombre_completo' },
  { title: 'Cargo', key: 'cargo' },
  { title: 'Área', key: 'area' },
  { title: 'Estado', key: 'estado' },
  { title: '', key: 'acciones', sortable: false, align: 'end' },
]

const totalPaginas = computed(() => {
  return Math.ceil(totalRegistros.value / tamanoPagina.value) || 1
})

function mostrarMensaje(text, color = 'success') {
  snackbar.value = { show: true, text, color }
}

async function cargarAreas() {
  const { data } = await supabase
    .from('empleados')
    .select('area')
    .not('area', 'is', null)

  if (data) {
    const unicas = [...new Set(data.map((d) => d.area).filter(Boolean))].sort()
    areasDisponibles.value = unicas
  }
}

async function cargarEmpleados() {
  loading.value = true
  sinPermisos.value = false

  // RLS preventivo en el cliente
  if (!esAdmin()) {
    sinPermisos.value = true
    loading.value = false
    return
  }

  const from = (pagina.value - 1) * tamanoPagina.value
  const to = from + tamanoPagina.value - 1

  // Select explícito: SOLO columnas necesarias, NUNCA select('*')
  let query = supabase
    .from('empleados')
    .select('id, nombres, apellidos, cedula, cargo, area, estado', { count: 'exact' })
    .order('nombres', { ascending: true })

  const termino = busqueda.value.trim()
  if (termino) query = query.or(`nombres.ilike.%${termino}%,apellidos.ilike.%${termino}%,cedula.ilike.%${termino}%`)
  
  if (filtroEstado.value) query = query.eq('estado', filtroEstado.value)

  if (filtroArea.value) query = query.eq('area', filtroArea.value)

  query = query.range(from, to)

  const { data, count, error } = await query

  if (error) {
    if (error.code === '42501' || error.message?.toLowerCase().includes('permission') || error.message?.toLowerCase().includes('policy')) sinPermisos.value = true
    else mostrarMensaje('Error al consultar empleados: ' + error.message, 'error')
    empleados.value = []
    totalRegistros.value = 0
  } else {
    empleados.value = data || []
    totalRegistros.value = count || 0
  }

  loading.value = false
}

// Debounce de 300ms para el buscador
let debounceTimer = null
function onBusquedaInput() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    pagina.value = 1
    cargarEmpleados()
  }, 300)
}

function limpiarFiltros() {
  busqueda.value = ''
  filtroEstado.value = null
  filtroArea.value = null
  pagina.value = 1
  cargarEmpleados()
}

watch([filtroEstado, filtroArea, tamanoPagina], () => {
  pagina.value = 1
  cargarEmpleados()
})

watch(pagina, () => {
  cargarEmpleados()
})

function irAlDetalle(id) {
  router.push(`/empleados/${id}`)
}

function irAEditar(id) {
  router.push(`/empleados/${id}/editar`)
}

function irANuevo() {
  router.push('/empleados/nuevo')
}

onMounted(async () => {
  await cargarEmpleados()
  if (!sinPermisos.value) cargarAreas()
  
})
</script>

<template>
  <v-container fluid class="pa-6">
    <!-- Alerta cuando no tiene permisos RLS -->
    <v-card v-if="sinPermisos" elevation="2" class="rounded-lg pa-6 text-center">
      <v-icon color="warning" size="64" class="mb-4">mdi-shield-lock-outline</v-icon>
      <div class="text-h5 font-weight-bold mb-2">Acceso restringido</div>
      <div class="text-body-1 text-medium-emphasis mb-4">
        No tienes permisos para ver este módulo. Solo los administradores pueden gestionar empleados.
      </div>
      <v-btn color="primary" variant="flat" to="/productos" prepend-icon="mdi-arrow-left" class="text-none">
        Ir a Inicio
      </v-btn>
    </v-card>

    <!-- Contenido principal -->
    <v-card v-else elevation="2" class="rounded-lg">
      <v-toolbar color="transparent" flat class="px-2 pt-2">
        <v-toolbar-title class="text-h5 font-weight-bold">
          Gestión de Empleados
        </v-toolbar-title>
        <v-spacer />
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-plus"
          @click="irANuevo"
          class="text-none"
        >
          Nuevo Empleado
        </v-btn>
      </v-toolbar>

      <v-card-text>
        <!-- Barra de filtros -->
        <v-row dense class="mb-4" align="center">
          <v-col cols="12" md="4" sm="6">
            <v-text-field
              v-model="busqueda"
              @update:model-value="onBusquedaInput"
              prepend-inner-icon="mdi-magnify"
              label="Buscar por nombre, apellido o cédula..."
              density="comfortable"
              variant="outlined"
              hide-details
              clearable
              @click:clear="limpiarFiltros"
            />
          </v-col>
          <v-col cols="12" md="3" sm="6">
            <v-select
              v-model="filtroEstado"
              :items="estados"
              label="Filtrar por estado"
              density="comfortable"
              variant="outlined"
              hide-details
              clearable
              prepend-inner-icon="mdi-filter-variant"
            />
          </v-col>
          <v-col cols="12" md="3" sm="6">
            <v-autocomplete
              v-model="filtroArea"
              :items="areasDisponibles"
              label="Filtrar por área"
              density="comfortable"
              variant="outlined"
              hide-details
              clearable
              prepend-inner-icon="mdi-domain"
            />
          </v-col>
          <v-col cols="12" md="2" sm="6" class="d-flex justify-end">
            <!-- Selector de tamaño de página: SOLO 5 o 10 -->
            <v-select
              v-model="tamanoPagina"
              :items="opcionesTamano"
              label="Por página"
              density="comfortable"
              variant="outlined"
              hide-details
              style="max-width: 130px"
              prepend-inner-icon="mdi-format-list-numbered"
            />
          </v-col>
        </v-row>

        <!-- Tabla de empleados con paginación real -->
        <v-data-table
          :headers="headers"
          :items="empleados"
          :loading="loading"
          item-value="id"
          hover
          class="border rounded-lg tabla-empleados"
          no-data-text="No se encontraron empleados"
          items-per-page="-1"
          hide-default-footer
        >
          <!-- Fila clickeable al detalle -->
          <template #item="{ item }">
            <tr
              class="cursor-pointer fila-empleado"
              @click="irAlDetalle(item.id)"
            >
              <td style="width: 60px;">
                <Avatar :nombre="`${item.nombres} ${item.apellidos}`" :size="36" />
              </td>
              <td class="font-weight-medium">
                {{ item.cedula }}
              </td>
              <td class="font-weight-bold">
                {{ item.nombres }} {{ item.apellidos }}
              </td>
              <td>
                {{ item.cargo }}
              </td>
              <td>
                <span v-if="item.area">{{ item.area }}</span>
                <span v-else class="text-medium-emphasis">—</span>
              </td>
              <td>
                <v-chip
                  :color="item.estado === 'Activo' ? 'success' : item.estado === 'Retirado' ? 'error' : 'grey'"
                  size="small"
                  variant="flat"
                  class="font-weight-medium"
                >
                  {{ item.estado }}
                </v-chip>
              </td>
              <td class="text-right">
                <div class="d-flex align-center justify-end" @click.stop>
                  <v-btn
                    icon="mdi-eye-outline"
                    variant="text"
                    size="small"
                    color="primary"
                    title="Ver hoja de vida"
                    @click="irAlDetalle(item.id)"
                  />
                  <v-btn
                    icon="mdi-pencil"
                    variant="text"
                    size="small"
                    color="secondary"
                    title="Editar empleado"
                    @click="irAEditar(item.id)"
                  />
                </div>
              </td>
            </tr>
          </template>
        </v-data-table>

        <!-- Footer con paginación real -->
        <div class="d-flex flex-wrap align-center justify-space-between pt-4 px-2">
          <div class="text-caption text-medium-emphasis">
            Mostrando {{ totalRegistros === 0 ? 0 : (pagina - 1) * tamanoPagina + 1 }} -
            {{ Math.min(pagina * tamanoPagina, totalRegistros) }} de {{ totalRegistros }} empleados
          </div>
          <v-pagination
            v-if="totalPaginas > 1"
            v-model="pagina"
            :length="totalPaginas"
            :total-visible="5"
            density="comfortable"
            color="primary"
          />
        </div>
      </v-card-text>
    </v-card>

    <!-- Snackbar de notificaciones -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3000"
      location="top right"
      elevation="24"
    >
      <div class="d-flex align-center">
        <v-icon class="mr-2">{{ snackbar.color === 'error' ? 'mdi-alert-circle' : 'mdi-check-circle' }}</v-icon>
        {{ snackbar.text }}
      </div>
    </v-snackbar>
  </v-container>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
.fila-empleado:hover {
  background-color: rgba(0, 0, 0, 0.03);
}
</style>
