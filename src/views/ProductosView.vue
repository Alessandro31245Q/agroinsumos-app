<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { perfil } from '../lib/auth'
import { urlImagen } from '../utils/imagen'
import ProductoImagen from '../components/ProductoImagen.vue'

import { guardarEnCache } from '../lib/erpDataCache'

const productos = ref([])
const proveedores = ref([])
const loading = ref(true)
const search = ref('')
const dialog = ref(false)
const editando = ref(false)
const productoEditando = ref(null)   // referencia al objeto del array (para actualizar imagen_url sin recargar)
const snackbar = ref({ show: false, text: '', color: 'success' })

// ─── Columnas y KPIs para Exportación Excel (Desde Caché en Memoria) ────────
const columnasExcel = [
  { header: 'Código', key: 'codigo', width: 14, align: 'center' },
  { header: 'Producto', key: 'nombre', width: 34 },
  { header: 'Categoría', key: 'categoria', width: 20 },
  { header: 'Unidad', key: 'unidad', width: 12, align: 'center' },
  { header: 'Stock Actual', key: 'stock_actual', width: 15, type: 'number', align: 'center', total: 'sum' },
  { header: 'Stock Mínimo', key: 'stock_minimo', width: 15, type: 'number', align: 'center' },
  { header: 'Costo Unitario', key: 'costo_unitario', width: 18, type: 'currency', align: 'right' },
  { header: 'Precio Venta', key: 'precio_venta', width: 18, type: 'currency', align: 'right' },
  { header: 'Valor Inventario', key: 'valor_inventario', width: 20, type: 'currency', align: 'right', total: 'sum' },
  { header: 'Alerta Stock', key: 'alerta', width: 16, align: 'center' },
]

const productosFiltrados = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return productos.value
  return productos.value.filter(p =>
    (p.codigo || '').toLowerCase().includes(q) ||
    (p.nombre || '').toLowerCase().includes(q) ||
    (p.categoria || '').toLowerCase().includes(q)
  )
})

const kpisExcel = computed(() => {
  const totProds = productos.value.length
  const valInv = productos.value.reduce((acc, p) => acc + (Number(p.valor_inventario) || (p.costo_unitario * p.stock_actual) || 0), 0)
  const totStock = productos.value.reduce((acc, p) => acc + (Number(p.stock_actual) || 0), 0)
  const enAlerta = productos.value.filter(p => p.alerta === 'REABASTECER' || p.stock_actual <= p.stock_minimo).length

  return [
    { title: 'Catálogo de Productos', value: totProds, subtext: 'Referencias registradas en memoria' },
    { title: 'Valor Total Inventario', value: `$${valInv.toLocaleString('es-CO')}`, subtext: 'Costo total de existencias' },
    { title: 'Unidades Físicas', value: totStock.toLocaleString('es-CO'), subtext: 'Stock disponible para venta' },
    { title: 'Productos en Alerta', value: enAlerta, subtext: 'Por debajo o igual al stock mínimo' },
  ]
})

const defaultForm = {
  id: null,
  codigo: '',
  nombre: '',
  descripcion: '',
  categoria: '',
  unidad: '',
  costo_unitario: 0,
  precio_venta: 0,
  stock_minimo: 0,
  stock_actual: 0,
  proveedor_id: null,
  estado: 'Activo',
}

const form = ref({ ...defaultForm })

const headers = [
  { title: '', key: 'imagen_url', sortable: false, width: '60px' },
  { title: 'Código', key: 'codigo' },
  { title: 'Producto', key: 'nombre' },
  { title: 'Categoría', key: 'categoria' },
  { title: 'Stock actual', key: 'stock_actual' },
  { title: 'Costo unitario', key: 'costo_unitario' },
  { title: 'Valor inventario', key: 'valor_inventario' },
  { title: 'Alerta', key: 'alerta' },
  { title: '', key: 'acciones', sortable: false },
]

