<script setup>
import { ref, computed } from 'vue'
import Avatar from './Avatar.vue'

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
  nivel: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits([
  'toggle-expand',
  'cargar-mas',
  'ver-detalle',
  'cambiar-jefe',
  'drop-subordinado',
  'drag-start-nodo',
])

const isDragOver = ref(false)

const tieneHijos = computed(() => (props.node.totalSubordinados || 0) > 0)
const quedanPendientes = computed(() => {
  const cargados = props.node.subordinados?.length || 0
  const total = props.node.totalSubordinados || 0
  return total - cargados
})

// Drag and drop events
function onDragStart(event) {
  event.stopPropagation()
  event.dataTransfer.setData('text/plain', JSON.stringify({
    id: props.node.id,
    nombre: `${props.node.nombres} ${props.node.apellidos}`,
    cargo: props.node.cargo,
  }))
  event.dataTransfer.effectAllowed = 'move'
  emit('drag-start-nodo', props.node)
}

function onDragOver(event) {
  event.preventDefault()
  event.stopPropagation()
  event.dataTransfer.dropEffect = 'move'
  isDragOver.value = true
}

function onDragLeave(event) {
  event.stopPropagation()
  isDragOver.value = false
}

function onDrop(event) {
  event.preventDefault()
  event.stopPropagation()
  isDragOver.value = false

  try {
    const rawData = event.dataTransfer.getData('text/plain')
    if (!rawData) return
    const datosArrastrado = JSON.parse(rawData)

    // No permitir soltar sobre sí mismo
    if (datosArrastrado.id === props.node.id) return

    emit('drop-subordinado', {
      empleadoId: datosArrastrado.id,
      nuevoJefeId: props.node.id,
      nombreSubordinado: datosArrastrado.nombre,
      nombreJefe: `${props.node.nombres} ${props.node.apellidos}`,
    })
  } catch (e) {
    console.error('Error procesando drop:', e)
  }
}
</script>

<template>
  <div class="tree-branch-item">
    <!-- TARJETA DEL NODO (COLABORADOR / LÍDER) -->
    <div
      class="node-card elevation-2"
      :class="{
        'node-card-active': node.expandido && tieneHijos,
        'node-drag-target': isDragOver,
        'node-raiz-nivel': nivel === 0,
      }"
      draggable="true"
      @dragstart="onDragStart"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <!-- Header de la tarjeta -->
      <div class="node-header d-flex align-center justify-space-between px-3 py-1">
        <div class="d-flex align-center text-truncate mr-1">
          <v-icon size="14" color="white" class="mr-1">mdi-drag-vertical</v-icon>
          <span class="text-caption font-weight-bold text-white text-truncate">
            {{ node.area || 'General' }}
          </span>
        </div>
        <v-chip
          size="x-small"
          :color="node.estado === 'Activo' ? 'success' : node.estado === 'Retirado' ? 'error' : 'grey'"
          variant="flat"
          class="font-weight-medium"
        >
          {{ node.estado }}
        </v-chip>
      </div>

      <!-- Cuerpo de la tarjeta -->
      <div class="node-body pa-3" @click="emit('ver-detalle', node)">
        <div class="d-flex align-center">
          <Avatar
            :nombre="`${node.nombres} ${node.apellidos}`"
            :size="42"
            class="mr-3 flex-shrink-0"
          />
          <div class="text-truncate w-100">
            <div class="text-body-2 font-weight-bold text-truncate" :title="`${node.nombres} ${node.apellidos}`">
              {{ node.nombres }} {{ node.apellidos }}
            </div>
            <div class="text-caption text-primary font-weight-medium text-truncate" :title="node.cargo">
              {{ node.cargo }}
            </div>
            <div class="text-caption text-medium-emphasis mt-0" style="font-size: 11px;">
              CC {{ node.cedula }}
            </div>
          </div>
        </div>
      </div>

      <!-- Barra de acciones inferiores del nodo -->
      <div class="node-footer px-2 py-1 bg-grey-lighten-5 border-t d-flex align-center justify-space-between no-drag">
        <!-- Badge de subordinados y toggle expandir -->
        <div class="d-flex align-center">
          <v-chip
            v-if="tieneHijos"
            size="x-small"
            color="primary"
            variant="tonal"
            class="font-weight-bold cursor-pointer"
            @click.stop="emit('toggle-expand', node)"
          >
            <v-icon start size="12">mdi-account-multiple</v-icon>
            {{ node.subordinados?.length || 0 }}/{{ node.totalSubordinados }}
          </v-chip>
          <span v-else class="text-caption text-grey" style="font-size: 11px;">
            Sin subordinados
          </span>
        </div>

        <div class="d-flex align-center">
          <!-- Botón Reasignar superior / Mover debajo de -->
          <v-btn
            icon="mdi-account-switch"
            variant="text"
            density="compact"
            size="x-small"
            color="secondary"
            title="Mover debajo de otro colaborador..."
            @click.stop="emit('cambiar-jefe', node)"
          />

          <!-- Botón de expandir / colapsar subordinados si tiene -->
          <v-btn
            v-if="tieneHijos"
            :icon="node.expandido ? 'mdi-chevron-up' : 'mdi-chevron-down'"
            variant="text"
            density="compact"
            size="x-small"
            color="primary"
            :title="node.expandido ? 'Colapsar equipo' : 'Ver colaboradores a cargo'"
            @click.stop="emit('toggle-expand', node)"
          />
        </div>
      </div>
    </div>

    <!-- SUB-RAMA DE SUBORDINADOS (RECURSIVA) -->
    <template v-if="tieneHijos && node.expandido">
      <!-- Conector vertical entre padre e hijos -->
      <div class="tree-vertical-line"></div>

      <!-- Contenedor horizontal de hijos -->
      <div class="tree-children-container">
        <!-- Nodos hijos recursivos -->
        <TreeNode
          v-for="subordinado in node.subordinados"
          :key="subordinado.id"
          :node="subordinado"
          :nivel="nivel + 1"
          @toggle-expand="(n) => emit('toggle-expand', n)"
          @cargar-mas="(n) => emit('cargar-mas', n)"
          @ver-detalle="(n) => emit('ver-detalle', n)"
          @cambiar-jefe="(n) => emit('cambiar-jefe', n)"
          @drop-subordinado="(payload) => emit('drop-subordinado', payload)"
          @drag-start-nodo="(n) => emit('drag-start-nodo', n)"
        />

        <!-- TARJETA ESPECIAL: Cargar siguientes subordinados (Paginación bajo demanda) -->
        <div v-if="quedanPendientes > 0" class="tree-branch-item">
          <div
            class="node-card node-cargar-mas elevation-1 pa-2 text-center"
            :class="{ 'opacity-50 pointer-events-none': node.cargandoHijos }"
            @click.stop="emit('cargar-mas', node)"
          >
            <div v-if="node.cargandoHijos" class="d-flex align-center justify-center py-2">
              <v-progress-circular indeterminate size="18" width="2" color="primary" class="mr-2" />
              <span class="text-caption font-weight-medium">Cargando...</span>
            </div>
            <div v-else class="d-flex flex-column align-center justify-center py-1">
              <div class="d-flex align-center text-primary font-weight-bold text-caption">
                <v-icon size="16" class="mr-1">mdi-arrow-down-circle-outline</v-icon>
                Mostrar siguientes ({{ quedanPendientes }})
              </div>
              <span class="text-caption text-grey" style="font-size: 11px;">
                Página {{ (node.paginaActual || 0) + 1 }} • Carga bajo demanda
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.tree-branch-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  padding: 0 14px;
}

