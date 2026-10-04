<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { enviarCorreosOrdenCompra } from '../lib/emailService'

const proveedores = ref([])
const productos = ref([])
const loading = ref(false)
const enviando = ref(false)
const snackbar = ref({ show: false, text: '', color: 'success' })

// Selección actual
const proveedorSeleccionado = ref(null)
const productoSeleccionado = ref(null)
const cantidadProducto = ref(1)

// Lista de ítems de la orden
const lineas = ref([])

const headersLineas = [
  { title: 'Producto', key: 'producto_nombre' },
  { title: 'Proveedor', key: 'proveedor_nombre' },
  { title: 'Cantidad', key: 'cantidad' },
  { title: 'Costo Unit.', key: 'costo_unitario' },
  { title: 'Subtotal', key: 'subtotal' },
  { title: '', key: 'acciones', sortable: false, align: 'end' },
]

const nitProveedor = computed(() => {
  const p = proveedores.value.find(p => p.id === proveedorSeleccionado.value)
  return p?.nit || ''
})

const productosDelProveedor = computed(() =>
  productos.value.filter(p => p.proveedor_id === proveedorSeleccionado.value)
)

const totalOrden = computed(() =>
  lineas.value.reduce((sum, l) => sum + l.subtotal, 0)
)

function mostrarMensaje(text, color = 'success') {
  snackbar.value = { show: true, text, color }
}

function agregarProducto() {
  if (!productoSeleccionado.value || cantidadProducto.value <= 0) return

  const prod = productos.value.find(p => p.id === productoSeleccionado.value)
  const prov = proveedores.value.find(p => p.id === proveedorSeleccionado.value)
  if (!prod || !prov) return

  const existente = lineas.value.find(l => l.producto_id === prod.id)
  if (existente) {
    existente.cantidad += cantidadProducto.value
    existente.subtotal = existente.cantidad * existente.costo_unitario
  } else {
    lineas.value.push({
      producto_id: prod.id,
      producto_nombre: prod.nombre,
      proveedor_id: prov.id,
      proveedor_nombre: prov.nombre,
      cantidad: cantidadProducto.value,
      costo_unitario: Number(prod.costo_unitario) || 0,
      subtotal: cantidadProducto.value * (Number(prod.costo_unitario) || 0),
    })
  }

  productoSeleccionado.value = null
  cantidadProducto.value = 1
}

function quitarLinea(index) {
  lineas.value.splice(index, 1)
}

async function enviarOrden() {
  if (lineas.value.length === 0) return mostrarMensaje('Agrega al menos un producto', 'error')

  enviando.value = true

  const { data: docData, error: docError } = await supabase.rpc('fn_siguiente_documento', { prefijo: 'OC' })
  if (docError) {
    mostrarMensaje('Error generando documento: ' + docError.message, 'error')
    enviando.value = false
    return
  }

  const movimientos = lineas.value.map(l => ({
    documento: docData,
    tipo: 'Entrada',
    producto_id: l.producto_id,
    cantidad: l.cantidad,
    costo_unitario: l.costo_unitario,
  }))

  const { error } = await supabase.from('inventario_movimientos').insert(movimientos)

  if (error) {
    mostrarMensaje('Error registrando la orden: ' + error.message, 'error')
    enviando.value = false
    return
  }

  // Enviar correos a proveedores desde el servicio modular (usando datos ya en caché)
  try {
    const correosEnviados = await enviarCorreosOrdenCompra({
      documento: docData,
      lineas: lineas.value,
      proveedores: proveedores.value,
    })

    if (correosEnviados > 0) mostrarMensaje(`Orden ${docData} enviada ✓ — ${correosEnviados} correo(s) enviado(s) a proveedores`)
    else mostrarMensaje(`Orden ${docData} registrada. No se enviaron correos (proveedores sin correo registrado)`, 'warning')
  } catch (e) {
    mostrarMensaje(`Orden ${docData} registrada, pero hubo error enviando correos: ${e.message}`, 'warning')
  }

  lineas.value = []
  enviando.value = false
}

