<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { guardarEnCache } from '../lib/erpDataCache'

const activos = ref([])
const loading = ref(true)
const search = ref('')

const dialog = ref(false)
const valid = ref(false)
const dialogDelete = ref(false)

const itemDefault = {
  codigo: '',
  nombre: '',
  area: '',
  fecha_compra: '',
  costo_historico: 0,
  vida_util_anios: 1,
  valor_residual: 0,
  estado: 'Activo'
}

const item = ref({ ...itemDefault })
const itemAEditar = ref(null)

const headers = [
  { title: 'Código', key: 'codigo' },
  { title: 'Nombre', key: 'nombre' },
  { title: 'Área', key: 'area' },
  { title: 'Compra', key: 'fecha_compra' },
  { title: 'Costo', key: 'costo_historico' },
  { title: 'Vida (años)', key: 'vida_util_anios' },
  { title: 'Depr. Mes', key: 'depreciacion_mensual' },
  { title: 'Valor Libros', key: 'valor_en_libros' },
  { title: 'Estado', key: 'estado' },
  { title: 'Acciones', key: 'acciones', sortable: false, align: 'end' }
]

const activosCalculados = computed(() => {
  return activos.value.map(a => calcularValoresActivo(a))
})

function calcularValoresActivo(a) {
  const costo = Number(a.costo_historico) || 0
  const residual = costo * 0.10
  const vidaUtilMeses = (Number(a.vida_util_anios) || 1) * 12
  const depreciacionMensual = (costo - residual) / vidaUtilMeses

  const mesesTranscurridos = a.fecha_compra
    ? Math.min(Math.max(calcularMeses(a.fecha_compra), 0), vidaUtilMeses)
    : 0

  const depreciacionAcumulada = depreciacionMensual * mesesTranscurridos

  return {
    ...a,
    valor_residual: residual,
    meses_transcurridos: mesesTranscurridos,
    depreciacion_mensual: depreciacionMensual,
    depreciacion_acumulada: depreciacionAcumulada,
    valor_en_libros: costo - depreciacionAcumulada,
  }
}

function calcularMeses(fechaCompra) {
  const desde = new Date(fechaCompra)
  const hoy = new Date()
  return (hoy.getFullYear() - desde.getFullYear()) * 12 + hoy.getMonth() - desde.getMonth()
}

const itemCalculado = computed(() => calcularValoresActivo(item.value))

async function cargarActivos() {
  loading.value = true
  const { data } = await supabase.from('activos_fijos').select('*').order('created_at', { ascending: false })
  if (data) {
    activos.value = data
    guardarEnCache('activos_fijos', data)
  }
  loading.value = false
}

function abrirDialogo(activo = null) {
  itemAEditar.value = activo
  item.value = activo ? { ...activo } : { ...itemDefault }
  dialog.value = true
}

async function guardar() {
  if (!valid.value) return

  const { codigo, nombre, area, fecha_compra, costo_historico, vida_util_anios, estado } = item.value
  const payload = {
    codigo, nombre, area, fecha_compra, costo_historico, vida_util_anios, estado,
    valor_residual: (Number(costo_historico) || 0) * 0.10,
  }

  const query = itemAEditar.value
    ? supabase.from('activos_fijos').update(payload).eq('id', itemAEditar.value.id)
    : supabase.from('activos_fijos').insert([payload])

  const { error } = await query
  if (error) return alert(error.message)

  dialog.value = false
  cargarActivos()
}

function confirmarEliminar(activo) {
  itemAEditar.value = activo
  dialogDelete.value = true
}

async function eliminar() {
  const { error } = await supabase.from('activos_fijos').delete().eq('id', itemAEditar.value.id)

  if (error) {
    alert(error.message)
    return
  }

  dialogDelete.value = false
  await cargarActivos()
}

onMounted(cargarActivos)
</script>

