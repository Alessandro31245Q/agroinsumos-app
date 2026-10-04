<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { user, perfil, esAdmin } from '../lib/auth'

const isAdmin = computed(() => esAdmin())

const cargando = ref(true)

// Métricas clave (sin repetir módulos)
const metricas = ref({
  productos: 0,
  proveedores: 0,
  activos: 0,
  empleados: 0,
})

// Datos para Gráfico 1: Balance de Inventario
const inventarioStats = ref({
  totalEntradas: 0,
  totalSalidas: 0,
  cantidadEntradas: 0,
  cantidadSalidas: 0,
  porcentajeEntradas: 50,
})

// Datos para Gráfico 2: Distribución de Talento Humano por Área
const distribucionAreas = ref([])

// Actividad reciente
const ultimosMovimientos = ref([])

// Saludo y usuario
const nombreUsuario = computed(() => {
  return perfil.value?.nombre || user.value?.email?.split('@')[0] || 'Usuario'
})

const fechaActual = computed(() => {
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
})

// Función limpia para contar tablas
async function contar(tabla) {
  const { count } = await supabase.from(tabla).select('*', { count: 'exact', head: true })
  return count || 0
}

async function cargarDatos() {
  cargando.value = true

  const [
    prodCount,
    provCount,
    actCount,
    empCount,
    movsRes,
    empAreasRes,
  ] = await Promise.all([
    contar('productos'),
    contar('proveedores'),
    contar('activos_fijos'),
    contar('empleados'),
    supabase
      .from('inventario_movimientos')
      .select('id, fecha, documento, tipo, cantidad, stock_resultante, productos(nombre)')
      .order('fecha', { ascending: false })
      .limit(60),
    supabase
      .from('empleados')
      .select('area')
      .eq('estado', 'Activo')
      .not('area', 'is', null),
  ])

  // 1. Métricas clave globales
  metricas.value = {
    productos: prodCount,
    proveedores: provCount,
    activos: actCount,
    empleados: empCount,
  }

  // 2. Gráfico de Balance de Inventario (Entradas vs Salidas)
  let entradasTotal = 0
  let salidasTotal = 0
  let cantEntradas = 0
  let cantSalidas = 0

  ;(movsRes.data || []).forEach((m) => {
    const cant = Number(m.cantidad) || 0
    const tipo = (m.tipo || '').toUpperCase()
    if (tipo === 'ENTRADA') {
      entradasTotal += cant
      cantEntradas += 1
    } else if (tipo === 'SALIDA') {
      salidasTotal += cant
      cantSalidas += 1
    }
  })

  const sumaUnidades = entradasTotal + salidasTotal
  const pctEntradas = sumaUnidades > 0 ? Math.round((entradasTotal / sumaUnidades) * 100) : 50

  inventarioStats.value = {
    totalEntradas: entradasTotal,
    totalSalidas: salidasTotal,
    cantidadEntradas: cantEntradas,
    cantidadSalidas: cantSalidas,
    porcentajeEntradas: pctEntradas,
  }

  // 3. Gráfico de Talento Humano por Área
  const conteoAreas = {}
  ;(empAreasRes.data || []).forEach((e) => {
    const a = e.area?.trim() || 'General'
    conteoAreas[a] = (conteoAreas[a] || 0) + 1
  })

  const totalEmpleadosActivos = empAreasRes.data?.length || 1
  distribucionAreas.value = Object.keys(conteoAreas)
    .sort((a, b) => conteoAreas[b] - conteoAreas[a])
    .slice(0, 5)
    .map((nombreArea) => ({
      nombre: nombreArea,
      cantidad: conteoAreas[nombreArea],
      porcentaje: Math.round((conteoAreas[nombreArea] / totalEmpleadosActivos) * 100),
    }))

  // 4. Últimos movimientos (solo los 5 más recientes)
  ultimosMovimientos.value = (movsRes.data || []).slice(0, 5)

  cargando.value = false
}

function formatearFecha(fechaStr) {
  if (!fechaStr) return '—'
  return new Date(fechaStr).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })
}

onMounted(cargarDatos)
</script>