async function cargarDatos() {
  loading.value = true
  const [{ data: provData }, { data: prodData }] = await Promise.all([
    supabase.from('proveedores').select('id, nombre, nit, correo').eq('estado', 'Activo').order('nombre'),
    supabase.from('productos').select('id, nombre, costo_unitario, proveedor_id').eq('estado', 'Activo').order('nombre'),
  ])
  if (provData) proveedores.value = provData
  if (prodData) productos.value = prodData
  loading.value = false
}

onMounted(cargarDatos)
</script>

<template>
  <v-container fluid class="pa-6">
    <v-card elevation="2" class="rounded-lg">
      <v-toolbar color="transparent" flat class="px-2 pt-2">
        <v-toolbar-title class="text-h5 font-weight-bold">
          Órdenes de Compra
        </v-toolbar-title>
      </v-toolbar>

      <v-card-text>
        <!-- Selector de proveedor y producto -->
        <v-card variant="outlined" class="rounded-lg pa-4 mb-4">
          <div class="text-subtitle-1 font-weight-bold mb-3">Agregar productos a la orden</div>
          <v-row dense align="end">
            <v-col cols="12" sm="4">
              <v-autocomplete
                v-model="proveedorSeleccionado"
                :items="proveedores"
                item-title="nombre"
                item-value="id"
                label="Proveedor"
                variant="outlined"
                density="comfortable"
                hide-details
                clearable
                prepend-inner-icon="mdi-truck-delivery-outline"
              />
            </v-col>
            <v-col cols="12" sm="2">
              <v-text-field
                :model-value="nitProveedor"
                label="NIT"
                variant="filled"
                density="comfortable"
                hide-details
                disabled
              />
            </v-col>
            <v-col cols="12" sm="3">
              <v-autocomplete
                v-model="productoSeleccionado"
                :items="productosDelProveedor"
                item-title="nombre"
                item-value="id"
                label="Producto"
                variant="outlined"
                density="comfortable"
                hide-details
                clearable
                :disabled="!proveedorSeleccionado"
                prepend-inner-icon="mdi-package-variant"
              />
            </v-col>
            <v-col cols="12" sm="1">
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
                @click="agregarProducto"
                class="text-none"
                style="height: 48px"
              >
                Agregar
              </v-btn>
            </v-col>
          </v-row>
        </v-card>

        <!-- Tabla de líneas de la orden -->
        <v-data-table
          :headers="headersLineas"
          :items="lineas"
          hover
          class="border rounded-lg"
          no-data-text="Aún no has agregado productos a la orden"
        >
          <template #item.costo_unitario="{ item }">
            ${{ Number(item.costo_unitario).toLocaleString('es-CO') }}
          </template>
          <template #item.subtotal="{ item }">
            ${{ Number(item.subtotal).toLocaleString('es-CO') }}
          </template>
          <template #item.acciones="{ item, index }">
            <v-btn icon="mdi-close-circle" size="small" variant="text" color="error" @click="quitarLinea(index)"></v-btn>
          </template>
          <template #bottom>
            <div class="d-flex justify-end align-center pa-4 bg-grey-lighten-4" v-if="lineas.length">
              <span class="text-subtitle-1 font-weight-bold mr-4">
                Total: ${{ totalOrden.toLocaleString('es-CO') }}
              </span>
              <v-btn
                color="success"
                variant="flat"
                prepend-icon="mdi-send"
                :loading="enviando"
                :disabled="lineas.length === 0"
                @click="enviarOrden"
                class="text-none"
              >
                Enviar Orden
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="top right" elevation="24">
      <div class="d-flex align-center">
        <v-icon class="mr-2">{{ snackbar.color === 'error' ? 'mdi-alert-circle' : 'mdi-check-circle' }}</v-icon>
        {{ snackbar.text }}
      </div>
    </v-snackbar>
  </v-container>
</template>