<template>
  <v-container fluid class="pa-6">
    <v-card elevation="2" class="rounded-lg">
      <v-toolbar color="transparent" flat class="px-2 pt-2">
        <v-toolbar-title class="text-h5 font-weight-bold">
          Gestión de Activos Fijos
        </v-toolbar-title>
        <v-spacer />
        <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="abrirDialogo()">
          Nuevo Activo
        </v-btn>
      </v-toolbar>

      <v-card-text>
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          label="Buscar activo..."
          density="comfortable"
          variant="outlined"
          hide-details
          class="mb-4"
        />

        <v-data-table
          :headers="headers"
          :items="activosCalculados"
          :search="search"
          :loading="loading"
          hover
          class="border rounded-lg"
        >
          <template #item.costo_historico="{ item }">
            ${{ Number(item.costo_historico).toLocaleString('es-CO') }}
          </template>
          <template #item.depreciacion_mensual="{ item }">
            ${{ Number(item.depreciacion_mensual).toLocaleString('es-CO', { maximumFractionDigits: 0 }) }}
          </template>
          <template #item.valor_en_libros="{ item }">
            ${{ Number(item.valor_en_libros).toLocaleString('es-CO', { maximumFractionDigits: 0 }) }}
          </template>
          <template #item.estado="{ item }">
            <v-chip
              :color="item.estado === 'Activo' ? 'success' : (item.estado === 'De baja' ? 'error' : 'warning')"
              size="small"
              variant="flat"
              class="font-weight-medium"
            >
              {{ item.estado }}
            </v-chip>
          </template>
          <template  #item.acciones="{ item }">
            <div class="d-flex flex-nowrap align-center">
            <v-btn icon="mdi-pencil" size="small" variant="text" color="primary" @click="abrirDialogo(item)"></v-btn>
            <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="confirmarEliminar(item)"></v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <v-dialog v-model="dialog" max-width="800">
      <v-card>
        <v-card-title class="pa-4 bg-primary text-white d-flex align-center">
          {{ itemAEditar ? 'Editar Activo' : 'Nuevo Activo' }}
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" @click="dialog = false" color="white"></v-btn>
        </v-card-title>
        <v-card-text class="pa-4">
          <v-form v-model="valid" @submit.prevent="guardar">
            <v-row>
              <v-col cols="12" md="4">
                <v-text-field v-model="item.codigo" label="Código" :rules="[v => !!v || 'Requerido']" variant="outlined" density="comfortable" />
              </v-col>
              <v-col cols="12" md="8">
                <v-text-field v-model="item.nombre" label="Nombre" :rules="[v => !!v || 'Requerido']" variant="outlined" density="comfortable" />
              </v-col>
              
              <v-col cols="12" md="6">
                <v-text-field v-model="item.area" label="Área" variant="outlined" density="comfortable" />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="item.fecha_compra" label="Fecha Compra" type="date" :rules="[v => !!v || 'Requerido']" variant="outlined" density="comfortable" />
              </v-col>

              <v-col cols="12" md="4">
                <v-text-field v-model="item.costo_historico" label="Costo Histórico" type="number" prefix="$" :rules="[v => !!v || 'Requerido']" variant="outlined" density="comfortable" />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field v-model="item.vida_util_anios" label="Vida Útil (Años)" type="number" :rules="[v => !!v || 'Requerido']" variant="outlined" density="comfortable" />
              </v-col>
              <v-col cols="12" md="4">
                <v-select v-model="item.estado" :items="['Activo', 'En mantenimiento', 'De baja']" label="Estado" variant="outlined" density="comfortable" />
              </v-col>
            </v-row>

            <v-divider class="my-4"></v-divider>
            <div class="text-subtitle-1 font-weight-bold mb-2">Cálculos Automáticos</div>
            <v-row>
              <v-col cols="12" md="4">
                <v-text-field
                  :model-value="Number(itemCalculado.valor_residual).toLocaleString('es-CO', { maximumFractionDigits: 0 })"
                  label="Valor Residual (10%)"
                  prefix="$"
                  variant="filled"
                  density="comfortable"
                  disabled
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  :model-value="Number(itemCalculado.depreciacion_mensual).toLocaleString('es-CO', { maximumFractionDigits: 0 })"
                  label="Depreciación Mensual"
                  prefix="$"
                  variant="filled"
                  density="comfortable"
                  disabled
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  :model-value="itemCalculado.meses_transcurridos"
                  label="Meses Transcurridos"
                  variant="filled"
                  density="comfortable"
                  disabled
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  :model-value="Number(itemCalculado.depreciacion_acumulada).toLocaleString('es-CO', { maximumFractionDigits: 0 })"
                  label="Deprec. Acumulada"
                  prefix="$"
                  variant="filled"
                  density="comfortable"
                  disabled
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  :model-value="Number(itemCalculado.valor_en_libros).toLocaleString('es-CO', { maximumFractionDigits: 0 })"
                  label="Valor en Libros"
                  prefix="$"
                  variant="filled"
                  density="comfortable"
                  disabled
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn color="grey" variant="text" @click="dialog = false">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" :disabled="!valid" @click="guardar">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialogDelete" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Confirmar Eliminación</v-card-title>
        <v-card-text>¿Estás seguro de que deseas eliminar este activo?</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="grey" variant="text" @click="dialogDelete = false">Cancelar</v-btn>
          <v-btn color="error" variant="flat" @click="eliminar">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
