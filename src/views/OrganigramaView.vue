<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { esAdmin } from '../lib/auth'
import TreeNode from '../components/TreeNode.vue'
import Avatar from '../components/Avatar.vue'

const router = useRouter()

// Permisos y estados de carga
const sinPermisos = ref(false)
const cargandoInicial = ref(true)
const guardandoJerarquia = ref(false)
const snackbar = ref({ show: false, text: '', color: 'success' })

function mostrarMensaje(text, color = 'success') {
  snackbar.value = { show: true, text, color }
}

// Filtros y paginación
const filtroEstado = ref('Activo')
const estados = ['Activo', 'Todos', 'Inactivo', 'Retirado']
const busquedaColaborador = ref('')
const TAMANO_PAGINA = 4

// Raíz Corporativa
const raizEmpresa = ref({
  nombre: 'Agroinsumos del Huila',
  subtitulo: 'Estructura Organizacional',
  totalEmpleados: 0,
})

// Lista de empleados de nivel superior (jefe_id IS NULL)
const nodosRaiz = ref([])
const totalNodosRaiz = ref(0)
const paginaRaiz = ref(0)
const cargandoMasRaiz = ref(false)

// Mapa de conteo de subordinados { [jefe_id]: count }
const conteoSubordinados = ref({})

// Todos los colaboradores para el buscador y el selector de nuevo jefe
const catalogoEmpleados = ref([])

// Canvas Pan & Zoom
const canvasContainer = ref(null)
const panX = ref(0)
const panY = ref(20)
const zoom = ref(1)
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })

// Modal de cambio de jerarquía ("Mover debajo de...")
const dialogCambioJefe = ref(false)
const empleadoAMover = ref(null)
const nuevoJefeSeleccionado = ref(null)

// Modal de confirmación tras arrastrar y soltar (Drag & Drop)
const dialogConfirmarDrop = ref(false)
const datosDropPendiente = ref(null)

// Modal de detalle rápido (Solo lectura)
const modalEmpleado = ref(false)
const empleadoSeleccionado = ref(null)

// --- PAN & ZOOM (MOVER EL ÁRBOL) ---
function iniciarArrastre(e) {
  if (e.target.closest('.node-card') || e.target.closest('button') || e.target.closest('.no-drag')) return
  isDragging.value = true
  dragStart.value = {
    x: e.clientX - panX.value,
    y: e.clientY - panY.value,
  }
}

function alMoverRaton(e) {
  if (!isDragging.value) return
  panX.value = e.clientX - dragStart.value.x
  panY.value = e.clientY - dragStart.value.y
}

function detenerArrastre() {
  isDragging.value = false
}

function ajustarZoom(delta) {
  const nuevoZoom = Math.min(Math.max(zoom.value + delta, 0.4), 1.8)
  zoom.value = parseFloat(nuevoZoom.toFixed(2))
}

function reiniciarVista() {
  panX.value = 0
  panY.value = 20
  zoom.value = 1
}

function alUsarRueda(e) {
  e.preventDefault()
  const factor = e.deltaY < 0 ? 0.08 : -0.08
  ajustarZoom(factor)
}

// --- CONSULTAS ÓPTIMAS A SUPABASE ---

