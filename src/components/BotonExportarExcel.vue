<script setup>
import { ref } from 'vue'
import { exportarExcelDesdeCache, exportarLibroMaestroCompletoERP } from '../lib/excelService'
import { erpCache } from '../lib/erpDataCache'

const props = defineProps({
  titulo: {
    type: String,
    default: 'Reporte de Datos'
  },
  subtitulo: {
    type: String,
    default: 'AgroInsumos del Huila S.A.S.'
  },
  nombreArchivo: {
    type: String,
    default: 'Reporte'
  },
  columnas: {
    type: Array,
    required: true
  },
  datosFiltrados: {
    type: Array,
    default: () => []
  },
  datosTodos: {
    type: Array,
    default: () => []
  },
  kpis: {
    type: Array,
    default: () => []
  },
  size: {
    type: String,
    default: 'default'
  },
  variant: {
    type: String,
    default: 'elevated'
  }
})

const emit = defineEmits(['exportado', 'error'])

const menu = ref(false)
const exportando = ref(false)

async function ejecutarExportacion(tipo = 'maestro') {
  menu.value = false
  exportando.value = true

  try {
    if (tipo === 'maestro') {
      // ══════════════════════════════════════════════════════════════════════
      // EXPORTAR TODO EL LIBRO MAESTRO (Todas las secciones en un solo Excel)
      // ══════════════════════════════════════════════════════════════════════
      await exportarLibroMaestroCompletoERP()
      emit('exportado', { tipo: 'maestro', total: 'Completo ERP' })
      return
    }

    let dataset = []
    let incluirResumen = false
    let sufijo = ''

    if (tipo === 'filtrados') {
      dataset = props.datosFiltrados && props.datosFiltrados.length > 0 ? props.datosFiltrados : props.datosTodos
      sufijo = 'Vista_Filtrada'
      incluirResumen = props.kpis && props.kpis.length > 0
    } else if (tipo === 'todos') {
      dataset = props.datosTodos && props.datosTodos.length > 0 ? props.datosTodos : props.datosFiltrados
      sufijo = 'Completo_En_Cache'
      incluirResumen = props.kpis && props.kpis.length > 0
    }

    if (!dataset || dataset.length === 0) {
      alert('No hay datos en memoria para exportar.')
      exportando.value = false
      return
    }

    await exportarExcelDesdeCache({
      nombreArchivo: `${props.nombreArchivo}_${sufijo}`,
      tituloReporte: props.titulo,
      subtitulo: props.subtitulo,
      columnas: props.columnas,
      datos: dataset,
      kpis: props.kpis,
      incluirResumen: incluirResumen
    })

    emit('exportado', { tipo, total: dataset.length })
  } catch (err) {
    console.error('Error al generar Excel desde memoria:', err)
    emit('error', err)
  } finally {
    exportando.value = false
  }
}
</script>

<template>
  <v-menu v-model="menu" :close-on-content-click="false" location="bottom end">
    <template #activator="{ props: menuProps }">
      <v-btn
        v-bind="menuProps"
        color="success"
        :variant="variant"
        :size="size"
        :loading="exportando"
        prepend-icon="mdi-microsoft-excel"
        append-icon="mdi-chevron-down"
        class="text-none font-weight-bold shadow-sm export-btn"
      >
        Exportar Excel
        <v-tooltip activator="parent" location="top">
          Descargar libro Excel interactivo con filtros nativos
        </v-tooltip>
      </v-btn>
    </template>

    <v-card class="rounded-xl border shadow-xl overflow-hidden" min-width="320">
      <!-- Encabezado del Menú -->
      <div class="px-4 py-3 bg-green-darken-4 text-white d-flex align-center">
        <v-icon icon="mdi-file-excel-box" class="mr-2" size="24" color="green-lighten-3"></v-icon>
        <div>
          <div class="text-caption font-weight-bold text-uppercase" style="letter-spacing: 0.5px;">
            Exportación Oficial ERP
          </div>
          <div class="text-caption text-green-lighten-4" style="font-size: 0.75rem !important;">
            Formato ejecutivo • Filtros automáticos • Memoria activa
          </div>
        </div>
      </div>

      <v-list density="compact" class="py-1">
        <!-- OPCIÓN DESTACADA: TODO EL LIBRO MAESTRO (TODO EL ERP) -->
        <v-list-item
          @click="ejecutarExportacion('maestro')"
          prepend-icon="mdi-book-open-page-variant"
          class="py-3 bg-green-lighten-5"
        >
          <v-list-item-title class="font-weight-bold text-body-2 text-green-darken-4 d-flex align-center">
            <span>📗 Exportar TODO el ERP (Libro Maestro)</span>
            <v-chip size="x-small" color="success" class="ml-2 font-weight-bold">Todo en 1</v-chip>
          </v-list-item-title>
          <v-list-item-subtitle class="text-caption text-green-darken-3 mt-1" style="line-height: 1.2;">
            Pestañas de Resumen, Clientes, Productos, Ventas e Inventario juntas.
          </v-list-item-subtitle>
        </v-list-item>

        <v-divider class="my-1"></v-divider>

        <div class="px-4 pt-2 pb-1 text-caption font-weight-bold text-medium-emphasis text-uppercase" style="font-size: 0.7rem !important;">
          Opciones de esta sección:
        </div>

        <!-- Opción 2: Vista Actual Filtrada -->
        <v-list-item
          @click="ejecutarExportacion('filtrados')"
          prepend-icon="mdi-filter-check-outline"
          class="py-2"
        >
          <v-list-item-title class="font-weight-medium text-body-2">
            Solo lo filtrado en pantalla
          </v-list-item-title>
          <v-list-item-subtitle class="text-caption text-medium-emphasis">
            {{ datosFiltrados.length }} registros actuales
          </v-list-item-subtitle>
        </v-list-item>

        <!-- Opción 3: Todo el Módulo Actual -->
        <v-list-item
          @click="ejecutarExportacion('todos')"
          prepend-icon="mdi-table-multiple"
          class="py-2"
        >
          <v-list-item-title class="font-weight-medium text-body-2">
            Toda esta sección (Sin filtros)
          </v-list-item-title>
          <v-list-item-subtitle class="text-caption text-medium-emphasis">
            {{ datosTodos.length || datosFiltrados.length }} registros en caché
          </v-list-item-subtitle>
        </v-list-item>
      </v-list>

      <!-- Badge informativo offline/memoria -->
      <div class="px-3 py-2 bg-grey-lighten-4 border-t d-flex align-center text-caption text-grey-darken-1">
        <v-icon icon="mdi-check-decagram" size="14" class="mr-1 text-green-darken-2"></v-icon>
        <span style="font-size: 0.72rem;">100% Caché local • Cero consultas al servidor</span>
      </div>
    </v-card>
  </v-menu>
</template>

<style scoped>
.export-btn {
  background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%) !important;
  color: white !important;
  box-shadow: 0 4px 10px rgba(27, 94, 32, 0.25) !important;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.export-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(27, 94, 32, 0.35) !important;
}
</style>
