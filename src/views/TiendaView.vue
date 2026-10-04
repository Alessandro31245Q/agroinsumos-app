<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { erpCache } from '../lib/erpDataCache'
import { urlImagen } from '../utils/imagen'
import { sendEmail } from '../lib/emailService'

// ─── Correo de confirmación al cliente ──────────────────────────────────────
function generarHtmlFacturaCliente({ cliente, documento, fecha, items, total }) {
  const fechaFormato = new Date(fecha + 'T12:00:00').toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const formatCOP = v => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v ?? 0)

  const filas = items.map((it, i) => `
    <tr style="${i % 2 === 0 ? 'background:#FFF8F5;' : 'background:#ffffff;'}">
      <td style="padding:12px 18px;border-bottom:1px solid #F0E8E0;color:#3D2B1F;font-size:14px;">${it.nombre}</td>
      <td style="padding:12px 18px;border-bottom:1px solid #F0E8E0;color:#3D2B1F;font-size:14px;text-align:center;">${it.cantidad}</td>
      <td style="padding:12px 18px;border-bottom:1px solid #F0E8E0;color:#3D2B1F;font-size:14px;text-align:right;">${formatCOP(it.precio_venta)}</td>
      <td style="padding:12px 18px;border-bottom:1px solid #F0E8E0;color:#C86236;font-size:14px;text-align:right;font-weight:700;">${formatCOP(it.cantidad * (it.precio_venta ?? 0))}</td>
    </tr>`).join('')

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F5F0EA;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0EA;padding:40px 0;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="background:#FAF9F6;border-radius:4px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Cabecera terracota -->
        <tr><td style="background:linear-gradient(135deg,#C86236 0%,#A04A24 100%);padding:40px;text-align:center;">
          <h1 style="color:#ffffff;font-size:28px;margin:0 0 6px;font-family:Georgia,serif;font-weight:700;">Agroinsumos del Huila</h1>
          <p style="color:rgba(255,255,255,0.85);font-size:13px;letter-spacing:2px;margin:0;">TIENDA EN LÍNEA · CAMPO &amp; COSECHA</p>
        </td></tr>

        <!-- Título factura -->
        <tr><td style="padding:32px 40px 0;">
          <p style="color:#888;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 4px;">Confirmación de Pedido</p>
          <h2 style="color:#1A1A1A;font-family:Georgia,serif;font-size:22px;margin:0 0 4px;">${documento}</h2>
          <p style="color:#999;font-size:13px;margin:0;">${fechaFormato}</p>
        </td></tr>

        <!-- Datos del cliente -->
        <tr><td style="padding:24px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8F5;border:1px solid #F0E0D6;border-radius:4px;">
            <tr><td style="padding:20px 24px;">
              <p style="color:#C86236;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin:0 0 8px;">Datos del Cliente</p>
              <p style="color:#1A1A1A;font-size:15px;font-weight:600;margin:0 0 4px;">${cliente}</p>
            </td></tr>
          </table>
        </td></tr>

        <!-- Tabla de productos -->
        <tr><td style="padding:0 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:4px;overflow:hidden;border:1px solid #E8DDD5;">
            <thead>
              <tr>
                <th style="background:#1A1A1A;color:#fff;padding:13px 18px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Producto</th>
                <th style="background:#1A1A1A;color:#fff;padding:13px 18px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Cant.</th>
                <th style="background:#1A1A1A;color:#fff;padding:13px 18px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Precio</th>
                <th style="background:#1A1A1A;color:#fff;padding:13px 18px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>
        </td></tr>

        <!-- Total -->
        <tr><td style="padding:20px 40px 0;text-align:right;">
          <table cellpadding="0" cellspacing="0" style="display:inline-table;">
            <tr style="background:#C86236;">
              <td style="padding:14px 24px;color:#fff;font-size:15px;font-weight:700;font-family:Georgia,serif;border-radius:4px 0 0 4px;">TOTAL</td>
              <td style="padding:14px 24px;color:#fff;font-size:18px;font-weight:700;border-radius:0 4px 4px 0;">${formatCOP(total)}</td>
            </tr>
          </table>
        </td></tr>

        <!-- Mensaje de cierre -->
        <tr><td style="padding:32px 40px 20px;">
          <p style="color:#666;font-size:14px;line-height:1.6;margin:0;">
            Gracias por confiar en <strong style="color:#C86236;">Agroinsumos del Huila</strong>. Tu pedido ha sido registrado y pronto nos pondremos en contacto para coordinar la entrega.
          </p>
          <p style="color:#666;font-size:14px;line-height:1.6;margin:12px 0 0;">Cordialmente,<br><strong style="color:#1A1A1A;">Equipo Agroinsumos</strong></p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#1A1A1A;padding:20px 40px;text-align:center;">
          <p style="color:#888;font-size:12px;margin:0;">Correo generado automáticamente · No responder a este mensaje</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`
}

// ─── Estado ────────────────────────────────────────────────────────────────
const productos     = ref([])
const cargando      = ref(true)
const busqueda      = ref('')
const categoriaActiva = ref('Todos')
const vistaActual   = ref('INICIO') // 'INICIO' o 'CATALOGO'
const carrito       = ref([])
const drawerCarrito = ref(false)
const productoDetalle = ref(null)
const dialogDetalle = ref(false)
const snackbar      = ref({ show: false, text: '', color: 'success' })

// Filtro de precio
const maxPrecioFiltro = ref(2000000)
const maxPrecioPosible = computed(() => {
  if (productos.value.length === 0) return 2000000
  return Math.max(...productos.value.map(p => p.precio_venta || 0))
})

// Ordenamiento
const ordenOpciones = [
  { title: 'Nombre A–Z',     value: 'nombre_asc'   },
  { title: 'Nombre Z–A',     value: 'nombre_desc'  },
  { title: 'Menor precio',   value: 'precio_asc'   },
  { title: 'Mayor precio',   value: 'precio_desc'  }
]
const ordenSeleccionado = ref('nombre_asc')

// ─── Carga ──────────────────────────────────────────────────────────────────
async function cargarProductos() {
  cargando.value = true

  const { data, error } = await supabase
    .from('productos')
    .select('id, codigo, nombre, descripcion, categoria, unidad, precio_venta, costo_unitario, stock_minimo, stock_actual, imagen_url, estado')
    .eq('estado', 'Activo')
    .gt('stock_actual', 0)

  if (!error && data) {
    productos.value = data
  } else if (error) {
    console.error('Error al cargar productos en tienda:', error)
  }

  maxPrecioFiltro.value = maxPrecioPosible.value
  cargando.value = false
}

// ─── Categorías ─────────────────────────────────────────────────────────────
const categorias = computed(() => {
  const cats = [...new Set(productos.value.map(p => p.categoria || 'General').filter(Boolean))]
  return ['Todos', ...cats.sort()]
})

// ─── Productos filtrados y ordenados ────────────────────────────────────────
const productosFiltrados = computed(() => {
  let lista = [...productos.value]

  // Filtro categoría
  if (categoriaActiva.value !== 'Todos') {
    lista = lista.filter(p => (p.categoria || 'General') === categoriaActiva.value)
  }

  // Filtro búsqueda
  const q = busqueda.value.trim().toLowerCase()
  if (q) {
    lista = lista.filter(p =>
      (p.nombre || '').toLowerCase().includes(q) ||
      (p.codigo || '').toLowerCase().includes(q) ||
      (p.descripcion || '').toLowerCase().includes(q)
    )
  }
  
  // Filtro precio
  lista = lista.filter(p => (p.precio_venta || 0) <= maxPrecioFiltro.value)

  // Orden
  const [campo, dir] = ordenSeleccionado.value.split('_')
  lista.sort((a, b) => {
    let va, vb
    if (campo === 'nombre')  { va = a.nombre || '';       vb = b.nombre || '' }
    if (campo === 'precio')  { va = a.precio_venta ?? 0;  vb = b.precio_venta ?? 0 }
    if (campo === 'stock')   { va = a.stock_actual ?? 0;  vb = b.stock_actual ?? 0 }
    if (typeof va === 'string') return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    return dir === 'asc' ? va - vb : vb - va
  })

  return lista
})

const insumosDestacados = computed(() => {
  // Solo devolvemos 4 productos como destacados
  return [...productos.value].sort(() => 0.5 - Math.random()).slice(0, 4)
})

// ─── Carrito ────────────────────────────────────────────────────────────────
const totalItems = computed(() => carrito.value.reduce((s, i) => s + i.cantidad, 0))

const totalPrecio = computed(() =>
  carrito.value.reduce((s, i) => s + i.cantidad * (i.precio_venta ?? i.costo_unitario ?? 0), 0)
)

function agregarAlCarrito(producto) {
  const existe = carrito.value.find(i => i.id === producto.id)
  if (existe) {
    if (existe.cantidad >= producto.stock_actual) {
      mostrarMensaje(`Stock máximo disponible: ${producto.stock_actual} ${producto.unidad || 'uds'}`, 'warning')
      return
    }
    existe.cantidad++
  } else {
    carrito.value.push({ ...producto, cantidad: 1 })
  }
  mostrarMensaje(`${producto.nombre} agregado al carrito`, 'success')
}

function quitarUno(item) {
  const idx = carrito.value.findIndex(i => i.id === item.id)
  if (idx === -1) return
  if (carrito.value[idx].cantidad > 1) {
    carrito.value[idx].cantidad--
  } else {
    carrito.value.splice(idx, 1)
  }
}

function eliminarDelCarrito(item) {
  carrito.value = carrito.value.filter(i => i.id !== item.id)
}

function vaciarCarrito() {
  carrito.value = []
  drawerCarrito.value = false
}

function estaEnCarrito(id) {
  return carrito.value.some(i => i.id === id)
}

function cantidadEnCarrito(id) {
  return carrito.value.find(i => i.id === id)?.cantidad ?? 0
}

// ─── Detalle ─────────────────────────────────────────────────────────────────
function verDetalle(producto) {
  productoDetalle.value = producto
  dialogDetalle.value = true
}

// ─── Utils ──────────────────────────────────────────────────────────────────
function mostrarMensaje(text, color = 'success') {
  snackbar.value = { show: true, text, color }
}

function formatPrecio(valor) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor ?? 0)
}

function getProductImage(cat) {
    const mapa = {
    'fertilizante': 'https://images.unsplash.com/photo-1627922248530-58ce3e7e39fc?auto=format&fit=crop&q=80&w=400',
    'herbicida':    'https://images.unsplash.com/photo-1584346808077-744047f3b890?auto=format&fit=crop&q=80&w=400',
    'insecticida':  'https://images.unsplash.com/photo-1631526461942-0f0bf421e427?auto=format&fit=crop&q=80&w=400',
    'fungicida':    'https://images.unsplash.com/photo-1590682680695-43b964a3ae17?auto=format&fit=crop&q=80&w=400',
    'semilla':      'https://images.unsplash.com/photo-1587049352847-4d45543bb352?auto=format&fit=crop&q=80&w=400',
    'herramienta':  'https://images.unsplash.com/photo-1416879598555-25e24c6dd3ce?auto=format&fit=crop&q=80&w=400',
    'equipo':       'https://images.unsplash.com/photo-1605600659928-86d1ff8f9445?auto=format&fit=crop&q=80&w=400',
    'abono':        'https://images.unsplash.com/photo-1592982537447-6f296c0b39cc?auto=format&fit=crop&q=80&w=400',
  }
  const key = (cat || '').toLowerCase()
  for (const [k, v] of Object.entries(mapa)) {
    if (key.includes(k)) return v
  }
  return 'https://images.unsplash.com/photo-1598902582963-71887e28b2db?auto=format&fit=crop&q=80&w=400'
}

/**
 * Devuelve la URL correcta para la imagen de un producto:
 * 1. Si tiene imagen_url (UUID de Uploadcare) → CDN optimizado
 * 2. Si no → imagen genérica por categoría (Unsplash)
 */
function imagenProducto(producto) {
  if (producto?.imagen_url) return urlImagen(producto.imagen_url, 400)
  return getProductImage(producto?.categoria)
}

function cambiarCategoria(cat) {
  categoriaActiva.value = cat;
  vistaActual.value = 'CATALOGO';
}

// ─── Checkout / Finalizar Pedido ──────────────────────────────────────────
const dialogCheckout = ref(false)
const procesandoPedido = ref(false)
const pedidoExitoso = ref(null)
const buscandoCliente = ref(false)
const clienteEncontrado = ref(false)

const formCliente = ref({
  cedula: '',
  nombre: '',
  apellidos: '',
  telefono: '',
  correo: '',
  direccion: '',
})

// Debounce para autocompletar mientras el usuario escribe la cédula
let timerBuscarCedula = null
function onCedulaInput() {
  clienteEncontrado.value = false
  if (timerBuscarCedula) clearTimeout(timerBuscarCedula)
  const val = formCliente.value.cedula?.trim()
  if (val && val.length >= 6) {
    timerBuscarCedula = setTimeout(() => {
      autocompletarPorCedula()
    }, 450)
  }
}

// Busca si ya existe un cliente con esa cédula y rellena el formulario
async function autocompletarPorCedula() {
  const cedula = formCliente.value.cedula?.trim()
  if (!cedula) return

  buscandoCliente.value = true
  clienteEncontrado.value = false

  try {
    let data = null

    // 1. Intentar por RPC SECURITY DEFINER (para cuando el visitante es anónimo y RLS restringe la tabla)
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('fn_buscar_cliente_tienda', { p_cedula: cedula })
      if (!rpcErr && rpcData) {
        data = Array.isArray(rpcData) ? (rpcData[0] || null) : rpcData
      }
    } catch (_) {}

    // 2. Si no retornó por RPC, consultar directo a la tabla clientes
    if (!data) {
      const { data: dbData, error } = await supabase
        .from('clientes')
        .select('cedula, nombre, apellidos, telefono, correo, direccion')
        .eq('cedula', cedula)
        .maybeSingle()

      if (!error && dbData) {
        data = dbData
      }
    }

    // 2. Si no se encontró por API directa, buscar si está en el caché en memoria
    if (!data && erpCache?.clientes?.length) {
      data = erpCache.clientes.find(c => String(c.cedula).trim() === cedula)
    }

    if (data) {
      // Cliente existente: prellenar campos
      formCliente.value.nombre    = data.nombre    || formCliente.value.nombre
      formCliente.value.apellidos = data.apellidos || formCliente.value.apellidos
      formCliente.value.telefono  = data.telefono  || formCliente.value.telefono
      formCliente.value.correo    = data.correo    || formCliente.value.correo
      formCliente.value.direccion = data.direccion || formCliente.value.direccion
      clienteEncontrado.value = true
      mostrarMensaje(`Cliente encontrado: ${data.nombre} ${data.apellidos || ''}`.trim(), 'info')
    } else {
      // No existe o es cliente nuevo
      clienteEncontrado.value = false
    }
  } catch (err) {
    console.error('Error al autocompletar cliente por cédula:', err)
  } finally {
    buscandoCliente.value = false
  }
}

function abrirCheckout() {
  if (carrito.value.length === 0) {
    mostrarMensaje('Tu carrito está vacío', 'warning')
    return
  }
  drawerCarrito.value = false
  dialogCheckout.value = true
}

async function procesarFacturacionTienda() {
  const c = formCliente.value
  if (!c.cedula?.trim() || !c.nombre?.trim()) {
    mostrarMensaje('La cédula y el nombre son obligatorios', 'warning')
    return
  }

  procesandoPedido.value = true

  try {
    // 1. Registrar/actualizar cliente via función SECURITY DEFINER (evita bloqueos de RLS)
    const { data: clienteId, error: errCli } = await supabase.rpc('fn_upsert_cliente_tienda', {
      p_cedula:    c.cedula.trim(),
      p_nombre:    c.nombre.trim(),
      p_apellidos: c.apellidos?.trim() || null,
      p_telefono:  c.telefono?.trim()  || null,
      p_correo:    c.correo?.trim()    || null,
      p_direccion: c.direccion?.trim() || null,
    })

    if (errCli || !clienteId) {
      throw new Error(errCli ? errCli.message : 'No se pudo registrar el cliente.')
    }

    // 2. Obtener siguiente número de factura
    const { data: numeroDoc, error: errDoc } = await supabase.rpc('fn_siguiente_documento', { prefijo: 'FV' })
    if (errDoc) {
      throw new Error('Error generando número de factura: ' + errDoc.message)
    }

    // 3-5. Insertar factura, ítems y movimientos via función SECURITY DEFINER
    const itemsPayload = carrito.value.map(item => ({
      producto_id:     item.id,
      cantidad:        item.cantidad,
      precio_unitario: Number(item.precio_venta) || 0,
    }))

    const { error: errPedido } = await supabase.rpc('fn_procesar_pedido_tienda', {
      p_cliente_id:     clienteId,
      p_numero_factura: numeroDoc,
      p_items:          itemsPayload,
    })

    if (errPedido) {
      throw new Error('Error registrando el pedido: ' + errPedido.message)
    }

    // Guardar resumen del pedido exitoso
    const nombreCliente = `${c.nombre} ${c.apellidos || ''}`.trim()
    pedidoExitoso.value = {
      documento: numeroDoc,
      cliente: nombreCliente,
      total: totalPrecio.value,
      items: [...carrito.value]
    }

    // Enviar correo de confirmación al cliente (si proporcionó email)
    if (c.correo?.trim()) {
      try {
        const htmlCorreo = generarHtmlFacturaCliente({
          cliente: nombreCliente,
          documento: numeroDoc,
          fecha: new Date().toISOString().split('T')[0],
          items: carrito.value,
          total: totalPrecio.value,
        })
        await sendEmail({
          destinatarios: [c.correo.trim()],
          asunto: `Confirmación de Pedido ${numeroDoc} — Agroinsumos del Huila`,
          html: htmlCorreo,
        })
      } catch (emailErr) {
        // El correo falla en silencio: el pedido ya quedó registrado
        console.warn('No se pudo enviar el correo de confirmación:', emailErr.message)
      }
    }

    mostrarMensaje(`¡Pedido y Factura ${numeroDoc} registrados con éxito!`, 'success')
    vaciarCarrito()
    await cargarProductos() // Refrescar stock de la tienda
  } catch (error) {
    mostrarMensaje(error.message, 'error')
  } finally {
    procesandoPedido.value = false
  }
}

function cerrarDialogoExito() {
  dialogCheckout.value = false
  pedidoExitoso.value = null
  clienteEncontrado.value = false
  formCliente.value = {
    cedula: '',
    nombre: '',
    apellidos: '',
    telefono: '',
    correo: '',
    direccion: '',
  }
}

onMounted(cargarProductos)
</script>

<template>
  <div class="skyline-wrapper">
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">

    <!-- HEADER / NAVBAR -->
    <header class="skyline-header">
      <div class="header-top-utils">
        <v-btn variant="text" size="small" class="util-link text-none" to="/erp">Ir al Sistema ERP</v-btn>
      </div>
      
      <div class="brand-container">
        <h1 class="brand-title">Agroinsumos del Huila</h1>
        <p class="brand-subtitle">TIENDA EN LÍNEA · CAMPO & COSECHA</p>
      </div>
      
      <nav class="skyline-nav">
        <ul class="nav-links">
          <li><a href="#" :class="{ active: vistaActual === 'INICIO' }" @click.prevent="vistaActual = 'INICIO'">INICIO</a></li>
          <li class="separator">|</li>
          <li><a href="#" :class="{ active: vistaActual === 'CATALOGO' && categoriaActiva === 'Todos' }" @click.prevent="cambiarCategoria('Todos')">CATÁLOGO COMPLETO</a></li>
          <template v-for="(cat, idx) in categorias.filter(c => c !== 'Todos')" :key="cat">
            <li class="separator">|</li>
            <li><a href="#" :class="{ active: categoriaActiva === cat && vistaActual === 'CATALOGO' }" @click.prevent="cambiarCategoria(cat)">{{ cat.toUpperCase() }}</a></li>
          </template>
          <li class="separator">|</li>
          <li><a href="#" @click.prevent="drawerCarrito = true" class="cart-link">CARRITO ({{ totalItems }})</a></li>
        </ul>
      </nav>
    </header>

    <!-- INICIO VIEW -->
    <main v-if="vistaActual === 'INICIO'" class="view-inicio">
      <!-- HERO BANNER -->
      <section class="hero-section">
        <div class="hero-watermark">COSECHA</div>
        <div class="hero-content">
          <span class="hero-eyebrow">Insumos & Protección</span>
          <h2 class="hero-headline">Colección<br>Campo & Cosecha</h2>
          <p class="hero-subtext">CALIDAD PREMIUM PARA TUS CULTIVOS</p>
          <button class="skyline-btn-primary mt-6" @click="vistaActual = 'CATALOGO'">Explorar Catálogo</button>
        </div>
        <div class="hero-image-wrapper">
          <img src="/logo-agrofuturo.png" alt="Agro Futuro" class="hero-image" />
        </div>
      </section>

      <!-- FEATURED PRODUCTS -->
      <section class="featured-section">
        <div class="section-title-wrapper">
          <span class="line"></span>
          <h3 class="section-title">Insumos Destacados</h3>
          <span class="line"></span>
        </div>
        
        <v-container>
          <v-row class="mt-8">
            <v-col cols="12" sm="6" md="3" v-for="producto in insumosDestacados" :key="producto.id">
              <div class="skyline-card">
                <div class="card-image-wrapper">
                  <img
                    :src="imagenProducto(producto)"
                    alt="product"
                    class="card-image"
                    loading="lazy"
                    @error="e => e.target.src = '/placeholder.png'"
                  />
                  <div class="card-actions-overlay">
                    <v-btn icon="mdi-eye" size="small" variant="flat" color="white" class="mr-2 text-primary" @click="verDetalle(producto)"></v-btn>
                    <v-btn icon="mdi-cart-plus" size="small" variant="flat" color="primary" @click="agregarAlCarrito(producto)"></v-btn>
                  </div>
                </div>
                <div class="card-info">
                  <h4 class="card-title">{{ producto.nombre }}</h4>
                  <p class="card-price">{{ formatPrecio(producto.precio_venta) }}</p>
                  <button class="skyline-btn-outline mt-3" @click="verDetalle(producto)">Ver Producto ></button>
                </div>
              </div>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <!-- SECCIÓN PROMOCIONAL DE LA EMPRESA CON VIDEO -->
      <section class="video-promo-section mt-12 mb-12">
        <v-container>
          <div class="video-promo-card">
            <div class="promo-bg-glow"></div>
            <v-row align="center" class="position-relative z-1">
              <!-- INFORMACIÓN PROMOCIONAL -->
              <v-col cols="12" lg="5" class="promo-text-col pa-6 pa-md-10">
                <div class="d-flex align-center gap-2 mb-3">
                  <span class="promo-badge">
                    <v-icon icon="mdi-play-circle" size="16" class="mr-1"></v-icon>
                    NUESTRA PASIÓN EN ACCIÓN
                  </span>
                </div>
                <h3 class="promo-title">Comprometidos con el Campo Huilense</h3>
                <p class="promo-lead">
                  Conoce de cerca cómo impulsamos la productividad de nuestros agricultores con soluciones agropecuarias de vanguardia, tecnología de punta y respaldo permanente.
                </p>
                <div class="promo-features mt-6">
                  <div class="promo-feature-item">
                    <div class="feature-icon-wrapper">
                      <v-icon icon="mdi-sprout" color="#1B5E20" size="20"></v-icon>
                    </div>
                    <div>
                      <strong class="feature-title">Calidad Garantizada</strong>
                      <p class="feature-desc">Insumos certificados de las mejores marcas nacionales e internacionales.</p>
                    </div>
                  </div>
                  <div class="promo-feature-item mt-4">
                    <div class="feature-icon-wrapper">
                      <v-icon icon="mdi-handshake" color="#1B5E20" size="20"></v-icon>
                    </div>
                    <div>
                      <strong class="feature-title">Acompañamiento Técnico</strong>
                      <p class="feature-desc">Asesoría agronómica experta y personalizada para optimizar el rendimiento de sus cultivos.</p>
                    </div>
                  </div>
                </div>
                <div class="mt-8 d-flex align-center gap-3 flex-wrap">
                  <button class="skyline-btn-primary" @click="vistaActual = 'CATALOGO'">
                    Explorar Catálogo <v-icon icon="mdi-arrow-right" size="small" class="ml-1"></v-icon>
                  </button>
                  <a href="#empresa-info" class="skyline-btn-outline text-decoration-none">
                    Conocer Más
                  </a>
                </div>
              </v-col>

              <!-- VIDEO INSTITUCIONAL -->
              <v-col cols="12" lg="7" class="promo-video-col pa-6 pa-md-8">
                <div class="video-player-wrapper">
                  <video 
                    class="promo-video-player"
                    controls
                    playsinline
                    preload="metadata"
                    src="https://30mojuouxo.ucarecd.net/6a571485-8d86-4376-86bc-7098359c25c6/fcf43a30a470494db5eca416107af499.mp4"
                  >
                    Tu navegador no soporta la reproducción de video.
                  </video>
                  <div class="video-caption-bar">
                    <div class="d-flex align-center">
                      <v-icon icon="mdi-movie-open" size="18" class="mr-2 text-primary"></v-icon>
                      <span class="video-caption-text">AgroInsumos del Huila S.A.S. · Video Institucional</span>
                    </div>
                    <span class="video-hd-pill">HD 1080p</span>
                  </div>
                </div>
              </v-col>
            </v-row>
          </div>
        </v-container>
      </section>
      
      <!-- SECCIÓN CORPORATIVA & UBICACIÓN -->
      <section id="empresa-info" class="empresa-section mt-12 mb-12">
        <v-container>
          <div class="empresa-card">
            <div class="empresa-watermark">HUILA</div>
            <v-row align="stretch" class="position-relative z-1">
              <!-- INFORMACIÓN CORPORATIVA -->
              <v-col cols="12" lg="7" class="d-flex flex-column justify-space-between pa-6 pa-md-10">
                <div>
                  <div class="d-flex align-center flex-wrap gap-2 mb-2">
                    <span class="empresa-badge">CONOCE NUESTRA EMPRESA</span>
                    <span class="empresa-slogan-pill">Fundación 2015 · Constitución 2018</span>
                  </div>
                  <h3 class="empresa-title">AgroInsumos del Huila S.A.S.</h3>
                  <p class="empresa-slogan">"Cultivando confianza, cosechando resultados"</p>
                  
                  <div class="empresa-grid mt-6">
                    <div class="empresa-info-item">
                      <span class="info-label">NIT</span>
                      <strong class="info-value">900.845.213-6 <span class="text-caption text-medium-emphasis">(DV: 6)</span></strong>
                    </div>
                    <div class="empresa-info-item">
                      <span class="info-label">Tipo de Empresa</span>
                      <strong class="info-value">Sociedad por Acciones Simplificada (S.A.S.)</strong>
                    </div>
                    <div class="empresa-info-item">
                      <span class="info-label">Registro Mercantil</span>
                      <strong class="info-value">Matrícula N.° 245.789 · C.C. Neiva</strong>
                    </div>
                    <div class="empresa-info-item">
                      <span class="info-label">Actividad Económica (CIIU)</span>
                      <strong class="info-value">4663 · Comercio mayorista de insumos agropecuarios</strong>
                    </div>
                    <div class="empresa-info-item full-width">
                      <span class="info-label">Sede Principal & Bodega</span>
                      <strong class="info-value">Calle 18 N.° 5-40, Zona Industrial · Neiva, Huila</strong>
                    </div>
                  </div>
                </div>

                <div class="empresa-actions mt-6 pt-4 border-t-subtle d-flex flex-wrap align-center justify-space-between gap-3">
                  <a
                    href="https://maps.google.com/?q=Calle+18+No+5-40+Zona+Industrial+Neiva+Huila"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="skyline-btn-dark d-inline-flex align-center gap-2 text-decoration-none rounded-lg"
                  >
                    <v-icon size="18" color="#C86236">mdi-map-marker-radius</v-icon>
                    <span>Ver Ubicación en Google Maps</span>
                  </a>
                  <span class="text-caption text-medium-emphasis d-inline-flex align-center">
                    <v-icon size="15" color="success" class="mr-1">mdi-check-decagram</v-icon>
                    Cámara de Comercio de Neiva Verificada
                  </span>
                </div>
              </v-col>

              <!-- MAPA GOOGLE MAPS EMBEBIDO -->
              <v-col cols="12" lg="5" class="pa-4 pa-md-6 d-flex flex-column">
                <div class="map-wrapper fill-height">
                  <div class="map-header">
                    <v-icon size="16" class="mr-1 text-primary">mdi-compass-outline</v-icon>
                    <span>Sede Zona Industrial · Neiva, Huila</span>
                  </div>
                  <iframe
                    title="Ubicación AgroInsumos del Huila"
                    class="map-frame"
                    src="https://maps.google.com/maps?q=Calle%2018%20N%205-40%2C%20Zona%20Industrial%2C%20Neiva%2C%20Huila&t=&z=15&ie=UTF8&iwloc=&output=embed"
                    loading="lazy"
                    allowfullscreen
                    referrerpolicy="no-referrer-when-downgrade"
                  ></iframe>
                </div>
              </v-col>
            </v-row>
          </div>
        </v-container>
      </section>

      <!-- SECCIÓN MISIÓN, VISIÓN E HISTORIA -->
      <section class="mision-vision-section mt-10 mb-16">
        <v-container>
          <!-- Encabezado de Sección Editorial -->
          <div class="section-title-wrapper mb-10 text-center">
            <span class="line"></span>
            <div class="px-4">
              <span class="editorial-eyebrow">PROPÓSITO & TRAYECTORIA</span>
              <h2 class="section-title">Misión, Visión e Historia</h2>
            </div>
            <span class="line"></span>
          </div>

          <!-- Misión y Visión (2 Tarjetas) -->
          <v-row class="mb-6" align="stretch">
            <!-- MISIÓN -->
            <v-col cols="12" md="6">
              <div class="purpose-card h-100">
                <div>
                  <div class="purpose-header">
                    <div class="purpose-icon-box">
                      <v-icon size="26" color="#C86236">mdi-target-variant</v-icon>
                    </div>
                    <div>
                      <span class="purpose-tag">NUESTRO PROPÓSITO</span>
                      <h3 class="purpose-title">Misión</h3>
                    </div>
                  </div>
                  <p class="purpose-body">
                    AgroInsumos del Huila S.A.S. es una empresa dedicada a la comercialización y distribución de insumos agrícolas e industriales en el departamento del Huila, comprometida con ofrecer productos de calidad, asesoría técnica especializada y un servicio oportuno que contribuya a la productividad de nuestros clientes del sector agropecuario.
                  </p>
                </div>
                <div class="purpose-footer">
                  <span class="purpose-bullet"><v-icon size="15" color="#C86236" class="mr-1">mdi-check-circle-outline</v-icon> Calidad Garantizada</span>
                  <span class="purpose-bullet"><v-icon size="15" color="#C86236" class="mr-1">mdi-account-hard-hat-outline</v-icon> Asesoría Técnica en Campo</span>
                  <span class="purpose-bullet"><v-icon size="15" color="#C86236" class="mr-1">mdi-truck-fast-outline</v-icon> Entrega Oportuna</span>
                </div>
              </div>
            </v-col>

            <!-- VISIÓN -->
            <v-col cols="12" md="6">
              <div class="purpose-card h-100">
                <div>
                  <div class="purpose-header">
                    <div class="purpose-icon-box purpose-icon-vision">
                      <v-icon size="26" color="#0F6E56">mdi-telescope</v-icon>
                    </div>
                    <div>
                      <span class="purpose-tag tag-vision">METAS & FUTURO</span>
                      <h3 class="purpose-title">Visión 2030</h3>
                    </div>
                  </div>
                  <p class="purpose-body">
                    Para el año 2030, AgroInsumos del Huila S.A.S. será reconocida como la empresa líder en distribución de insumos agropecuarios en el sur del país, destacada por su innovación, cobertura regional y compromiso con el desarrollo sostenible del campo.
                  </p>
                </div>
                <div class="purpose-footer">
                  <span class="purpose-bullet"><v-icon size="15" color="#0F6E56" class="mr-1">mdi-sprout-outline</v-icon> Desarrollo Sostenible</span>
                  <span class="purpose-bullet"><v-icon size="15" color="#0F6E56" class="mr-1">mdi-map-marker-radius-outline</v-icon> Liderazgo en el Sur de Colombia</span>
                  <span class="purpose-bullet"><v-icon size="15" color="#0F6E56" class="mr-1">mdi-lightbulb-on-outline</v-icon> Innovación Agrícola</span>
                </div>
              </div>
            </v-col>
          </v-row>

          <!-- HISTORIA Y CONSTITUCIÓN -->
          <div class="historia-card">
            <div class="historia-header">
              <div class="d-flex align-center gap-3">
                <div class="purpose-icon-box purpose-icon-history">
                  <v-icon size="24" color="#C86236">mdi-book-open-page-variant-outline</v-icon>
                </div>
                <div>
                  <span class="purpose-tag">NUESTROS ORÍGENES</span>
                  <h3 class="purpose-title">Historia y Constitución</h3>
                </div>
              </div>
              <span class="historia-badge">
                <v-icon size="14" class="mr-1" color="#C86236">mdi-calendar-check</v-icon>
                Trayectoria Desde 2015
              </span>
            </div>

            <p class="historia-narrativa">
              La empresa fue fundada en el año 2015 en la ciudad de Neiva por un grupo de emprendedores del sector agroindustrial, inicialmente como distribuidora de fertilizantes a pequeña escala. En 2018 se constituyó legalmente como Sociedad por Acciones Simplificada (S.A.S.) ante la Cámara de Comercio de Neiva, ampliando su portafolio a insumos veterinarios y herramientas agrícolas. Desde entonces ha crecido hasta contar con una planta de 10 colaboradores y cobertura en varios municipios del Huila.
            </p>

            <!-- Hitos en línea de tiempo -->
            <div class="historia-timeline">
              <div class="timeline-step">
                <div class="timeline-year">2015</div>
                <div class="timeline-dot"></div>
                <div class="timeline-label font-weight-bold">Fundación en Neiva</div>
                <div class="timeline-desc">Inicios en el agro huilense como distribuidora de fertilizantes a pequeña escala por emprendedores locales.</div>
              </div>
              <div class="timeline-step">
                <div class="timeline-year">2018</div>
                <div class="timeline-dot"></div>
                <div class="timeline-label font-weight-bold">Constitución S.A.S.</div>
                <div class="timeline-desc">Formalización ante la Cámara de Comercio de Neiva y ampliación a insumos veterinarios y herramientas.</div>
              </div>
              <div class="timeline-step">
                <div class="timeline-year">Hoy</div>
                <div class="timeline-dot dot-active"></div>
                <div class="timeline-label font-weight-bold">Consolidación Regional</div>
                <div class="timeline-desc">Equipo humano de 10 colaboradores expertos y presencia activa en múltiples municipios del Huila.</div>
              </div>
            </div>
          </div>
        </v-container>
      </section>
    </main>

    <!-- CATALOGO VIEW -->
    <main v-if="vistaActual === 'CATALOGO'" class="view-catalogo">
      <v-container class="py-10">
        <v-row>
          <!-- GRID DE PRODUCTOS -->
          <v-col cols="12" md="9">
            <div class="catalog-header mb-6">
               <h2 class="catalog-title">{{ categoriaActiva === 'Todos' ? 'Todos los Productos' : categoriaActiva }}</h2>
               <div class="catalog-sort">
                  <select v-model="ordenSeleccionado" class="skyline-select">
                    <option v-for="opt in ordenOpciones" :key="opt.value" :value="opt.value">{{ opt.title }}</option>
                  </select>
               </div>
            </div>
            
            <div v-if="cargando" class="text-center py-10">
               <v-progress-circular indeterminate color="#c86236"></v-progress-circular>
            </div>
            <div v-else-if="productosFiltrados.length === 0" class="text-center py-10 empty-state">
               <v-icon size="64" color="#e0dbd3">mdi-package-variant</v-icon>
               <h4 class="mt-4 serif-font">No se encontraron productos</h4>
            </div>
            
            <v-row v-else>
               <v-col cols="12" sm="6" md="4" v-for="producto in productosFiltrados" :key="producto.id">
                  <div class="skyline-card">
                    <div class="card-image-wrapper">
                      <img :src="imagenProducto(producto)" alt="product" class="card-image" loading="lazy" @error="e => e.target.src = '/placeholder.png'" />
                      <div class="card-actions-overlay">
                        <v-btn icon="mdi-eye" size="small" variant="flat" color="white" class="mr-2 text-primary" @click="verDetalle(producto)"></v-btn>
                        <v-btn icon="mdi-cart-plus" size="small" variant="flat" color="primary" @click="agregarAlCarrito(producto)"></v-btn>
                      </div>
                    </div>
                    <div class="card-info">
                      <h4 class="card-title" :title="producto.nombre">{{ producto.nombre }}</h4>
                      <p class="card-price">{{ formatPrecio(producto.precio_venta) }}</p>
                      <button class="skyline-btn-outline mt-3" @click="verDetalle(producto)">Ver Item ></button>
                    </div>
                  </div>
               </v-col>
            </v-row>
          </v-col>

          <!-- SIDEBAR FILTROS -->
          <v-col cols="12" md="3">
            <aside class="skyline-sidebar">
               <!-- Search -->
               <div class="sidebar-widget">
                  <div class="search-box">
                    <input type="text" v-model="busqueda" placeholder="Buscar..." class="skyline-input" />
                    <v-icon>mdi-magnify</v-icon>
                  </div>
               </div>
               
               <!-- Special Sale Editorial -->
               <div class="sidebar-widget promo-widget">
                  <h4 class="widget-title serif-font text-primary">Special Sale</h4>
                  <p class="widget-text">Descubre la mejor calidad en insumos agrícolas para el campo. Aseguramos el rendimiento y nutrición de tus cultivos, con envíos y asesoría técnica especializada a tu finca.</p>
               </div>

               <!-- Filter by Price -->
               <div class="sidebar-widget mt-8">
                 <h4 class="widget-title">Filter by Price:</h4>
                 <div class="price-filter">
                   <p class="text-caption mb-1">Max Price <strong>{{ formatPrecio(maxPrecioFiltro) }}</strong></p>
                   <input type="range" min="0" :max="maxPrecioPosible" v-model.number="maxPrecioFiltro" class="skyline-range" />
                   <div class="d-flex justify-space-between mt-1 text-caption text-medium-emphasis">
                     <span>$0</span>
                     <span>{{ formatPrecio(maxPrecioPosible) }}</span>
                   </div>
                 </div>
               </div>
               
               <!-- Categorías -->
               <div class="sidebar-widget mt-8">
                 <h4 class="widget-title">Categorías</h4>
                 <ul class="sidebar-cats">
                    <li v-for="cat in categorias" :key="cat">
                      <a href="#" :class="{ active: categoriaActiva === cat }" @click.prevent="cambiarCategoria(cat)">{{ cat }}</a>
                    </li>
                 </ul>
               </div>
            </aside>
          </v-col>
        </v-row>
      </v-container>
    </main>

    <!-- TESTIMONIAL BANNER -->
    <section class="testimonial-banner">
      <div class="testimonial-content">
        <h3 class="testimonial-quote">"La mejor calidad en fertilizantes, semillas y tecnología para el agro del Huila."</h3>
        <p class="testimonial-author">Cafeteros & Agricultores de Colombia</p>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="skyline-footer">
      <div class="footer-content">
        <p>Este proyecto está inspirado en el diseño <span class="text-primary">Skyline Ivy</span>, alojado para <span class="text-primary">Agroinsumos del Huila</span>, y hecho con amor para el campo.</p>
      </div>
    </footer>

    <!-- PRODUCT DETAIL DIALOG -->
    <v-dialog v-model="dialogDetalle" max-width="900px">
      <v-card v-if="productoDetalle" class="product-modal">
        <v-btn icon="mdi-close" variant="text" class="modal-close" @click="dialogDetalle = false" />
        <v-row no-gutters>
          <v-col cols="12" md="6" class="modal-image-col">
            <img
              :src="imagenProducto(productoDetalle)"
              class="modal-image"
              @error="e => e.target.src = '/placeholder.png'"
            />
          </v-col>
          <v-col cols="12" md="6" class="modal-info-col pa-8">
            <h2 class="modal-title">{{ productoDetalle.nombre }}</h2>
            <div class="modal-price mb-6">{{ formatPrecio(productoDetalle.precio_venta) }}</div>
            
            <p class="modal-desc">{{ productoDetalle.descripcion || 'Insumo agrícola de alta calidad garantizada para optimizar el rendimiento de sus cultivos y cosechas. Uso recomendado según especificaciones técnicas.' }}</p>
            
            <div class="modal-meta mt-6 mb-8">
               <p><strong>Categoría:</strong> {{ productoDetalle.categoria || 'General' }}</p>
               <p><strong>Código / SKU:</strong> {{ productoDetalle.codigo }}</p>
               <p><strong>Stock:</strong> {{ productoDetalle.stock_actual }} {{ productoDetalle.unidad || 'uds' }}</p>
            </div>

            <div class="modal-actions">
               <div class="skyline-quantity" v-if="estaEnCarrito(productoDetalle.id)">
                  <button @click="quitarUno(productoDetalle)">-</button>
                  <input type="text" :value="cantidadEnCarrito(productoDetalle.id)" readonly />
                  <button @click="agregarAlCarrito(productoDetalle)">+</button>
               </div>
               <button v-else class="skyline-btn-dark w-100" @click="agregarAlCarrito(productoDetalle)">Añadir al Carrito</button>
            </div>
          </v-col>
        </v-row>
      </v-card>
    </v-dialog>

    <!-- DRAWER CARRITO -->
    <v-navigation-drawer v-model="drawerCarrito" location="right" width="400" temporary class="skyline-cart-drawer">
       <div class="cart-header">
         <h3>Carrito de Compras</h3>
         <v-btn icon="mdi-close" variant="text" size="small" @click="drawerCarrito = false" />
       </div>
       
       <div v-if="carrito.length === 0" class="cart-empty">
          <v-icon size="48" color="#e0dbd3">mdi-cart-outline</v-icon>
          <p>Tu carrito está vacío.</p>
          <button class="skyline-btn-primary mt-4" @click="drawerCarrito = false; vistaActual = 'CATALOGO'">Explorar Tienda</button>
       </div>
       
       <div v-else class="cart-body">
         <div class="cart-items">
            <div class="cart-item" v-for="item in carrito" :key="item.id">
               <img
                 :src="imagenProducto(item)"
                 class="cart-item-img"
                 loading="lazy"
                 @error="e => e.target.src = '/placeholder.png'"
               />
               <div class="cart-item-info">
                  <h4>{{ item.nombre }}</h4>
                  <p class="item-price">{{ formatPrecio(item.precio_venta) }}</p>
                  <div class="skyline-quantity small mt-2">
                    <button @click="quitarUno(item)">-</button>
                    <input type="text" :value="item.cantidad" readonly />
                    <button @click="agregarAlCarrito(item)">+</button>
                  </div>
               </div>
               <v-btn icon="mdi-close" variant="text" size="x-small" class="cart-item-remove" @click="eliminarDelCarrito(item)" />
            </div>
         </div>
         
         <div class="cart-footer">
            <div class="cart-total">
               <span>TOTAL</span>
               <span class="total-price">{{ formatPrecio(totalPrecio) }}</span>
            </div>
            <button class="skyline-btn-dark w-100 mb-3" @click="abrirCheckout()">Finalizar Pedido</button>
            <button class="skyline-btn-outline w-100" @click="vaciarCarrito()">Vaciar Carrito</button>
         </div>
       </div>
    </v-navigation-drawer>

    <!-- DIÁLOGO DE CHECKOUT / REGISTRO DE CLIENTE Y FACTURA FV -->
    <v-dialog v-model="dialogCheckout" max-width="660px" persistent scrollable>
      <div class="skyline-dialog">

        <!-- ── VISTA ÉXITO ── -->
        <template v-if="pedidoExitoso">
          <div class="dialog-success">
            <v-icon size="64" color="#4caf50" class="mb-4">mdi-check-circle-outline</v-icon>
            <h2 class="dialog-success-title">¡Pedido y Factura Generados!</h2>
            <p class="dialog-success-sub">
              La factura <strong>{{ pedidoExitoso.documento }}</strong> se registró correctamente en el sistema.
            </p>

            <div class="dialog-summary-box success-box">
              <div class="summary-row">
                <span class="summary-label">CLIENTE</span>
                <span class="summary-value">{{ pedidoExitoso.cliente }}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">N.° FACTURA</span>
                <span class="summary-value">{{ pedidoExitoso.documento }}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">TOTAL PAGADO</span>
                <span class="summary-value success-amount">{{ formatPrecio(pedidoExitoso.total) }}</span>
              </div>
            </div>

            <button class="skyline-btn-dark w-100" style="padding:16px 0;font-size:0.9rem;" @click="cerrarDialogoExito">
              Aceptar y Seguir Comprando
            </button>
          </div>
        </template>

        <!-- ── FORMULARIO DE DATOS DEL CLIENTE ── -->
        <template v-else>
          <!-- Cabecera -->
          <div class="dialog-head">
            <div class="dialog-head-left">
              <v-icon icon="mdi-receipt-text-outline" color="#C86236" size="22" class="mr-2" />
              <span class="dialog-head-title">Datos para tu Factura de Venta</span>
            </div>
            <button class="dialog-close-btn" @click="dialogCheckout = false" :disabled="procesandoPedido">
              <v-icon>mdi-close</v-icon>
            </button>
          </div>

          <div class="dialog-divider" />

          <!-- Subtítulo -->
          <p class="dialog-subtitle">
            Ingresa tus datos personales para emitir la factura legal y gestionar tu pedido.
          </p>

          <!-- Campos -->
          <form @submit.prevent="procesarFacturacionTienda" class="dialog-form">
            <div class="dialog-fields-grid">
              <!-- Cédula con autocompletado -->
              <div class="skyline-field full-width">
                <label class="field-label">Cédula / NIT <span class="required">*</span></label>
                <div class="field-input-wrap">
                  <v-icon class="field-icon" size="18">mdi-card-account-details-outline</v-icon>
                  <input
                    v-model="formCliente.cedula"
                    type="text"
                    class="field-input"
                    :class="{ 'field-input-found': clienteEncontrado }"
                    placeholder="Ej. 1075234567  (escribe o presiona Buscar)"
                    required
                    @input="onCedulaInput"
                    @blur="autocompletarPorCedula"
                    @keydown.enter.prevent="autocompletarPorCedula"
                  />
                  <button
                    v-if="!buscandoCliente && !clienteEncontrado"
                    type="button"
                    class="field-search-btn"
                    title="Buscar cliente por cédula"
                    @click="autocompletarPorCedula"
                    :disabled="!formCliente.cedula?.trim()"
                  >
                    <v-icon size="14">mdi-magnify</v-icon>
                    <span>Buscar</span>
                  </button>
                  <span v-if="buscandoCliente" class="field-spinner">
                    <v-progress-circular indeterminate size="16" width="2" color="#1B5E20" />
                  </span>
                  <span v-else-if="clienteEncontrado" class="field-found-badge">
                    <v-icon size="16" color="#0F6E56">mdi-check-circle</v-icon> Cliente encontrado
                  </span>
                </div>
              </div>

              <!-- Teléfono -->
              <div class="skyline-field">
                <label class="field-label">Teléfono / WhatsApp</label>
                <div class="field-input-wrap">
                  <v-icon class="field-icon" size="18">mdi-phone-outline</v-icon>
                  <input
                    v-model="formCliente.telefono"
                    type="tel"
                    class="field-input"
                    placeholder="Ej. 3101234567"
                  />
                </div>
              </div>

              <!-- Nombres -->
              <div class="skyline-field">
                <label class="field-label">Nombres <span class="required">*</span></label>
                <div class="field-input-wrap">
                  <v-icon class="field-icon" size="18">mdi-account-outline</v-icon>
                  <input
                    v-model="formCliente.nombre"
                    type="text"
                    class="field-input"
                    placeholder="Tu nombre"
                    required
                  />
                </div>
              </div>

              <!-- Apellidos -->
              <div class="skyline-field">
                <label class="field-label">Apellidos</label>
                <div class="field-input-wrap">
                  <v-icon class="field-icon" size="18">mdi-account-outline</v-icon>
                  <input
                    v-model="formCliente.apellidos"
                    type="text"
                    class="field-input"
                    placeholder="Tus apellidos"
                  />
                </div>
              </div>

              <!-- Correo (full width) -->
              <div class="skyline-field full-width">
                <label class="field-label">Correo electrónico</label>
                <div class="field-input-wrap">
                  <v-icon class="field-icon" size="18">mdi-email-outline</v-icon>
                  <input
                    v-model="formCliente.correo"
                    type="email"
                    class="field-input"
                    placeholder="ejemplo@correo.com"
                  />
                </div>
              </div>

              <!-- Dirección (full width) -->
              <div class="skyline-field full-width">
                <label class="field-label">Dirección</label>
                <div class="field-input-wrap">
                  <v-icon class="field-icon" size="18">mdi-map-marker-outline</v-icon>
                  <input
                    v-model="formCliente.direccion"
                    type="text"
                    class="field-input"
                    placeholder="Ej. Cra. 5 # 12-34, Neiva"
                  />
                </div>
              </div>
            </div>


            <!-- Resumen del pedido -->
            <div class="dialog-summary-box">
              <div class="summary-row">
                <span class="summary-label">PRODUCTOS EN ORDEN</span>
                <span class="summary-value">{{ totalItems }} artículo(s)</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">TOTAL FACTURA</span>
                <span class="summary-value total-amount">{{ formatPrecio(totalPrecio) }}</span>
              </div>
            </div>

            <!-- Acciones -->
            <div class="dialog-actions">
              <button
                type="button"
                class="skyline-btn-outline"
                style="flex:0 0 auto;width:auto;padding:12px 24px;"
                @click="dialogCheckout = false"
                :disabled="procesandoPedido"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="skyline-btn-dark"
                style="flex:1;padding:14px 0;display:flex;align-items:center;justify-content:center;gap:8px;"
                :disabled="procesandoPedido"
              >
                <v-icon v-if="!procesandoPedido" size="18">mdi-receipt-check</v-icon>
                <v-progress-circular v-else indeterminate size="18" width="2" color="white" />
                {{ procesandoPedido ? 'Procesando...' : 'Confirmar y Generar Factura' }}
              </button>
            </div>
          </form>
        </template>

      </div>
    </v-dialog>

    <!-- SNACKBAR -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="top right">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<style scoped>
/* ── FONTS & VARIABLES ── */
.skyline-wrapper {
  --color-bg: #FAF9F6;
  --color-primary: #C86236;
  --color-text: #1A1A1A;
  --color-border: #E0DBD3;
  --color-white: #FFFFFF;
  --font-serif: 'Playfair Display', Georgia, serif;
  --font-sans: 'Montserrat', sans-serif;
  
  background-color: var(--color-bg);
  min-height: 100vh;
  font-family: var(--font-sans);
  color: var(--color-text);
  overflow-x: hidden;
}

.serif-font { font-family: var(--font-serif); }
.text-primary { color: var(--color-primary) !important; }

/* ── HEADER ── */
.skyline-header {
  text-align: center;
  padding-top: 1rem;
  background: var(--color-bg);
}
.header-top-utils {
  text-align: right;
  padding: 0 2rem;
}
.util-link {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 1px;
}
.brand-container {
  margin: 2rem 0;
}
.brand-title {
  font-family: var(--font-serif);
  font-size: 3rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  letter-spacing: -0.5px;
}
.brand-subtitle {
  font-size: 0.75rem;
  letter-spacing: 2px;
  color: #777;
  margin-top: 0.5rem;
}
.skyline-nav {
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  padding: 1.2rem 0;
  margin-bottom: 2rem;
}
.nav-links {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}
.nav-links li a {
  text-decoration: none;
  color: var(--color-text);
  font-size: 0.85rem;
  font-weight: 500;
  letter-spacing: 2px;
  transition: color 0.3s ease;
}
.nav-links li a:hover, .nav-links li a.active {
  color: var(--color-primary);
}
.nav-links li.separator {
  color: var(--color-border);
  font-size: 0.8rem;
}

/* ── HERO SECTION ── */
.hero-section {
  position: relative;
  max-width: 1200px;
  margin: 0 auto 4rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
}
.hero-watermark {
  position: absolute;
  top: 50%;
  left: 5%;
  transform: translateY(-50%);
  font-family: var(--font-serif);
  font-size: 14rem;
  color: #F0EBE1;
  z-index: 0;
  pointer-events: none;
  opacity: 0.6;
}
.hero-content {
  position: relative;
  z-index: 1;
  max-width: 400px;
}
.hero-eyebrow {
  color: var(--color-primary);
  font-size: 1rem;
  font-family: var(--font-serif);
  font-style: italic;
}
.hero-headline {
  font-family: var(--font-serif);
  font-size: 4rem;
  line-height: 1.1;
  margin: 1rem 0;
  color: var(--color-text);
}
.hero-subtext {
  font-size: 0.8rem;
  letter-spacing: 2px;
  color: #555;
  margin-bottom: 2rem;
}
.hero-image-wrapper {
  position: relative;
  z-index: 1;
  width: 42%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hero-image {
  width: 100%;
  max-width: 380px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 20px 60px rgba(0,0,0,0.10);
  padding: 1.5rem;
  object-fit: contain;
}

/* ── BUTTONS ── */
.skyline-btn-primary {
  background: #FAF9F6;
  border: 1px solid #1A1A1A;
  color: #1A1A1A;
  padding: 12px 30px;
  font-size: 0.85rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s ease;
}
.skyline-btn-primary:hover {
  background: #1A1A1A;
  color: #FFFFFF;
}
.skyline-btn-outline {
  background: transparent;
  border: 1px solid #E0DBD3;
  color: #1A1A1A;
  padding: 8px 16px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
}
.skyline-btn-outline:hover {
  border-color: #C86236;
  color: #C86236;
}
.skyline-btn-dark {
  background: #1A1A1A;
  border: 1px solid #1A1A1A;
  color: #FFFFFF;
  padding: 12px 30px;
  font-size: 0.85rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s ease;
}
.skyline-btn-dark:hover {
  background: #C86236;
  border-color: #C86236;
}

/* ── FEATURED SECTION ── */
.featured-section {
  text-align: center;
  padding: 4rem 0;
}
.section-title-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
}
.section-title-wrapper .line {
  height: 1px;
  width: 150px;
  background: var(--color-primary);
  opacity: 0.4;
}
.section-title {
  font-family: var(--font-serif);
  color: var(--color-primary);
  font-size: 1.8rem;
  font-weight: 600;
}

/* ── CARDS ── */
.skyline-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 36px 36px 12px 12px;
  padding: 1.5rem;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.skyline-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.05);
}
.card-image-wrapper {
  position: relative;
  width: 100%;
  padding-bottom: 100%;
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 1.5rem;
}
.card-image {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}
.skyline-card:hover .card-image {
  transform: scale(1.05);
}
.card-actions-overlay {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  padding: 1rem;
  background: linear-gradient(to top, rgba(0,0,0,0.5), transparent);
  display: flex;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}
.skyline-card:hover .card-actions-overlay {
  opacity: 1;
}
.card-info {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.card-title {
  font-family: var(--font-serif);
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}
.card-price {
  color: var(--color-primary);
  font-weight: 600;
  font-size: 1rem;
}

/* ── SECCIÓN CORPORATIVA (LA EMPRESA & UBICACIÓN) ── */
.empresa-section {
  position: relative;
}
.empresa-card {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-top: 4px solid var(--color-primary);
  border-radius: 24px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
}
.empresa-watermark {
  position: absolute;
  right: 2%;
  bottom: -25px;
  font-size: 15rem;
  font-family: var(--font-serif);
  color: #F4EFEA;
  z-index: 0;
  line-height: 1;
  font-weight: 700;
  pointer-events: none;
  user-select: none;
  letter-spacing: -2px;
}
.empresa-badge {
  display: inline-block;
  background: rgba(200, 98, 54, 0.12);
  color: var(--color-primary);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 2px;
  padding: 4px 12px;
  border-radius: 20px;
}
.empresa-slogan-pill {
  font-size: 0.75rem;
  color: #777;
  letter-spacing: 0.5px;
  font-weight: 500;
}
.empresa-title {
  font-family: var(--font-serif);
  color: var(--color-text);
  font-size: 2.2rem;
  font-weight: 700;
  line-height: 1.2;
  margin-top: 0.5rem;
}
.empresa-slogan {
  font-family: var(--font-serif);
  font-style: italic;
  color: var(--color-primary);
  font-size: 1.15rem;
  margin-top: 0.35rem;
  font-weight: 500;
}
.empresa-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.9rem;
}
@media (max-width: 600px) {
  .empresa-grid {
    grid-template-columns: 1fr;
  }
}
.empresa-info-item {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}
.empresa-info-item:hover {
  transform: translateY(-2px);
  border-color: var(--color-primary);
  box-shadow: 0 4px 12px rgba(200, 98, 54, 0.08);
}
.empresa-info-item.full-width {
  grid-column: 1 / -1;
}
.info-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #888;
  font-weight: 600;
  margin-bottom: 2px;
}
.info-value {
  font-size: 0.88rem;
  color: var(--color-text);
  font-weight: 600;
  line-height: 1.35;
}
.border-t-subtle {
  border-top: 1px solid var(--color-border);
}
.map-wrapper {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 18px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  min-height: 340px;
}
.map-header {
  padding: 0.75rem 1rem;
  background: #FFFFFF;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.75rem;
  font-weight: 600;
  color: #555;
  display: flex;
  align-items: center;
  letter-spacing: 0.5px;
}
.map-frame {
  width: 100%;
  height: 100%;
  min-height: 280px;
  border: 0;
  flex-grow: 1;
}

/* ── SECCIÓN PROPÓSITO & TRAYECTORIA (MISIÓN, VISIÓN, HISTORIA) ── */
.mision-vision-section {
  position: relative;
}
.editorial-eyebrow {
  display: block;
  font-size: 0.72rem;
  letter-spacing: 2px;
  color: var(--color-primary);
  font-weight: 700;
  text-transform: uppercase;
  margin-bottom: 0.25rem;
}
.purpose-card {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 2.2rem 2rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 4px 20px rgba(0,0,0,0.03);
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
}
.purpose-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(0,0,0,0.06);
  border-color: rgba(200, 98, 54, 0.4);
}
.purpose-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
}
.purpose-icon-box {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: rgba(200, 98, 54, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.purpose-icon-vision {
  background: rgba(15, 110, 86, 0.1);
}
.purpose-icon-history {
  background: rgba(60, 52, 137, 0.08);
}
.purpose-tag {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: var(--color-primary);
  text-transform: uppercase;
}
.purpose-tag.tag-vision {
  color: #0F6E56;
}
.purpose-title {
  font-family: var(--font-serif);
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.1;
  margin: 0;
}
.purpose-body {
  font-size: 0.95rem;
  line-height: 1.7;
  color: #4A4A4A;
  margin-bottom: 1.5rem;
  flex-grow: 1;
}
.purpose-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  padding-top: 1rem;
  border-top: 1px dashed var(--color-border);
}
.purpose-bullet {
  font-size: 0.78rem;
  font-weight: 600;
  color: #555;
  display: inline-flex;
  align-items: center;
}
.historia-card {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 2.5rem 2.2rem;
  box-shadow: 0 4px 20px rgba(0,0,0,0.03);
  position: relative;
  overflow: hidden;
}
.historia-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.25rem;
}
.historia-badge {
  background: rgba(200, 98, 54, 0.1);
  color: var(--color-primary);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  display: inline-flex;
  align-items: center;
}
.historia-narrativa {
  font-size: 0.98rem;
  line-height: 1.8;
  color: #4A4A4A;
  max-width: 950px;
  margin-bottom: 2rem;
}
.historia-timeline {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  position: relative;
  padding-top: 1rem;
}
.historia-timeline::before {
  content: '';
  position: absolute;
  top: 42px;
  left: 40px;
  right: 40px;
  height: 2px;
  background: var(--color-border);
  z-index: 0;
}
@media (max-width: 768px) {
  .historia-timeline {
    grid-template-columns: 1fr;
    gap: 1.2rem;
  }
  .historia-timeline::before {
    display: none;
  }
}
.timeline-step {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 1.2rem;
  position: relative;
  z-index: 1;
  transition: transform 0.2s ease, border-color 0.2s ease;
}
.timeline-step:hover {
  transform: translateY(-2px);
  border-color: var(--color-primary);
}
.timeline-year {
  font-family: var(--font-serif);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 0.25rem;
}
.timeline-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-primary);
  margin-bottom: 0.75rem;
}
.timeline-dot.dot-active {
  background: #0F6E56;
  box-shadow: 0 0 0 4px rgba(15, 110, 86, 0.2);
}
.timeline-label {
  font-size: 0.92rem;
  color: var(--color-text);
  margin-bottom: 0.35rem;
}
.timeline-desc {
  font-size: 0.82rem;
  line-height: 1.5;
  color: #666;
}

/* ── CATALOG ── */
.catalog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 1rem;
}
.catalog-title {
  font-family: var(--font-serif);
  font-size: 1.5rem;
}
.skyline-select {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  background: var(--color-white);
  font-family: var(--font-sans);
  font-size: 0.85rem;
  outline: none;
}
.skyline-sidebar {
  padding-left: 2rem;
}
.widget-title {
  font-family: var(--font-sans);
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
}
.widget-title.serif-font {
  font-family: var(--font-serif);
  font-size: 1.4rem;
}
.search-box {
  position: relative;
}
.skyline-input {
  width: 100%;
  padding: 10px 15px;
  border: 1px solid var(--color-border);
  background: var(--color-white);
  outline: none;
}
.search-box .v-icon {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #999;
}
.promo-widget {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  padding: 1.5rem;
  margin-top: 2rem;
}
.widget-text {
  font-size: 0.85rem;
  line-height: 1.6;
  color: #555;
}
.skyline-range {
  width: 100%;
  accent-color: var(--color-primary);
}
.sidebar-cats {
  list-style: none;
  padding: 0;
}
.sidebar-cats li {
  margin-bottom: 0.5rem;
}
.sidebar-cats a {
  text-decoration: none;
  color: var(--color-text);
  font-size: 0.9rem;
  transition: color 0.2s;
}
.sidebar-cats a:hover, .sidebar-cats a.active {
  color: var(--color-primary);
  font-weight: 600;
}

/* ── MODAL ── */
.product-modal {
  background: #FAF9F6 !important;
  color: #1A1A1A !important;
  font-family: 'Montserrat', sans-serif;
}
.modal-close {
  position: absolute !important;
  top: 15px; right: 15px;
  z-index: 10;
}
.modal-image-col {
  background: #FFFFFF;
}
.modal-info-col {
  background: #FAF9F6;
  color: #1A1A1A;
}
.modal-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  min-height: 400px;
}
.modal-title {
  font-family: var(--font-serif);
  font-size: 2.5rem;
  line-height: 1.2;
}
.modal-price {
  color: var(--color-primary);
  font-size: 1.5rem;
  font-weight: 600;
}
.modal-desc {
  font-size: 0.9rem;
  line-height: 1.6;
  color: #444;
}
.modal-meta p {
  font-size: 0.85rem;
  margin-bottom: 0.2rem;
  color: #555;
}
.skyline-quantity {
  display: flex;
  align-items: center;
  border: 1px solid #1A1A1A;
  width: max-content;
}
.skyline-quantity button {
  background: #1A1A1A;
  color: #FFFFFF;
  border: none;
  width: 40px; height: 40px;
  cursor: pointer;
  font-size: 1.1rem;
  transition: background 0.2s;
}
.skyline-quantity button:hover {
  background: #C86236;
}
.skyline-quantity input {
  width: 50px;
  text-align: center;
  border: none;
  background: transparent;
  font-weight: bold;
  color: #1A1A1A;
}
.skyline-quantity.small button { width: 28px; height: 28px; font-size: 0.9rem; }
.skyline-quantity.small input { width: 35px; }

/* ── CART DRAWER ── */
.skyline-cart-drawer {
  background: #FAF9F6 !important;
  color: #1A1A1A !important;
  display: flex;
  flex-direction: column;
}
.cart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-border);
}
.cart-header h3 { font-family: var(--font-serif); }
.cart-empty {
  text-align: center;
  padding: 4rem 2rem;
}
.cart-body {
  display: flex;
  flex-direction: column;
  height: calc(100% - 70px);
}
.cart-items {
  flex-grow: 1;
  overflow-y: auto;
  padding: 1.5rem;
}
.cart-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  position: relative;
}
.cart-item-img {
  width: 70px; height: 70px;
  object-fit: cover;
  border-radius: 8px;
}
.cart-item-info h4 { font-family: var(--font-serif); font-size: 1rem; }
.item-price { color: var(--color-primary); font-size: 0.85rem; font-weight: 600; }
.cart-item-remove { position: absolute; right: 0; top: 0; }
.cart-footer {
  padding: 1.5rem;
  background: var(--color-white);
  border-top: 1px solid var(--color-border);
}
.cart-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  font-weight: bold;
  font-size: 1.2rem;
}
.total-price { color: var(--color-primary); }

/* ── TESTIMONIAL ── */
.testimonial-banner {
  background: url('https://images.unsplash.com/photo-1592982537447-6f296c0b39cc?auto=format&fit=crop&q=80&w=1600') center/cover no-repeat;
  position: relative;
  padding: 6rem 2rem;
  text-align: center;
  color: var(--color-white);
}
.testimonial-banner::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
}
.testimonial-content {
  position: relative;
  z-index: 1;
  max-width: 800px;
  margin: 0 auto;
}
.testimonial-quote {
  font-family: var(--font-serif);
  font-size: 2rem;
  line-height: 1.4;
  color: var(--color-primary);
  margin-bottom: 1.5rem;
}
.testimonial-author {
  font-size: 0.9rem;
  letter-spacing: 1px;
}

/* ── FOOTER ── */
.skyline-footer {
  background: #111;
  color: #fff;
  padding: 2rem;
  text-align: center;
}
.footer-content { font-size: 0.85rem; color: #888; }
.w-100 { width: 100%; }
</style>

<!-- ── Estilos GLOBALES para el dialog de checkout (v-dialog teleporta fuera del componente) ── -->
<style>
/* ── CHECKOUT DIALOG (Skyline) ── */
.skyline-dialog {
  background: #FAF9F6 !important;
  font-family: 'Montserrat', sans-serif;
  color: #1A1A1A;
  border-radius: 4px;
  overflow-y: auto;
  max-height: 90vh;
}

/* Cabecera */
.skyline-dialog .dialog-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.4rem 1.6rem 1rem;
}
.skyline-dialog .dialog-head-left {
  display: flex;
  align-items: center;
}
.skyline-dialog .dialog-head-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1A1A1A;
}
.skyline-dialog .dialog-close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #999;
  display: flex;
  align-items: center;
  padding: 4px;
  transition: color 0.2s;
}
.skyline-dialog .dialog-close-btn:hover { color: #C86236; }
.skyline-dialog .dialog-close-btn:disabled { opacity: 0.4; cursor: default; }

.skyline-dialog .dialog-divider {
  height: 1px;
  background: #E0DBD3;
  margin: 0 1.6rem;
}

.skyline-dialog .dialog-subtitle {
  font-size: 0.82rem;
  color: #777;
  padding: 0.8rem 1.6rem 0;
  line-height: 1.5;
  margin: 0;
}

/* Formulario */
.skyline-dialog .dialog-form {
  padding: 1rem 1.6rem 1.6rem;
}

.skyline-dialog .dialog-fields-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.2rem;
}
.skyline-dialog .dialog-fields-grid .full-width {
  grid-column: 1 / -1;
}

/* Campo individual */
.skyline-dialog .skyline-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.skyline-dialog .field-label {
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: #555;
}
.skyline-dialog .required { color: #C86236; }

.skyline-dialog .field-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.skyline-dialog .field-icon {
  position: absolute;
  left: 10px;
  color: #aaa;
  pointer-events: none;
}
.skyline-dialog .field-input {
  width: 100%;
  padding: 10px 12px 10px 36px;
  border: 1px solid #E0DBD3;
  background: #FFFFFF;
  font-family: 'Montserrat', sans-serif;
  font-size: 0.88rem;
  color: #1A1A1A;
  outline: none;
  transition: border-color 0.2s;
  border-radius: 2px;
  box-sizing: border-box;
}
.skyline-dialog .field-input:focus {
  border-color: #C86236;
}
.skyline-dialog .field-input::placeholder {
  color: #bbb;
}

/* Resumen del pedido */
.skyline-dialog .dialog-summary-box {
  border-top: 1px solid #E0DBD3;
  border-bottom: 1px solid #E0DBD3;
  padding: 1rem 0;
  margin-bottom: 1.2rem;
}
.skyline-dialog .summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 0;
}
.skyline-dialog .summary-label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #888;
}
.skyline-dialog .summary-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1A1A1A;
}
.skyline-dialog .total-amount {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.3rem;
  color: #C86236;
}

/* Botones en el dialog */
.skyline-dialog .dialog-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.skyline-dialog .skyline-btn-outline {
  background: transparent;
  border: 1px solid #E0DBD3;
  color: #1A1A1A;
  font-family: 'Montserrat', sans-serif;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s ease;
  flex: 0 0 auto;
  width: auto;
  padding: 12px 24px;
}
.skyline-dialog .skyline-btn-outline:hover {
  border-color: #C86236;
  color: #C86236;
}
.skyline-dialog .skyline-btn-dark {
  background: #1A1A1A;
  border: 1px solid #1A1A1A;
  color: #FFFFFF;
  font-family: 'Montserrat', sans-serif;
  font-size: 0.85rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s ease;
  flex: 1;
  padding: 14px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.skyline-dialog .skyline-btn-dark:hover {
  background: #C86236;
  border-color: #C86236;
}
.skyline-dialog .skyline-btn-dark:disabled,
.skyline-dialog .skyline-btn-outline:disabled {
  opacity: 0.5;
  cursor: default;
}
.skyline-dialog .w-100 { width: 100%; }

/* Vista de Éxito */
.skyline-dialog .dialog-success {
  padding: 2.5rem 2rem;
  text-align: center;
}
.skyline-dialog .dialog-success-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.8rem;
  margin: 1rem 0 0.5rem;
  color: #1A1A1A;
}
.skyline-dialog .dialog-success-sub {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 1.5rem;
  line-height: 1.5;
}
.skyline-dialog .success-box {
  border-color: #c8e6c9 !important;
  margin-bottom: 1.5rem;
}
.skyline-dialog .success-amount {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.3rem;
  color: #2e7d32 !important;
}
.skyline-dialog .field-input-found {
  border-color: #0F6E56 !important;
  background: #f0faf5 !important;
}
.skyline-dialog .field-spinner {
  position: absolute;
  right: 10px;
  display: flex;
  align-items: center;
}
.skyline-dialog .field-found-badge {
  position: absolute;
  right: 10px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #0F6E56;
  white-space: nowrap;
}
.skyline-dialog .field-search-btn {
  position: absolute;
  right: 6px;
  background: #1B5E20;
  color: #FFFFFF;
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.skyline-dialog .field-search-btn:hover:not(:disabled) {
  background: #2E7D32;
}
.skyline-dialog .field-search-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

/* ==========================================================================
   SECCIÓN PROMOCIONAL VIDEO INSTITUCIONAL
   ========================================================================== */
.video-promo-section {
  position: relative;
}

.video-promo-card {
  position: relative;
  background: linear-gradient(135deg, #FAF7F2 0%, #F4ECE1 100%);
  border-radius: 20px;
  border: 1px solid rgba(200, 98, 54, 0.15);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.promo-bg-glow {
  position: absolute;
  top: -50%;
  right: -20%;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(27, 94, 32, 0.08) 0%, rgba(200, 98, 54, 0.04) 50%, transparent 70%);
  pointer-events: none;
}

.promo-badge {
  display: inline-flex;
  align-items: center;
  background: rgba(200, 98, 54, 0.12);
  color: #C86236;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 1px;
  padding: 5px 12px;
  border-radius: 20px;
  border: 1px solid rgba(200, 98, 54, 0.25);
  text-transform: uppercase;
}

.promo-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 2.1rem;
  font-weight: 700;
  color: #1A1A1A;
  line-height: 1.25;
  margin-top: 0.5rem;
  margin-bottom: 1rem;
}

.promo-lead {
  font-size: 0.98rem;
  line-height: 1.65;
  color: #555555;
}

.promo-feature-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.feature-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(27, 94, 32, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.feature-title {
  font-size: 0.95rem;
  color: #1A1A1A;
  display: block;
}

.feature-desc {
  font-size: 0.84rem;
  color: #666666;
  margin: 2px 0 0 0;
  line-height: 1.4;
}

.video-player-wrapper {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: #000000;
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(255, 255, 255, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.video-player-wrapper:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 42px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(200, 98, 54, 0.3);
}

.promo-video-player {
  width: 100%;
  max-height: 420px;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  display: block;
  background: #0a0a0a;
}

.video-caption-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #181818;
  color: #E0E0E0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.video-caption-text {
  font-size: 0.82rem;
  font-weight: 500;
  letter-spacing: 0.2px;
}

.video-hd-pill {
  font-size: 0.68rem;
  font-weight: 700;
  background: #C86236;
  color: #FFFFFF;
  padding: 2px 7px;
  border-radius: 4px;
  letter-spacing: 0.5px;
}

@media (max-width: 960px) {
  .promo-title {
    font-size: 1.65rem;
  }
  .promo-video-player {
    max-height: 280px;
  }
}
</style>
