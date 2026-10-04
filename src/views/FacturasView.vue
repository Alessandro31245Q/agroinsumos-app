<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../lib/supabase'

import { guardarEnCache, erpCache } from '../lib/erpDataCache'

// ─── Estado ────────────────────────────────────────────────────────────────
const lineasFacturas = ref([])
const clientes = ref([])
const productos = ref([])
const loading = ref(true)
const busqueda = ref('')
const snackbar = ref({ show: false, text: '', color: 'success' })

// Columnas requeridas exactamente según la imagen:
// N.° Factura | Cliente | Producto | Cant. | Vlr. Unit. | Total
const headers = [
  { title: 'N.° Factura', key: 'documento', sortable: true },
  { title: 'Cliente', key: 'cliente_nombre', sortable: true },
  { title: 'Producto', key: 'producto_nombre', sortable: true },
  { title: 'Cant.', key: 'cantidad', align: 'center', sortable: true },
  { title: 'Vlr. Unit.', key: 'precio_unitario', align: 'end', sortable: true },
  { title: 'Total', key: 'subtotal', align: 'end', sortable: true },
]

// ─── Columnas y KPIs para Exportación Excel (Desde Caché en Memoria) ────────
const columnasExcel = [
  { header: 'N.° Factura', key: 'documento', width: 16, align: 'center' },
  {
    header: 'Fecha',
    key: 'fecha',
    width: 14,
    align: 'center',
    transform: (val, row) => val || (row.created_at ? new Date(row.created_at).toLocaleDateString('es-CO') : '—')
  },
  { header: 'Cliente', key: 'cliente_nombre', width: 30 },
  { header: 'Producto', key: 'producto_nombre', width: 32 },
  { header: 'Cantidad', key: 'cantidad', width: 14, type: 'number', align: 'center', total: 'sum' },
  { header: 'Valor Unitario', key: 'precio_unitario', width: 18, type: 'currency', align: 'right' },
  { header: 'Total Item', key: 'subtotal', width: 20, type: 'currency', align: 'right', total: 'sum' },
]

const kpisExcel = computed(() => {
  const totVentas = lineasFacturas.value.reduce((acc, r) => acc + (Number(r.subtotal) || 0), 0)
  const totItems = lineasFacturas.value.reduce((acc, r) => acc + (Number(r.cantidad) || 0), 0)
  const unicosDocs = new Set(lineasFacturas.value.map(r => r.documento).filter(Boolean)).size
  const clientesUnicos = new Set(lineasFacturas.value.map(r => r.cliente_nombre).filter(Boolean)).size

  return [
    { title: 'Total Facturado', value: `$${totVentas.toLocaleString('es-CO')}`, subtext: 'Ventas registradas en caché' },
    { title: 'Total Facturas (FV)', value: unicosDocs, subtext: 'Documentos generados' },
    { title: 'Unidades Vendidas', value: totItems.toLocaleString('es-CO'), subtext: 'Cantidad total de productos' },
    { title: 'Clientes Atendidos', value: clientesUnicos, subtext: 'Clientes únicos con compra' },
  ]
})

// Modal para crear nueva factura (FV)
const dialogNuevaFactura = ref(false)
const guardando = ref(false)
const clienteSeleccionado = ref(null)
const productoSeleccionado = ref(null)
const cantidadProducto = ref(1)
const itemsFactura = ref([])

const headersLineasCrear = [
  { title: 'Producto', key: 'producto_nombre' },
  { title: 'Cant.', key: 'cantidad', align: 'center' },
  { title: 'Vlr. Unit.', key: 'precio_unitario', align: 'end' },
  { title: 'Total', key: 'subtotal', align: 'end' },
  { title: '', key: 'acciones', sortable: false, align: 'end' },
]

function mostrarMensaje(text, color = 'success') {
  snackbar.value = { show: true, text, color }
}

function formatMoneda(valor) {
  return '$' + (Number(valor) || 0).toLocaleString('es-CO')
}