// 1. Carga inicial:
//    - Actualiza el mapa global de conteo de subordinados
//    - Carga los empleados de nivel superior (jefe_id IS NULL)
//    - Carga catálogo ligero para el selector de jefes
async function cargarOrganigramaInicial() {
  cargandoInicial.value = true
  sinPermisos.value = false

  if (!esAdmin()) {
    sinPermisos.value = true
    cargandoInicial.value = false
    return
  }

  try {
    // A. Conteo global de empleados
    let qTotal = supabase.from('empleados').select('*', { count: 'exact', head: true })
    if (filtroEstado.value !== 'Todos') qTotal = qTotal.eq('estado', filtroEstado.value)
    const { count: totalEmp } = await qTotal
    raizEmpresa.value.totalEmpleados = totalEmp || 0

    // B. Conteo de subordinados por cada jefe (una sola consulta ligera para todo el organigrama)
    let qConteo = supabase.from('empleados').select('jefe_id').not('jefe_id', 'is', null)
    if (filtroEstado.value !== 'Todos') qConteo = qConteo.eq('estado', filtroEstado.value)
    const { data: dataConteo } = await qConteo

    const conteo = {}
    ;(dataConteo || []).forEach((row) => {
      conteo[row.jefe_id] = (conteo[row.jefe_id] || 0) + 1
    })
    conteoSubordinados.value = conteo

    // C. Cargar primer lote de líderes de nivel superior (jefe_id IS NULL)
    paginaRaiz.value = 0
    await cargarMasLideresRaiz(true)

    // D. Cargar catálogo para el selector de cambio de jerarquía
    cargarCatalogoParaSelector()
  } catch (err) {
    if (err.code === '42501' || err.message?.toLowerCase().includes('permission')) {
      sinPermisos.value = true
    } else {
      mostrarMensaje('Error al consultar organigrama: ' + err.message, 'error')
    }
  } finally {
    cargandoInicial.value = false
  }
}

// Cargar más líderes raíz (Paginación de la cúspide)
async function cargarMasLideresRaiz(reiniciar = false) {
  if (cargandoMasRaiz.value) return
  cargandoMasRaiz.value = true

  if (reiniciar) {
    nodosRaiz.value = []
    paginaRaiz.value = 0
  }

  const desde = paginaRaiz.value * TAMANO_PAGINA
  const hasta = desde + TAMANO_PAGINA - 1

  try {
    let q = supabase
      .from('empleados')
      .select('id, nombres, apellidos, cedula, cargo, area, estado, correo, telefono, jefe_id, orden', { count: 'exact' })
      .is('jefe_id', null)
      .order('orden', { ascending: true })
      .order('nombres', { ascending: true })
      .range(desde, hasta)

    if (filtroEstado.value !== 'Todos') {
      q = q.eq('estado', filtroEstado.value)
    }

    const { data, count, error } = await q

    if (error) throw error

    if (data) {
      const nuevos = data.map((emp) => ({
        ...emp,
        expandido: false,
        cargandoHijos: false,
        paginaActual: 0,
        subordinados: [],
        totalSubordinados: conteoSubordinados.value[emp.id] || 0,
      }))

      if (reiniciar) {
        nodosRaiz.value = nuevos
      } else {
        nodosRaiz.value = [...nodosRaiz.value, ...nuevos]
      }

      totalNodosRaiz.value = count || 0
      paginaRaiz.value += 1
    }
  } catch (err) {
    mostrarMensaje('Error al cargar líderes: ' + err.message, 'error')
  } finally {
    cargandoMasRaiz.value = false
  }
}

// 2. Carga paginada de subordinados de un nodo bajo demanda
async function cargarSubordinadosNodo(node) {
  if (node.cargandoHijos) return
  node.cargandoHijos = true

  const desde = (node.paginaActual || 0) * TAMANO_PAGINA
  const hasta = desde + TAMANO_PAGINA - 1

  try {
    let q = supabase
      .from('empleados')
      .select('id, nombres, apellidos, cedula, cargo, area, estado, correo, telefono, jefe_id, orden', { count: 'exact' })
      .eq('jefe_id', node.id)
      .order('orden', { ascending: true })
      .order('nombres', { ascending: true })
      .range(desde, hasta)

    if (filtroEstado.value !== 'Todos') {
      q = q.eq('estado', filtroEstado.value)
    }

    const { data, count, error } = await q

    if (error) throw error

    if (data) {
      const nuevosSubordinados = data.map((sub) => ({
        ...sub,
        expandido: false,
        cargandoHijos: false,
        paginaActual: 0,
        subordinados: [],
        totalSubordinados: conteoSubordinados.value[sub.id] || 0,
      }))

      node.subordinados = [...(node.subordinados || []), ...nuevosSubordinados]
      node.totalSubordinados = count ?? node.totalSubordinados
      node.paginaActual = (node.paginaActual || 0) + 1
    }
  } catch (err) {
    mostrarMensaje(`Error cargando equipo de ${node.nombres}: ${err.message}`, 'error')
  } finally {
    node.cargandoHijos = false
  }
}