async function cargarProductos() {
  loading.value = true
  
  const { data: provData } = await supabase.from('proveedores').select('id, nombre').order('nombre')
  if (provData) {
    proveedores.value = provData
    guardarEnCache('proveedores', provData)
  }

  // Usamos la vista productos_con_valor: ya trae valor_inventario y alerta calculados
  const { data, error } = await supabase
    .from('productos_con_valor')
    .select('*')
    .order('nombre')

  if (error) {
    mostrarMensaje('Error cargando productos: ' + error.message, 'error')
    loading.value = false
    return
  }

  // La vista fue creada antes de agregar imagen_url, por lo que no la incluye.
  // Hacemos una consulta adicional a la tabla real para obtener ese campo.
  const { data: imgData } = await supabase
    .from('productos')
    .select('id, imagen_url')

  if (imgData) {
    const imgMap = Object.fromEntries(imgData.map(p => [p.id, p.imagen_url]))
    productos.value = data.map(p => ({ ...p, imagen_url: imgMap[p.id] ?? null }))
  } else {
    productos.value = data
  }

  guardarEnCache('productos', productos.value)
  loading.value = false
}

function mostrarMensaje(text, color = 'success') {
  snackbar.value = { show: true, text, color }
}

function nuevoProducto() {
  editando.value = false
  form.value = { ...defaultForm }
  dialog.value = true
}

function editarProducto(producto) {
  editando.value = true
  form.value = { ...producto }
  productoEditando.value = producto   // guardamos referencia al objeto original del array
  dialog.value = true
}

async function guardarProducto() {
  if (!form.value.codigo || !form.value.nombre) {
    mostrarMensaje('Código y nombre son obligatorios', 'error')
    return
  }

  // Excluir campos calculados de la vista (no existen en la tabla `productos`)
  const { id, stock_actual, alerta, valor_inventario, ...payload } = form.value

  if (editando.value) {
    const { error } = await supabase
      .from('productos')
      .update(payload)
      .eq('id', id)

    if (error) {
      mostrarMensaje('Error actualizando: ' + error.message, 'error')
      return
    }
    mostrarMensaje('Producto actualizado')
  } else {
    // Al crear, el stock inicial SÍ se puede fijar directo en productos,
    // pero lo correcto es registrarlo como un movimiento de Entrada para
    // que quede su historial en inventario_movimientos.
    const { data, error } = await supabase
      .from('productos')
      .insert({ ...payload, stock_actual: 0 })
      .select()
      .single()

    if (error) {
      mostrarMensaje('Error creando producto: ' + error.message, 'error')
      return
    }

    if (stock_actual > 0) {
      const { data: docData } = await supabase.rpc('fn_siguiente_documento', { prefijo: 'SI' })
      const { error: movError } = await supabase.from('inventario_movimientos').insert({
        documento: docData,
        tipo: 'Entrada',
        producto_id: data.id,
        cantidad: stock_actual,
        costo_unitario: payload.costo_unitario,
      })
      if (movError) mostrarMensaje('Producto creado, pero falló el stock inicial: ' + movError.message, 'error')
    }

    mostrarMensaje('Producto creado')
  }

  dialog.value = false
  await cargarProductos()
}

function onImagenSubida(uuid) {
  console.log('[ProductosView] imagen subida, uuid:', uuid)
  // 1. Actualizar el form (reactivo → se ve inmediatamente en el diálogo)
  form.value.imagen_url = uuid
  // 2. Actualizar el objeto original del array (persiste al cerrar/abrir)
  if (productoEditando.value) {
    productoEditando.value.imagen_url = uuid
  }
  mostrarMensaje('Imagen actualizada correctamente', 'success')
}

async function eliminarProducto(producto) {
  if (!confirm(`¿Eliminar "${producto.nombre}"? También se borrarán sus movimientos de inventario.`)) return

  // Borra primero los movimientos (equivalente al RemoveIf en cascada que hacíamos en Power Apps)
  await supabase.from('inventario_movimientos').delete().eq('producto_id', producto.id)

  const { error } = await supabase.from('productos').delete().eq('id', producto.id)
  if (error) mostrarMensaje('Error eliminando: ' + error.message, 'error')
  else {
    mostrarMensaje('Producto eliminado')
    await cargarProductos()
  }
}