// ─── Carga de datos ────────────────────────────────────────────────────────
async function cargarFacturas() {
  loading.value = true

  // Consultar directamente desde facturas_items: cada fila ya es un ítem plano
  const { data, error } = await supabase
    .from('facturas_items')
    .select(`
      id,
      cantidad,
      precio_unitario,
      subtotal,
      productos ( nombre ),
      facturas (
        documento,
        fecha,
        created_at,
        clientes ( nombre, apellidos, cedula )
      )
    `)

  if (error) {
    mostrarMensaje('Error al cargar facturas: ' + error.message, 'error')
    loading.value = false
    return
  }

  // Mapeo directo y liviano 1 a 1, ordenado por documento/fecha más reciente
  const mapeados = (data || []).map(it => {
    const cli = it.facturas?.clientes
    const nomCliente = cli
      ? `${cli.nombre || ''} ${cli.apellidos || ''}`.trim() || cli.cedula
      : 'Cliente General'

    return {
      id: it.id,
      documento: it.facturas?.documento || '—',
      fecha: it.facturas?.fecha,
      created_at: it.facturas?.created_at,
      cliente_nombre: nomCliente,
      producto_nombre: it.productos?.nombre || 'Producto no identificado',
      cantidad: it.cantidad,
      precio_unitario: it.precio_unitario,
      subtotal: it.subtotal || (it.cantidad * it.precio_unitario),
    }
  })

  // Ordenar descendente (facturas más recientes primero)
  mapeados.sort((a, b) => (b.documento || '').localeCompare(a.documento || ''))

  lineasFacturas.value = mapeados
  guardarEnCache('facturas', mapeados)
  loading.value = false
}

async function cargarCatalogos() {
  const [{ data: clis }, { data: prods }] = await Promise.all([
    supabase.from('clientes').select('id, cedula, nombre, apellidos').eq('estado', 'Activo').order('nombre'),
    supabase.from('productos').select('id, codigo, nombre, precio_venta, stock_actual').eq('estado', 'Activo').gt('stock_actual', 0).order('nombre'),
  ])
  if (clis) {
    clientes.value = clis
    if (!erpCache.clientes || erpCache.clientes.length === 0) {
      guardarEnCache('clientes', clis)
    }
  }
  if (prods) {
    productos.value = prods
    if (!erpCache.productos || erpCache.productos.length === 0) {
      guardarEnCache('productos', prods)
    }
  }
}

// ─── Filtro de búsqueda ───────────────────────────────────────────────────
const lineasFiltradas = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  if (!q) return lineasFacturas.value

  return lineasFacturas.value.filter(item =>
    (item.documento || '').toLowerCase().includes(q) ||
    (item.cliente_nombre || '').toLowerCase().includes(q) ||
    (item.producto_nombre || '').toLowerCase().includes(q)
  )
})

const granTotal = computed(() =>
  lineasFiltradas.value.reduce((acc, row) => acc + (Number(row.subtotal) || 0), 0)
)

// ─── Crear Factura ────────────────────────────────────────────────────────
const productoSeleccionadoData = computed(() =>
  productos.value.find(p => p.id === productoSeleccionado.value) || null
)

const totalNuevaFactura = computed(() =>
  itemsFactura.value.reduce((acc, l) => acc + (Number(l.subtotal) || 0), 0)
)

function abrirDialogoFactura() {
  clienteSeleccionado.value = null
  productoSeleccionado.value = null
  cantidadProducto.value = 1
  itemsFactura.value = []
  dialogNuevaFactura.value = true
}

function agregarItem() {
  const prod = productoSeleccionadoData.value
  if (!prod || cantidadProducto.value <= 0) return

  if (cantidadProducto.value > prod.stock_actual) {
    mostrarMensaje(`Stock insuficiente. Disponible: ${prod.stock_actual}`, 'warning')
    return
  }

  const existente = itemsFactura.value.find(i => i.producto_id === prod.id)
  if (existente) {
    const cantFinal = existente.cantidad + cantidadProducto.value
    if (cantFinal > prod.stock_actual) {
      mostrarMensaje(`Supera el stock actual disponible (${prod.stock_actual})`, 'warning')
      return
    }
    existente.cantidad = cantFinal
    existente.subtotal = existente.cantidad * existente.precio_unitario
  } else {
    const pUnit = Number(prod.precio_venta) || 0
    itemsFactura.value.push({
      producto_id: prod.id,
      producto_nombre: prod.nombre,
      cantidad: cantidadProducto.value,
      precio_unitario: pUnit,
      subtotal: cantidadProducto.value * pUnit,
    })
  }

  productoSeleccionado.value = null
  cantidadProducto.value = 1
}

function quitarItem(idx) {
  itemsFactura.value.splice(idx, 1)
}