// Alternar expansión de subordinados
async function onToggleExpand(node) {
  node.expandido = !node.expandido
  if (node.expandido && (!node.subordinados || node.subordinados.length === 0)) {
    await cargarSubordinadosNodo(node)
  }
}

// Cargar más subordinados de un nodo
async function onCargarMas(node) {
  await cargarSubordinadosNodo(node)
}

// Cargar catálogo de colaboradores para el modal selector de jefe
async function cargarCatalogoParaSelector() {
  const { data } = await supabase
    .from('empleados')
    .select('id, nombres, apellidos, cargo, area, jefe_id')
    .order('nombres', { ascending: true })
  catalogoEmpleados.value = data || []
}

// --- MODIFICAR QUIÉN VA ARRIBA DE QUIÉN (JERARQUÍA) ---

// Iniciar cambio de jefe desde el botón de la tarjeta
function abrirCambioJefe(nodo) {
  empleadoAMover.value = nodo
  nuevoJefeSeleccionado.value = nodo.jefe_id || null
  dialogCambioJefe.value = true
}

// Opciones de jefes elegibles (evita auto-asignarse)
const opcionesJefesElegibles = computed(() => {
  if (!empleadoAMover.value) return []
  return catalogoEmpleados.value
    .filter((emp) => emp.id !== empleadoAMover.value.id)
    .map((emp) => ({
      title: `${emp.nombres} ${emp.apellidos} — ${emp.cargo} (${emp.area || 'General'})`,
      value: emp.id,
    }))
})

// Ejecutar actualización de jefe_id en la base de datos
async function guardarNuevoJefe(empleadoId, nuevoJefeId, nombreSubordinado = '', nombreNuevoJefe = '') {
  guardandoJerarquia.value = true

  try {
    const { error } = await supabase
      .from('empleados')
      .update({ jefe_id: nuevoJefeId })
      .eq('id', empleadoId)

    if (error) {
      // Manejar la excepción del trigger de ciclos
      if (error.message?.includes('Ciclo de jerarquía') || error.message?.includes('validar_sin_ciclo_jerarquia')) {
        mostrarMensaje('No se puede asignar como superior: crearía un ciclo de jerarquía directo o indirecto.', 'error')
      } else {
        mostrarMensaje('Error al actualizar jerarquía: ' + error.message, 'error')
      }
      return false
    }

    const mensajeExito = nuevoJefeId
      ? `${nombreSubordinado || 'Colaborador'} ahora reporta a ${nombreNuevoJefe || 'su nuevo superior'}.`
      : `${nombreSubordinado || 'Colaborador'} ahora está en el nivel superior (Raíz).`

    mostrarMensaje(mensajeExito, 'success')

    // Recargar el organigrama para reflejar la nueva estructura de forma óptima
    await cargarOrganigramaInicial()
    return true
  } catch (err) {
    mostrarMensaje('Error inesperado: ' + err.message, 'error')
    return false
  } finally {
    guardandoJerarquia.value = false
  }
}

// Confirmar cambio desde el diálogo selector
async function confirmarCambioJefeDialogo() {
  if (!empleadoAMover.value) return

  const nuevoJefe = catalogoEmpleados.value.find((e) => e.id === nuevoJefeSeleccionado.value)
  const ok = await guardarNuevoJefe(
    empleadoAMover.value.id,
    nuevoJefeSeleccionado.value,
    `${empleadoAMover.value.nombres} ${empleadoAMover.value.apellidos}`,
    nuevoJefe ? `${nuevoJefe.nombres} ${nuevoJefe.apellidos}` : ''
  )

  if (ok) {
    dialogCambioJefe.value = false
    empleadoAMover.value = null
  }
}