/* LÍNEAS CONECTORAS TIPO ÁRBOL */
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

/* Línea horizontal superior que une a todos los hermanos */
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

/* Cuando solo hay un hijo directo */
.tree-children-container > .tree-branch-item:only-child::after,
.tree-children-container > .tree-branch-item:only-child::before {
  display: none;
}

/* Primer hijo: sin línea a la izquierda */
.tree-children-container > .tree-branch-item:first-child::before {
  border: 0 none;
}

/* Último hijo: sin línea a la derecha */
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

/* ESTILOS DE LA TARJETA DEL NODO */
.node-card {
  width: 240px;
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  cursor: grab;
  transition: all 0.2s ease;
  user-select: none;
}

.node-card:active {
  cursor: grabbing;
}

.node-card:hover {
  transform: translateY(-2px);
  border-color: #0f766e;
  box-shadow: 0 6px 16px rgba(15, 118, 110, 0.15) !important;
}

.node-raiz-nivel {
  border-color: #0f766e;
  box-shadow: 0 4px 12px rgba(15, 118, 110, 0.12) !important;
}

.node-header {
  background: linear-gradient(135deg, #0f766e 0%, #115e59 100%);
}

.node-body {
  cursor: pointer;
  background-color: #ffffff;
}

.node-card-active {
  border-color: #0f766e;
}

/* Indicador visual de Drop Target */
.node-drag-target {
  border: 2px dashed #0284c7 !important;
  background-color: #f0f9ff !important;
  transform: scale(1.04);
  box-shadow: 0 8px 24px rgba(2, 132, 199, 0.3) !important;
}

/* Tarjeta Cargar Más */
.node-cargar-mas {
  background: #f0fdf4;
  border: 1.5px dashed #22c55e;
  cursor: pointer;
}

.node-cargar-mas:hover {
  background: #dcfce7;
  transform: translateY(-2px);
}

.cursor-pointer {
  cursor: pointer;
}
</style>