async function guardarFactura() {
  if (!clienteSeleccionado.value) {
    mostrarMensaje('Selecciona un cliente para la factura', 'warning')
    return
  }
  if (itemsFactura.value.length === 0) {
    mostrarMensaje('Agrega al menos un producto a la factura', 'warning')
    return
  }

  guardando.value = true

  // 1. Obtener número de documento FV usando la función fn_siguiente_documento
  const { data: numeroDoc, error: errDoc } = await supabase.rpc('fn_siguiente_documento', { prefijo: 'FV' })
  if (errDoc) {
    mostrarMensaje('Error generando documento con fn_siguiente_documento: ' + errDoc.message, 'error')
    guardando.value = false
    return
  }

  // 2. Insertar en tabla facturas
  const { data: factura, error: errFact } = await supabase
    .from('facturas')
    .insert([{
      documento: numeroDoc,
      fecha: new Date().toISOString().split('T')[0],
      cliente_id: clienteSeleccionado.value,
      estado: 'Generada'
    }])
    .select()
    .single()

  if (errFact) {
    mostrarMensaje('Error al registrar factura: ' + errFact.message, 'error')
    guardando.value = false
    return
  }

  // 3. Insertar items en facturas_items (subtotal es columna generada automáticamente)
  const itemsBD = itemsFactura.value.map(i => ({
    factura_id: factura.id,
    producto_id: i.producto_id,
    cantidad: i.cantidad,
    precio_unitario: i.precio_unitario
  }))

  const { error: errItems } = await supabase.from('facturas_items').insert(itemsBD)
  if (errItems) {
    mostrarMensaje('Error guardando los ítems de factura: ' + errItems.message, 'error')
    guardando.value = false
    return
  }

  // 4. Registrar salida en inventario_movimientos
  const movimientos = itemsFactura.value.map(i => ({
    documento: numeroDoc,
    tipo: 'Salida',
    producto_id: i.producto_id,
    cantidad: i.cantidad,
    costo_unitario: i.precio_unitario,
    cliente_id: clienteSeleccionado.value
  }))
  await supabase.from('inventario_movimientos').insert(movimientos)

  mostrarMensaje(`Factura ${numeroDoc} registrada exitosamente ✓`, 'success')
  dialogNuevaFactura.value = false
  guardando.value = false
  await cargarFacturas()
  await cargarCatalogos()
}