// Manejar Drag & Drop (soltado sobre un nodo objetivo)
function onDropSubordinado(payload) {
  datosDropPendiente.value = payload
  dialogConfirmarDrop.value = true
}

async function confirmarDropSubordinado() {
  if (!datosDropPendiente.value) return

  const { empleadoId, nuevoJefeId, nombreSubordinado, nombreJefe } = datosDropPendiente.value
  const ok = await guardarNuevoJefe(empleadoId, nuevoJefeId, nombreSubordinado, nombreJefe)

  if (ok) {
    dialogConfirmarDrop.value = false
    datosDropPendiente.value = null
  }
}

// Ver ficha rápida de colaborador (Solo lectura)
function verDetalleEmpleado(nodo) {
  empleadoSeleccionado.value = nodo
  modalEmpleado.value = true
}

function irAHojaDeVida(id) {
  router.push(`/empleados/${id}`)
}

onMounted(() => {
  cargarOrganigramaInicial()
})
</script>

<template>
  <v-container fluid class="pa-0 organigrama-page fill-height d-flex flex-column">
    <!-- Pantalla de permisos restringidos -->
    <v-card v-if="sinPermisos" elevation="2" class="ma-6 pa-6 text-center rounded-lg">
      <v-icon color="warning" size="64" class="mb-4">mdi-shield-lock-outline</v-icon>
      <div class="text-h5 font-weight-bold mb-2">Acceso restringido</div>
      <div class="text-body-1 text-medium-emphasis mb-4">
        Solo los administradores pueden visualizar y estructurar el organigrama de Talento Humano.
      </div>
      <v-btn color="primary" variant="flat" to="/productos" prepend-icon="mdi-arrow-left" class="text-none">
        Ir a Inicio
      </v-btn>
    </v-card>

    <template v-else>
      <!-- BARRA SUPERIOR DE HERRAMIENTAS Y CONTROL -->
      <v-sheet elevation="1" class="w-100 px-4 py-2 border-b organigrama-header d-flex flex-wrap align-center justify-space-between">
        <div class="d-flex align-center mr-4">
          <v-icon color="primary" size="28" class="mr-2">mdi-sitemap</v-icon>
          <div>
            <div class="text-subtitle-1 font-weight-bold lh-sm">Organigrama Institucional</div>
            <div class="text-caption text-medium-emphasis d-none d-sm-block">
              Jerarquía en árbol • Paginación bajo demanda • Reordena arrastrando tarjetas
            </div>
          </div>
        </div>

        <div class="d-flex flex-wrap align-center gap-2">
          <!-- Filtro de estado -->
          <v-select
            v-model="filtroEstado"
            :items="estados"
            label="Estado"
            density="compact"
            variant="outlined"
            hide-details
            style="width: 135px"
            @update:model-value="cargarOrganigramaInicial"
            prepend-inner-icon="mdi-filter-variant"
          />

          <!-- Botón recargar organigrama -->
          <v-btn
            icon="mdi-refresh"
            size="small"
            variant="tonal"
            color="primary"
            title="Recargar organigrama"
            :loading="cargandoInicial"
            @click="cargarOrganigramaInicial"
          />

          <!-- Controles de Navegación de Canvas / Mover el árbol -->
          <v-btn-group density="comfortable" variant="outlined" class="elevation-1">
            <v-btn icon="mdi-magnify-minus-outline" size="small" title="Alejar (-)" @click="ajustarZoom(-0.15)" />
            <v-btn size="small" class="text-caption font-weight-bold px-2" title="Nivel de zoom">
              {{ Math.round(zoom * 100) }}%
            </v-btn>
            <v-btn icon="mdi-magnify-plus-outline" size="small" title="Acercar (+)" @click="ajustarZoom(0.15)" />
            <v-btn icon="mdi-crosshairs-gps" size="small" title="Centrar y reiniciar vista" @click="reiniciarVista" />
          </v-btn-group>
        </div>
      </v-sheet>

      <!-- BARRA DE INSTRUCCIONES RÁPIDAS -->
      <div class="instruccion-banner text-caption text-medium-emphasis px-4 py-1 text-center bg-grey-lighten-4 border-b d-flex align-center justify-center flex-wrap gap-2">
        <span><v-icon size="14" class="mr-1">mdi-cursor-move</v-icon><strong>Arrastra el fondo</strong> para mover el árbol libremente</span>
        <span class="d-none d-md-inline">•</span>
        <span><v-icon size="14" class="mr-1">mdi-drag-variant</v-icon><strong>Arrastra una tarjeta sobre otra</strong> o usa <v-icon size="14">mdi-account-switch</v-icon> para modificar quién va arriba de quién</span>
        <span class="d-none d-md-inline">•</span>
        <span><v-icon size="14" class="mr-1">mdi-arrow-down-circle</v-icon>Haz clic en <strong>Mostrar siguientes</strong> para cargar más colaboradores</span>
      </div>

      <!-- VIEWPORT PRINCIPAL CON PAN & ZOOM -->
      <div
        ref="canvasContainer"
        class="organigrama-viewport"
        :class="{ dragging: isDragging }"
        @mousedown="iniciarArrastre"
        @mousemove="alMoverRaton"
        @mouseup="detenerArrastre"
        @mouseleave="detenerArrastre"
        @wheel="alUsarRueda"
      >
        <!-- Overlay de carga inicial -->
        <div v-if="cargandoInicial" class="cargando-overlay d-flex flex-column align-center justify-center">
          <v-progress-circular indeterminate color="primary" size="56" width="5" class="mb-4" />
          <span class="text-subtitle-1 font-weight-medium">Cargando estructura organizacional...</span>
          <span class="text-caption text-medium-emphasis">Consultando jerarquía de colaboradores</span>
        </div>

        <!-- Canvas del árbol -->
        <div
          v-else
          class="organigrama-canvas"
          :style="{
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          }"
        >
          <div class="tree-root">
            <!-- NODO RAÍZ: EMPRESA -->
            <div class="tree-node node-empresa elevation-3 mb-2">
              <div class="empresa-header d-flex align-center justify-center px-4 py-2">
                <v-icon color="white" class="mr-2">mdi-domain</v-icon>
                <span class="text-subtitle-1 font-weight-bold text-white">{{ raizEmpresa.nombre }}</span>
              </div>
              <div class="empresa-body px-4 py-2 text-center bg-white">
                <div class="text-caption font-weight-medium text-grey-darken-1">{{ raizEmpresa.subtitulo }}</div>
                <div class="d-flex align-center justify-center gap-2 mt-1">
                  <v-chip size="x-small" color="primary" variant="flat" class="font-weight-bold">
                    {{ totalNodosRaiz }} Líderes Principales
                  </v-chip>
                  <v-chip size="x-small" color="success" variant="flat" class="font-weight-bold">
                    {{ raizEmpresa.totalEmpleados }} Total Colaboradores
                  </v-chip>
                </div>
              </div>
            </div>

            <!-- Conector vertical desde la empresa -->
            <div class="tree-vertical-line" v-if="nodosRaiz.length > 0"></div>

            <!-- CONTENEDOR DE LÍDERES RAÍZ (jefe_id IS NULL) -->
            <div class="tree-children-container" v-if="nodosRaiz.length > 0">
              <TreeNode
                v-for="lider in nodosRaiz"
                :key="lider.id"
                :node="lider"
                :nivel="0"
                @toggle-expand="onToggleExpand"
                @cargar-mas="onCargarMas"
                @ver-detalle="verDetalleEmpleado"
                @cambiar-jefe="abrirCambioJefe"
                @drop-subordinado="onDropSubordinado"
              />

              <!-- Tarjeta de paginación para más líderes principales de la raíz -->
              <div v-if="nodosRaiz.length < totalNodosRaiz" class="tree-branch-item">
                <div
                  class="node-card node-cargar-mas elevation-1 pa-2 text-center"
                  :class="{ 'opacity-50 pointer-events-none': cargandoMasRaiz }"
                  @click.stop="cargarMasLideresRaiz(false)"
                >
                  <div v-if="cargandoMasRaiz" class="d-flex align-center justify-center py-2">
                    <v-progress-circular indeterminate size="18" width="2" color="primary" class="mr-2" />
                    <span class="text-caption font-weight-medium">Cargando...</span>
                  </div>
                  <div v-else class="d-flex flex-column align-center justify-center py-1">
                    <div class="d-flex align-center text-primary font-weight-bold text-caption">
                      <v-icon size="16" class="mr-1">mdi-arrow-down-circle-outline</v-icon>
                      Mostrar más líderes ({{ totalNodosRaiz - nodosRaiz.length }} restantes)
                    </div>
                    <span class="text-caption text-grey" style="font-size: 11px;">
                      Página {{ paginaRaiz + 1 }} • Carga bajo demanda
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Si no hay empleados con jefe_id IS NULL -->
            <div v-else class="pa-6 bg-white border rounded-lg text-center mt-4">
              <v-icon size="36" color="grey" class="mb-2">mdi-account-search</v-icon>
              <div class="text-body-2 font-weight-bold">No se encontraron líderes principales</div>
              <div class="text-caption text-medium-emphasis">Todos los empleados tienen un superior asignado o no coinciden con el filtro.</div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- DIÁLOGO: MODIFICAR QUIÉN VA ARRIBA DE QUIÉN (SELECTOR) -->
    <v-dialog v-model="dialogCambioJefe" max-width="500">
      <v-card v-if="empleadoAMover" rounded="lg" elevation="6">
        <v-card-title class="bg-primary text-white d-flex align-center py-3 px-4">
          <v-icon class="mr-2">mdi-account-switch</v-icon>
          <span class="text-h6 font-weight-bold">Modificar Jerarquía</span>
        </v-card-title>

        <v-card-text class="pa-4">
          <div class="text-body-2 mb-3">
            Selecciona a quién reportará directamente el colaborador:
          </div>

          <div class="d-flex align-center pa-3 mb-4 rounded-lg bg-grey-lighten-4 border">
            <Avatar :nombre="`${empleadoAMover.nombres} ${empleadoAMover.apellidos}`" :size="40" class="mr-3" />
            <div>
              <div class="font-weight-bold">{{ empleadoAMover.nombres }} {{ empleadoAMover.apellidos }}</div>
              <div class="text-caption text-primary">{{ empleadoAMover.cargo }}</div>
            </div>
          </div>

          <v-autocomplete
            v-model="nuevoJefeSeleccionado"
            :items="opcionesJefesElegibles"
            item-title="title"
            item-value="value"
            label="Superior directo / Jefe inmediato"
            placeholder="Buscar por nombre o cargo..."
            variant="outlined"
            density="comfortable"
            clearable
            prepend-inner-icon="mdi-account-tie"
            hint="Si lo dejas vacío o deseleccionas, pasará al nivel superior (Raíz / Dirección)"
            persistent-hint
          />
        </v-card-text>

        <v-card-actions class="px-4 pb-4 pt-0 d-flex justify-space-between">
          <v-btn variant="text" color="grey-darken-1" @click="dialogCambioJefe = false" :disabled="guardandoJerarquia">
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="guardandoJerarquia"
            @click="confirmarCambioJefeDialogo"
            class="text-none"
          >
            Guardar Jerarquía
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- DIÁLOGO: CONFIRMAR DRAG & DROP -->
    <v-dialog v-model="dialogConfirmarDrop" max-width="450">
      <v-card v-if="datosDropPendiente" rounded="lg" elevation="6">
        <v-card-title class="bg-primary text-white d-flex align-center py-3 px-4">
          <v-icon class="mr-2">mdi-help-circle-outline</v-icon>
          <span class="text-h6 font-weight-bold">Confirmar Reorganización</span>
        </v-card-title>

        <v-card-text class="pa-4 text-center">
          <div class="text-body-1 mb-3">
            ¿Deseas mover a <strong>{{ datosDropPendiente.nombreSubordinado }}</strong> para que reporte directamente a <strong>{{ datosDropPendiente.nombreJefe }}</strong>?
          </div>
          <div class="text-caption text-medium-emphasis">
            Esta acción actualizará la jerarquía oficial en la base de datos sin alterar ningún otro dato del colaborador.
          </div>
        </v-card-text>

        <v-card-actions class="px-4 pb-4 pt-0 d-flex justify-space-between">
          <v-btn variant="text" color="grey-darken-1" @click="dialogConfirmarDrop = false" :disabled="guardandoJerarquia">
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="guardandoJerarquia"
            @click="confirmarDropSubordinado"
            class="text-none"
          >
            Sí, Reasignar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- MODAL DE DETALLE RÁPIDO (SOLO VISTA) -->
    <v-dialog v-model="modalEmpleado" max-width="500">
      <v-card v-if="empleadoSeleccionado" rounded="lg" elevation="6">
        <v-card-title class="bg-primary text-white d-flex align-center justify-space-between py-3 px-4">
          <div class="d-flex align-center">
            <v-icon class="mr-2">mdi-account-box-outline</v-icon>
            <span class="text-h6 font-weight-bold">Ficha de Colaborador</span>
          </div>
          <v-btn icon="mdi-close" variant="text" density="compact" color="white" @click="modalEmpleado = false" />
        </v-card-title>

        <v-card-text class="pa-4">
          <div class="d-flex align-center mb-4">
            <Avatar
              :nombre="`${empleadoSeleccionado.nombres} ${empleadoSeleccionado.apellidos}`"
              :size="54"
              class="mr-4"
            />
            <div>
              <div class="text-h6 font-weight-bold">
                {{ empleadoSeleccionado.nombres }} {{ empleadoSeleccionado.apellidos }}
              </div>
              <div class="text-subtitle-2 text-primary font-weight-medium">
                {{ empleadoSeleccionado.cargo }}
              </div>
              <v-chip
                size="small"
                :color="empleadoSeleccionado.estado === 'Activo' ? 'success' : empleadoSeleccionado.estado === 'Retirado' ? 'error' : 'grey'"
                class="mt-1 font-weight-medium"
              >
                {{ empleadoSeleccionado.estado }}
              </v-chip>
            </div>
          </div>

          <v-divider class="mb-4" />

          <v-row dense class="text-body-2">
            <v-col cols="6" class="mb-2">
              <span class="text-caption text-medium-emphasis d-block">Área / Departamento</span>
              <strong>{{ empleadoSeleccionado.area || '—' }}</strong>
            </v-col>
            <v-col cols="6" class="mb-2">
              <span class="text-caption text-medium-emphasis d-block">Cédula de Ciudadanía</span>
              <strong>{{ empleadoSeleccionado.cedula }}</strong>
            </v-col>

            <v-col cols="6" class="mb-2">
              <span class="text-caption text-medium-emphasis d-block">Colaboradores a cargo</span>
              <strong>{{ empleadoSeleccionado.totalSubordinados || 0 }}</strong>
            </v-col>
            <v-col cols="6" class="mb-2">
              <span class="text-caption text-medium-emphasis d-block">Estado</span>
              <span>{{ empleadoSeleccionado.estado }}</span>
            </v-col>

            <v-col cols="12" class="mb-2" v-if="empleadoSeleccionado.correo">
              <span class="text-caption text-medium-emphasis d-block">Correo Electrónico</span>
              <div class="d-flex align-center">
                <v-icon size="16" class="mr-1 text-medium-emphasis">mdi-email-outline</v-icon>
                <a :href="`mailto:${empleadoSeleccionado.correo}`" class="text-primary text-decoration-none">
                  {{ empleadoSeleccionado.correo }}
                </a>
              </div>
            </v-col>

            <v-col cols="12" class="mb-2" v-if="empleadoSeleccionado.telefono">
              <span class="text-caption text-medium-emphasis d-block">Teléfono / Celular</span>
              <div class="d-flex align-center">
                <v-icon size="16" class="mr-1 text-medium-emphasis">mdi-phone-outline</v-icon>
                <span>{{ empleadoSeleccionado.telefono }}</span>
              </div>
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions class="px-4 pb-4 pt-0 d-flex justify-space-between">
          <v-btn variant="text" color="grey-darken-1" @click="modalEmpleado = false" class="text-none">
            Cerrar
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            prepend-icon="mdi-badge-account-horizontal-outline"
            @click="irAHojaDeVida(empleadoSeleccionado.id)"
            class="text-none"
          >
            Ver Hoja de Vida Completa
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar de notificaciones -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3500"
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
.organigrama-page {
  position: relative;
  overflow: hidden;
  height: calc(100vh - 64px);
  background-color: #f8fafc;
}