onMounted(cargarProductos)
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
          Gestión de Productos
        </v-toolbar-title>
        <v-spacer />

        <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="nuevoProducto" class="text-none">
          Nuevo producto
        </v-btn>
      </v-toolbar>

      <v-card-text>
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          label="Buscar producto o código..."
          density="comfortable"
          variant="outlined"
          hide-details
          class="mb-4"
          style="max-width: 400px"
        />

        <v-data-table
          :headers="headers"
          :items="productos"
          :search="search"
          :loading="loading"
          item-value="id"
          hover
          class="border rounded-lg"
        >
          <template #item.imagen_url="{ item }">
            <img
              :src="urlImagen(item.imagen_url, 200)"
              loading="lazy"
              style="width:48px;height:48px;object-fit:cover;border-radius:6px;"
              @error="e => e.target.src = '/placeholder.png'"
            />
          </template>
          <template #item.costo_unitario="{ item }">
            ${{ Number(item.costo_unitario).toLocaleString('es-CO') }}
          </template>
          <template #item.valor_inventario="{ item }">
            ${{ Number(item.valor_inventario).toLocaleString('es-CO') }}
          </template>
          <template #item.alerta="{ item }">
            <v-chip
              :color="item.alerta === 'REABASTECER' ? 'error' : 'success'"
              size="small"
              variant="flat"
              class="font-weight-medium"
            >
              {{ item.alerta }}
            </v-chip>
          </template>
          <template #item.acciones="{ item }">
            <div class="d-flex align-center flex-nowrap">
              <v-btn icon="mdi-pencil" variant="text" size="small" color="primary" class="mr-1" @click="editarProducto(item)"></v-btn>
              <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="eliminarProducto(item)"></v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Diálogo de crear/editar -->
    <v-dialog v-model="dialog" max-width="600" persistent>
      <v-card class="rounded-lg">
        <v-card-title class="bg-primary text-white d-flex align-center px-4 py-3">
          <span class="text-h6">{{ editando ? 'Editar producto' : 'Nuevo producto' }}</span>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" density="comfortable" color="white" @click="dialog = false"></v-btn>
        </v-card-title>
        <v-card-text class="pt-4">
          <v-row dense>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.codigo" label="Código *" :disabled="editando" variant="outlined" density="comfortable" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.categoria" label="Categoría" variant="outlined" density="comfortable" />
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="form.nombre" label="Producto *" variant="outlined" density="comfortable" />
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="form.descripcion" label="Descripción" variant="outlined" density="comfortable" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.unidad" label="Unidad" variant="outlined" density="comfortable" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="form.proveedor_id"
                :items="proveedores"
                item-title="nombre"
                item-value="id"
                label="Proveedor"
                variant="outlined"
                density="comfortable"
                clearable
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
              <v-text-field v-model.number="form.costo_unitario" type="number" label="Costo unitario" variant="outlined" density="comfortable" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model.number="form.precio_venta" type="number" label="Precio venta" variant="outlined" density="comfortable" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model.number="form.stock_minimo" type="number" label="Stock mínimo" variant="outlined" density="comfortable" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="form.stock_actual"
                type="number"
                label="Stock inicial"
                :disabled="editando"
                :hint="editando ? 'Ajustar desde Inventario' : 'Genera un movimiento de Entrada'"
                persistent-hint
                variant="outlined"
                density="comfortable"
              />
            </v-col>
          </v-row>

          <!-- Imagen del producto (solo al editar) -->
          <template v-if="editando">
            <v-divider class="mt-4" />
            <div class="pt-4">
              <p class="text-subtitle-2 mb-3 text-medium-emphasis">Imagen del producto</p>
              <div class="d-flex align-start gap-4 flex-wrap">
                <img
                  :src="urlImagen(form.imagen_url, 800)"
                  style="width:120px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #e0e0e0;"
                  @error="e => { console.warn('[img] Error cargando imagen:', e.target.src); e.target.src = '/placeholder.png' }"
                />
                <div v-if="perfil?.rol === 'admin'">
                  <ProductoImagen
                    :productoId="form.id"
                    :uuid="form.imagen_url"
                    @subida="onImagenSubida"
                  />
                </div>
              </div>
            </div>
          </template>
        </v-card-text>
        <v-divider />
        <v-card-actions class="px-4 py-3">
          <v-spacer />
          <v-btn variant="text" color="grey-darken-1" @click="dialog = false" class="text-none">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" @click="guardarProducto" class="text-none px-4">Guardar</v-btn>
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
