<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../lib/supabase'

import { guardarEnCache } from '../lib/erpDataCache'

const movimientos = ref([])
const loading = ref(true)
const search = ref('')
const filtroTipo = ref('Todos')
const filtroAlerta = ref('Todos')
const snackbar = ref({ show: false, text: '', color: 'success' })

function mostrarMensaje(text, color = 'success') {
  snackbar.value = { show: true, text, color }
}

const headers = [
  { title: 'Fecha', key: 'fecha' },
  { title: 'Documento', key: 'documento' },
  { title: 'Producto', key: 'productos.nombre' },
  { title: 'Tipo', key: 'tipo' },
  { title: 'Cantidad', key: 'cantidad' },
  { title: 'Stock resultante', key: 'stock_resultante' },
  { title: 'Valor movimiento', key: 'valor_movimiento' },
]

// ─── Columnas y KPIs para Exportación Excel (Desde Caché en Memoria) ────────
const columnasExcel = [
  { header: 'Fecha', key: 'fecha', width: 14, align: 'center' },
  { header: 'Documento', key: 'documento', width: 16, align: 'center' },
  {
    header: 'Producto',
    key: 'producto',
    width: 34,
    transform: (val, row) => row.productos?.nombre || 'Producto no identificado'
  },
  { header: 'Tipo Movimiento', key: 'tipo', width: 16, align: 'center' },
  { header: 'Cantidad', key: 'cantidad', width: 14, type: 'number', align: 'center', total: 'sum' },
  { header: 'Stock Resultante', key: 'stock_resultante', width: 16, type: 'number', align: 'center' },
  { header: 'Valor Movimiento', key: 'valor_movimiento', width: 18, type: 'currency', align: 'right', total: 'sum' },
  {
    header: 'Estado Stock',
    key: 'alerta',
    width: 16,
    align: 'center',
    transform: (val, row) => (row.stock_resultante <= (row.productos?.stock_minimo ?? 0) ? 'REABASTECER' : 'OK')
  },
]

const kpisExcel = computed(() => {
  const tot = movimientos.value.length
  const entradas = movimientos.value.filter(m => m.tipo === 'Entrada')
  const salidas = movimientos.value.filter(m => m.tipo === 'Salida')
  const totEntradasCant = entradas.reduce((acc, m) => acc + (Number(m.cantidad) || 0), 0)
  const totSalidasCant = salidas.reduce((acc, m) => acc + (Number(m.cantidad) || 0), 0)
  const enAlerta = totalEnAlerta.value

  return [
    { title: 'Total Movimientos', value: tot, subtext: 'Historial en memoria' },
    { title: 'Unidades Ingresadas', value: totEntradasCant.toLocaleString('es-CO'), subtext: `${entradas.length} entradas registradas` },
    { title: 'Unidades Despachadas', value: totSalidasCant.toLocaleString('es-CO'), subtext: `${salidas.length} salidas registradas` },
    { title: 'Movimientos en Alerta', value: enAlerta, subtext: 'Stock mínimo alcanzado' },
  ]
})

async function cargarMovimientos() {
  loading.value = true
  const { data, error } = await supabase
    .from('inventario_movimientos')
    .select('*, productos(nombre, stock_minimo)')
    .order('fecha', { ascending: false })

  if (!error) {
    movimientos.value = data || []
    guardarEnCache('movimientos', data || [])
  }
  loading.value = false
}

const movimientosFiltrados = computed(() => {
  return movimientos.value.filter((m) => {
    const pasaTipo = filtroTipo.value === 'Todos' || m.tipo === filtroTipo.value
    const alertaMov = m.stock_resultante <= (m.productos?.stock_minimo ?? 0) ? 'REABASTECER' : 'OK'
    const pasaAlerta = filtroAlerta.value === 'Todos' || alertaMov === filtroAlerta.value
    return pasaTipo && pasaAlerta
  })
})

const totalEnAlerta = computed(
  () => movimientos.value.filter((m) => m.stock_resultante <= (m.productos?.stock_minimo ?? 0)).length
)

onMounted(cargarMovimientos)
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
          Gestión de Inventario
        </v-toolbar-title>
        <v-spacer />

      </v-toolbar>

      <v-card-text>
        <v-row class="mb-2 align-center">
          <v-col cols="12" md="4">
            <v-card variant="tonal" color="primary" class="rounded-lg">
              <v-card-text class="d-flex align-center py-3">
                <v-icon size="large" class="mr-3">mdi-swap-horizontal</v-icon>
                <div>
                  <div class="text-caption text-uppercase font-weight-bold">Movimientos</div>
                  <div class="text-h6 font-weight-bold">{{ movimientos.length }}</div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card variant="tonal" color="error" class="rounded-lg">
              <v-card-text class="d-flex align-center py-3">
                <v-icon size="large" class="mr-3">mdi-alert</v-icon>
                <div>
                  <div class="text-caption text-uppercase font-weight-bold">En alerta</div>
                  <div class="text-h6 font-weight-bold">{{ totalEnAlerta }}</div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-row class="mb-2">
          <v-col cols="12" sm="6" md="4">
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              label="Buscar documento o producto..."
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="3" md="4">
            <v-select
              v-model="filtroTipo"
              :items="['Todos', 'Entrada', 'Salida']"
              label="Tipo"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="3" md="4">
            <v-select
              v-model="filtroAlerta"
              :items="['Todos', 'OK', 'REABASTECER']"
              label="Alerta"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </v-col>
        </v-row>

        <v-data-table
          :headers="headers"
          :items="movimientosFiltrados"
          :search="search"
          :loading="loading"
          item-value="id"
          hover
          class="border rounded-lg mt-4"
        >
          <template #item.productos.nombre="{ item }">
            {{ item.productos?.nombre }}
          </template>
          <template #item.tipo="{ item }">
            <v-chip
              :color="item.tipo === 'Entrada' ? 'success' : 'primary'"
              size="small"
              variant="flat"
              class="font-weight-medium"
            >
              {{ item.tipo }}
            </v-chip>
          </template>
          <template #item.valor_movimiento="{ item }">
            ${{ Number(item.valor_movimiento).toLocaleString('es-CO') }}
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="bottom end">
      {{ snackbar.text }}
    </v-snackbar>
  </v-container>
</template>