onMounted(() => {
  cargarFacturas()
  cargarCatalogos()
})
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
        <v-toolbar-title class="text-h5 font-weight-bold d-flex align-center">
          <v-icon icon="mdi-receipt-text-outline" class="mr-2 text-primary" />
          Facturas Realizadas
        </v-toolbar-title>
        <v-spacer />

        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-plus"
          class="text-none font-weight-bold mr-2"
          @click="abrirDialogoFactura"
        >
          Generar Factura (FV)
        </v-btn>
        <v-btn
          variant="outlined"
          prepend-icon="mdi-refresh"
          :loading="loading"
          class="text-none"
          @click="cargarFacturas"
        >
          Actualizar
        </v-btn>
      </v-toolbar>

      <v-card-text>
        <!-- Barra de búsqueda -->
        <v-row class="mb-3">
          <v-col cols="12" md="6">
            <v-text-field
              v-model="busqueda"
              prepend-inner-icon="mdi-magnify"
              label="Buscar por N.° Factura, Cliente o Producto..."
              density="comfortable"
              variant="outlined"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="6" class="d-flex align-center justify-end">
            <div class="text-subtitle-1">
              Total Acumulado: <span class="text-h6 font-weight-bold text-success">{{ formatMoneda(granTotal) }}</span>
            </div>
          </v-col>
        </v-row>

        <!-- TABLA EXACTA: N.° Factura | Cliente | Producto | Cant. | Vlr. Unit. | Total -->
        <v-data-table
          :headers="headers"
          :items="lineasFiltradas"
          :loading="loading"
          hover
          class="border rounded-lg"
          no-data-text="No hay facturas registradas"
        >
          <!-- N.° Factura -->
          <template #item.documento="{ item }">
            <v-chip color="primary" variant="flat" size="small" class="font-weight-bold">
              {{ item.documento }}
            </v-chip>
          </template>

          <!-- Cliente -->
          <template #item.cliente_nombre="{ item }">
            <span class="font-weight-medium">{{ item.cliente_nombre }}</span>
          </template>

          <!-- Producto -->
          <template #item.producto_nombre="{ item }">
            <span>{{ item.producto_nombre }}</span>
          </template>

          <!-- Cant. -->
          <template #item.cantidad="{ item }">
            <v-chip size="x-small" variant="tonal" class="font-weight-bold">
              {{ item.cantidad }}
            </v-chip>
          </template>

          <!-- Vlr. Unit. -->
          <template #item.precio_unitario="{ item }">
            {{ formatMoneda(item.precio_unitario) }}
          </template>

          <!-- Total -->
          <template #item.subtotal="{ item }">
            <span class="font-weight-bold text-success">
              {{ formatMoneda(item.subtotal) }}
            </span>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Diálogo: Generar Nueva Factura FV -->
    <v-dialog v-model="dialogNuevaFactura" max-width="850px" persistent>
      <v-card class="rounded-xl pa-2">
        <v-card-title class="d-flex align-center justify-space-between pt-3 px-4">
          <div class="d-flex align-center">
            <v-icon icon="mdi-receipt-plus" color="primary" class="mr-2" />
            <span class="text-h6 font-weight-bold">Generar Factura de Venta (FV)</span>
          </div>
          <v-chip color="primary" variant="tonal" size="small" class="font-weight-bold">
            Prefijo: FV
          </v-chip>
        </v-card-title>

        <v-divider class="my-2" />

        <v-card-text class="px-4">
          <!-- Selector de Cliente -->
          <v-row dense class="mb-2">
            <v-col cols="12">
              <v-autocomplete
                v-model="clienteSeleccionado"
                :items="clientes"
                :item-title="c => `${c.cedula} - ${c.nombre} ${c.apellidos || ''}`"
                item-value="id"
                label="Cliente"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-account"
                hide-details
                clearable
              />
            </v-col>
          </v-row>

          <!-- Selector de Producto y Cantidad -->
          <v-card variant="outlined" class="rounded-lg pa-3 my-3">
            <div class="text-subtitle-2 font-weight-bold mb-2 text-primary">Agregar Productos</div>
            <v-row dense align="end">
              <v-col cols="12" sm="5">
                <v-autocomplete
                  v-model="productoSeleccionado"
                  :items="productos"
                  :item-title="p => `${p.codigo} - ${p.nombre} (Stock: ${p.stock_actual})`"
                  item-value="id"
                  label="Producto"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="6" sm="3">
                <v-text-field
                  :model-value="productoSeleccionadoData ? formatMoneda(productoSeleccionadoData.precio_venta) : '$0'"
                  label="Vlr. Unit."
                  variant="filled"
                  density="comfortable"
                  hide-details
                  disabled
                />
              </v-col>
              <v-col cols="6" sm="2">
                <v-text-field
                  v-model.number="cantidadProducto"
                  label="Cant."
                  type="number"
                  min="1"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  :disabled="!productoSeleccionado"
                />
              </v-col>
              <v-col cols="12" sm="2">
                <v-btn
                  color="primary"
                  variant="flat"
                  block
                  prepend-icon="mdi-plus"
                  :disabled="!productoSeleccionado || cantidadProducto <= 0"
                  @click="agregarItem"
                  class="text-none"
                  style="height: 48px"
                >
                  Agregar
                </v-btn>
              </v-col>
            </v-row>
          </v-card>

          <!-- Tabla temporal de ítems para la factura -->
          <v-data-table
            :headers="headersLineasCrear"
            :items="itemsFactura"
            hover
            density="compact"
            class="border rounded-lg"
            no-data-text="Aún no has agregado productos a la factura"
          >
            <template #item.precio_unitario="{ item }">
              {{ formatMoneda(item.precio_unitario) }}
            </template>
            <template #item.subtotal="{ item }">
              <span class="font-weight-bold">{{ formatMoneda(item.subtotal) }}</span>
            </template>
            <template #item.acciones="{ index }">
              <v-btn icon="mdi-delete-outline" size="small" variant="text" color="error" @click="quitarItem(index)" />
            </template>
            <template #bottom>
              <div class="d-flex justify-end align-center pa-3 bg-grey-lighten-4">
                <span class="text-subtitle-1 font-weight-bold mr-2">Total Factura:</span>
                <span class="text-h6 font-weight-bold text-success">{{ formatMoneda(totalNuevaFactura) }}</span>
              </div>
            </template>
          </v-data-table>
        </v-card-text>

        <v-card-actions class="px-4 pb-3 justify-end">
          <v-btn variant="text" @click="dialogNuevaFactura = false" :disabled="guardando" class="text-none">
            Cancelar
          </v-btn>
          <v-btn
            color="success"
            variant="flat"
            prepend-icon="mdi-check-circle"
            :loading="guardando"
            :disabled="!clienteSeleccionado || itemsFactura.length === 0"
            @click="guardarFactura"
            class="text-none font-weight-bold"
          >
            Emitir Factura (FV)
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Notificaciones -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3500" location="top right" elevation="24">
      <div class="d-flex align-center">
        <v-icon class="mr-2">{{ snackbar.color === 'error' ? 'mdi-alert-circle' : 'mdi-check-circle' }}</v-icon>
        {{ snackbar.text }}
      </div>
    </v-snackbar>
  </v-container>
</template>