.organigrama-header {
  z-index: 10;
  background-color: #ffffff;
}

.instruccion-banner {
  z-index: 9;
}

/* VIEWPORT PAN & ZOOM */
.organigrama-viewport {
  position: relative;
  width: 100%;
  flex: 1;
  overflow: hidden;
  cursor: grab;
  user-select: none;
  background-image: radial-gradient(rgba(0, 0, 0, 0.08) 1px, transparent 1px);
  background-size: 24px 24px;
}

.organigrama-viewport.dragging {
  cursor: grabbing;
}

.organigrama-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  min-height: 100%;
  transform-origin: 50% 40px;
  transition: transform 0.04s linear;
  display: flex;
  justify-content: center;
  padding: 40px;
}

.cargando-overlay {
  height: 100%;
  min-height: 400px;
}

/* ÁRBOL DEL ORGANIGRAMA */
.tree-root {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tree-vertical-line {
  width: 2px;
  height: 24px;
  background-color: #94a3b8;
}

.tree-children-container {
  display: flex;
  justify-content: center;
  position: relative;
  padding-top: 24px;
}

.tree-children-container > .tree-branch-item::before,
.tree-children-container > .tree-branch-item::after {
  content: '';
  position: absolute;
  top: 0;
  right: 50%;
  border-top: 2px solid #94a3b8;
  width: 50%;
  height: 24px;
}

.tree-children-container > .tree-branch-item::after {
  right: auto;
  left: 50%;
  border-left: 2px solid #94a3b8;
}

.tree-children-container > .tree-branch-item:only-child::after,
.tree-children-container > .tree-branch-item:only-child::before {
  display: none;
}

.tree-children-container > .tree-branch-item:first-child::before {
  border: 0 none;
}

.tree-children-container > .tree-branch-item:last-child::after {
  border: 0 none;
}

.tree-children-container > .tree-branch-item:first-child::after {
  border-radius: 8px 0 0 0;
}

.tree-children-container > .tree-branch-item:last-child::before {
  border-right: 2px solid #94a3b8;
  border-radius: 0 8px 0 0;
}

/* NODOS */
.tree-branch-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  padding: 0 14px;
}

.node-card {
  width: 240px;
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.node-empresa {
  width: 300px;
  background: #ffffff;
  border: 2px solid #0f766e;
  border-radius: 10px;
  overflow: hidden;
}

.node-empresa .empresa-header {
  background: linear-gradient(135deg, #0f766e 0%, #115e59 100%);
}

.node-cargar-mas {
  background: #f0fdf4;
  border: 1.5px dashed #22c55e;
  cursor: pointer;
}

.node-cargar-mas:hover {
  background: #dcfce7;
  transform: translateY(-2px);
}

.gap-2 {
  gap: 8px;
}

.lh-sm {
  line-height: 1.25;
}
</style>