<template>
  <v-container fluid class="pa-6" style="max-width: 1400px;">
    <!-- ENCABEZADO PRINCIPAL -->
    <div class="d-flex flex-wrap align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold">
          Panel de Control — Agroinsumos del Huila
        </h1>
        <p class="text-caption text-medium-emphasis mb-0">
          {{ fechaActual }} • Bienvenido, {{ nombreUsuario }}
        </p>
      </div>

      <div class="d-flex ga-2 mt-2 mt-sm-0">
        <v-btn
          color="primary"
          variant="tonal"
          icon="mdi-refresh"
          density="comfortable"
          :loading="cargando"
          @click="cargarDatos"
          class="ml-2"
        />
      </div>
    </div>

    <!-- 4 MÉTRICAS GLOBALES ESENCIALES (SIN REPETICIONES) -->
    <v-row dense class="mb-6">
      <v-col cols="6" sm="3">
        <v-card elevation="1" class="rounded-lg pa-4 bg-white border" :to="'/productos'">
          <div class="d-flex align-center justify-space-between mb-1">
            <span class="text-caption text-medium-emphasis font-weight-medium">Productos</span>
            <v-avatar size="28" color="primary" variant="tonal" rounded="lg">
              <v-icon size="16">mdi-package-variant</v-icon>
            </v-avatar>
          </div>
          <div class="text-h4 font-weight-bold text-primary">
            {{ cargando ? '—' : metricas.productos }}
          </div>
          <div class="text-caption text-medium-emphasis">En catálogo activo</div>
        </v-card>
      </v-col>

      <v-col cols="6" sm="3">
        <v-card elevation="1" class="rounded-lg pa-4 bg-white border" :to="'/proveedores'">
          <div class="d-flex align-center justify-space-between mb-1">
            <span class="text-caption text-medium-emphasis font-weight-medium">Proveedores</span>
            <v-avatar size="28" color="primary" variant="tonal" rounded="lg">
              <v-icon size="16">mdi-truck-delivery-outline</v-icon>
            </v-avatar>
          </div>
          <div class="text-h4 font-weight-bold text-primary">
            {{ cargando ? '—' : metricas.proveedores }}
          </div>
          <div class="text-caption text-medium-emphasis">Directorio comercial</div>
        </v-card>
      </v-col>

      <v-col cols="6" sm="3">
        <v-card elevation="1" class="rounded-lg pa-4 bg-white border" :to="'/activos-fijos'">
          <div class="d-flex align-center justify-space-between mb-1">
            <span class="text-caption text-medium-emphasis font-weight-medium">Activos Fijos</span>
            <v-avatar size="28" color="primary" variant="tonal" rounded="lg">
              <v-icon size="16">mdi-desk</v-icon>
            </v-avatar>
          </div>
          <div class="text-h4 font-weight-bold text-primary">
            {{ cargando ? '—' : metricas.activos }}
          </div>
          <div class="text-caption text-medium-emphasis">Bienes inventariados</div>
        </v-card>
      </v-col>

      <v-col cols="6" sm="3">
        <v-card elevation="1" class="rounded-lg pa-4 bg-white border" :to="'/empleados'">
          <div class="d-flex align-center justify-space-between mb-1">
            <span class="text-caption text-medium-emphasis font-weight-medium">Colaboradores</span>
            <v-avatar size="28" color="primary" variant="tonal" rounded="lg">
              <v-icon size="16">mdi-account-group-outline</v-icon>
            </v-avatar>
          </div>
          <div class="text-h4 font-weight-bold text-primary">
            {{ cargando ? '—' : metricas.empleados }}
          </div>
          <div class="text-caption text-medium-emphasis">Personal activo</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- 2 GRÁFICOS VISUALES EN VEZ DE INFORMACIÓN REPETIDA -->
    <v-row dense class="mb-6">
      <!-- GRÁFICO 1: BALANCE DE INVENTARIO (ENTRADAS VS SALIDAS) -->
      <v-col cols="12" md="6">
        <v-card elevation="1" class="rounded-lg pa-5 bg-white border fill-height d-flex flex-column justify-space-between">
          <div>
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="d-flex align-center">
                <v-avatar size="32" color="primary" variant="tonal" rounded="lg" class="mr-2">
                  <v-icon size="18">mdi-swap-horizontal</v-icon>
                </v-avatar>
                <div>
                  <div class="text-subtitle-1 font-weight-bold">Balance de Inventario</div>
                  <div class="text-caption text-medium-emphasis">Flujo de unidades (Entradas vs Salidas)</div>
                </div>
              </div>
              <v-btn variant="text" size="small" color="primary" to="/inventario" class="text-none">
                Kardex
              </v-btn>
            </div>

            <!-- Barra gráfica de proporción -->
            <div class="mb-3">
              <div class="d-flex justify-space-between text-caption font-weight-bold mb-1">
                <span>Entradas: {{ inventarioStats.porcentajeEntradas }}%</span>
                <span>Salidas: {{ 100 - inventarioStats.porcentajeEntradas }}%</span>
              </div>
              <v-progress-linear
                :model-value="inventarioStats.porcentajeEntradas"
                height="12"
                rounded
                color="primary"
                bg-color="grey-lighten-2"
              />
            </div>

            <!-- Desglose numérico -->
            <v-row dense class="mt-2 text-center">
              <v-col cols="6">
                <v-card variant="tonal" color="primary" class="rounded-lg pa-3">
                  <div class="text-caption font-weight-medium">Total Unidades Ingresadas</div>
                  <div class="text-h6 font-weight-bold">{{ inventarioStats.totalEntradas }}</div>
                  <div class="text-caption text-medium-emphasis">{{ inventarioStats.cantidadEntradas }} registros</div>
                </v-card>
              </v-col>
              <v-col cols="6">
                <v-card variant="outlined" class="rounded-lg pa-3 border">
                  <div class="text-caption font-weight-medium text-medium-emphasis">Total Unidades Despachadas</div>
                  <div class="text-h6 font-weight-bold text-slate-dark">{{ inventarioStats.totalSalidas }}</div>
                  <div class="text-caption text-medium-emphasis">{{ inventarioStats.cantidadSalidas }} registros</div>
                </v-card>
              </v-col>
            </v-row>
          </div>

          <div class="text-caption text-medium-emphasis mt-3 text-center">
            Calculado en base a los últimos movimientos registrados en el sistema.
          </div>
        </v-card>
      </v-col>

      <!-- GRÁFICO 2: DISTRIBUCIÓN DE TALENTO HUMANO POR ÁREAS -->
      <v-col cols="12" md="6">
        <v-card elevation="1" class="rounded-lg pa-5 bg-white border fill-height d-flex flex-column justify-space-between">
          <div>
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="d-flex align-center">
                <v-avatar size="32" color="primary" variant="tonal" rounded="lg" class="mr-2">
                  <v-icon size="18">mdi-chart-bar</v-icon>
                </v-avatar>
                <div>
                  <div class="text-subtitle-1 font-weight-bold">Distribución por Áreas</div>
                  <div class="text-caption text-medium-emphasis">Estructura del personal activo</div>
                </div>
              </div>
              <v-btn variant="text" size="small" color="primary" to="/organigrama" class="text-none">
                Ver Árbol
              </v-btn>
            </div>

            <!-- Gráfico de barras horizontales por departamento -->
            <div class="d-flex flex-column ga-3 mt-2">
              <div
                v-for="area in distribucionAreas"
                :key="area.nombre"
              >
                <div class="d-flex justify-space-between text-body-2 mb-1">
                  <span class="font-weight-medium">{{ area.nombre }}</span>
                  <span class="text-caption text-medium-emphasis font-weight-bold">
                    {{ area.cantidad }} colaboradores ({{ area.porcentaje }}%)
                  </span>
                </div>
                <v-progress-linear
                  :model-value="area.porcentaje"
                  height="8"
                  rounded
                  color="primary"
                />
              </div>

              <div v-if="distribucionAreas.length === 0" class="text-caption text-center text-medium-emphasis py-4">
                No hay áreas registradas con colaboradores activos.
              </div>
            </div>
          </div>

          <div class="text-caption text-medium-emphasis mt-3 text-center">
            Organizado jerárquicamente en el módulo de Organigrama.
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- AUDITORÍA RECIENTE (TABLA LIMPIA DE MOVIMIENTOS) -->
    <v-card elevation="1" class="rounded-lg bg-white border">
      <v-toolbar color="transparent" density="comfortable" class="px-4 border-b">
        <v-icon color="primary" size="20" class="mr-2">mdi-history</v-icon>
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          Últimas Operaciones de Kardex
        </v-toolbar-title>
        <v-spacer />
        <v-btn
          variant="text"
          size="small"
          color="primary"
          class="text-none font-weight-medium"
          to="/inventario"
        >
          Ver Historial Completo
        </v-btn>
      </v-toolbar>

      <v-table density="comfortable" hover>
        <thead>
          <tr>
            <th class="text-left font-weight-bold">Producto</th>
            <th class="text-left font-weight-bold">Documento</th>
            <th class="text-center font-weight-bold">Tipo</th>
            <th class="text-right font-weight-bold">Cantidad</th>
            <th class="text-right font-weight-bold">Saldo</th>
            <th class="text-right font-weight-bold">Fecha</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="mov in ultimosMovimientos" :key="mov.id">
            <td class="font-weight-medium">{{ mov.productos?.nombre || 'Producto' }}</td>
            <td class="text-medium-emphasis">{{ mov.documento || 'S/N' }}</td>
            <td class="text-center">
              <v-chip
                size="x-small"
                :color="(mov.tipo || '').toUpperCase() === 'ENTRADA' ? 'success' : 'primary'"
                :variant="(mov.tipo || '').toUpperCase() === 'ENTRADA' ? 'flat' : 'tonal'"
                class="font-weight-medium"
              >
                {{ mov.tipo }}
              </v-chip>
            </td>
            <td class="text-right font-weight-bold">{{ mov.cantidad }}</td>
            <td class="text-right text-medium-emphasis">{{ mov.stock_resultante }}</td>
            <td class="text-right text-caption text-medium-emphasis">{{ formatearFecha(mov.fecha) }}</td>
          </tr>
          <tr v-if="ultimosMovimientos.length === 0">
            <td colspan="6" class="text-center text-medium-emphasis py-4">
              No hay movimientos recientes registrados
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </v-container>
</template>
