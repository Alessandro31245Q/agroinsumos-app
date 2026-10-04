<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { esAdmin } from '../lib/auth'
import Avatar from '../components/Avatar.vue'

const route = useRoute()
const router = useRouter()

const empleado = ref(null)
const loading = ref(true)
const sinPermisos = ref(false)
const dialogEliminar = ref(false)
const eliminando = ref(false)
const snackbar = ref({ show: false, text: '', color: 'success' })

function mostrarMensaje(text, color = 'success') {
  snackbar.value = { show: true, text, color }
}

const nombreCompleto = computed(() => {
  if (!empleado.value) return ''
  return `${empleado.value.nombres} ${empleado.value.apellidos}`
})

// Experiencias ordenadas del más reciente al más antiguo
const experienciasOrdenadas = computed(() => {
  if (!empleado.value?.empleados_experiencia) return []
  return [...empleado.value.empleados_experiencia].sort((a, b) => {
    const fechaA = new Date(a.fecha_inicio || 0)
    const fechaB = new Date(b.fecha_inicio || 0)
    return fechaB - fechaA
  })
})

// Educación ordenada por fecha de graduación más reciente
const educacionOrdenada = computed(() => {
  if (!empleado.value?.empleados_educacion) return []
  return [...empleado.value.empleados_educacion].sort((a, b) => {
    const fechaA = new Date(a.fecha_graduacion || 0)
    const fechaB = new Date(b.fecha_graduacion || 0)
    return fechaB - fechaA
  })
})

function formatearFecha(fechaStr) {
  if (!fechaStr) return '—'
  try {
    const [year, month, day] = fechaStr.split('-')
    const fecha = new Date(year, month - 1, day || 1)
    return fecha.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: day ? 'numeric' : undefined,
    })
  } catch {
    return fechaStr
  }
}

async function cargarDetalle() {
  loading.value = true
  sinPermisos.value = false

  if (!esAdmin()) {
    sinPermisos.value = true
    loading.value = false
    return
  }

  const { id } = route.params

  // UNA SOLA llamada anidada para evitar N+1
  const { data, error } = await supabase
    .from('empleados')
    .select('*, empleados_educacion(*), empleados_experiencia(*)')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === '42501' || error.message?.toLowerCase().includes('permission') || error.message?.toLowerCase().includes('policy')) {
      sinPermisos.value = true
    } else {
      mostrarMensaje('Error cargando empleado: ' + error.message, 'error')
    }
  } else {
    empleado.value = data
  }

  loading.value = false
}

async function confirmarEliminar() {
  eliminando.value = true
  const { error } = await supabase
    .from('empleados')
    .delete()
    .eq('id', empleado.value.id)

  if (error) {
    mostrarMensaje('Error al eliminar empleado: ' + error.message, 'error')
    eliminando.value = false
    dialogEliminar.value = false
    return
  }

  mostrarMensaje('Empleado eliminado correctamente')
  dialogEliminar.value = false
  setTimeout(() => {
    router.push('/empleados')
  }, 500)
}

onMounted(cargarDetalle)
</script>

<template>
  <v-container fluid class="pa-6">
    <!-- Pantalla sin permisos RLS -->
    <v-card v-if="sinPermisos" elevation="2" class="rounded-lg pa-6 text-center">
      <v-icon color="warning" size="64" class="mb-4">mdi-shield-lock-outline</v-icon>
      <div class="text-h5 font-weight-bold mb-2">Acceso restringido</div>
      <div class="text-body-1 text-medium-emphasis mb-4">
        No tienes permisos para ver este módulo. Se requiere rol de administrador.
      </div>
      <v-btn color="primary" variant="flat" to="/productos" prepend-icon="mdi-arrow-left" class="text-none">
        Ir a Inicio
      </v-btn>
    </v-card>

    <!-- Cargando -->
    <div v-else-if="loading" class="d-flex justify-center align-center py-12">
      <v-progress-circular indeterminate color="primary" size="48" />
    </div>

    <!-- No encontrado -->
    <v-card v-else-if="!empleado" elevation="2" class="rounded-lg pa-6 text-center">
      <v-icon color="grey" size="64" class="mb-4">mdi-account-off-outline</v-icon>
      <div class="text-h6 font-weight-bold mb-2">Empleado no encontrado</div>
      <v-btn color="primary" variant="flat" to="/empleados" prepend-icon="mdi-arrow-left" class="text-none mt-2">
        Volver a Empleados
      </v-btn>
    </v-card>

    <!-- Vista tipo Hoja de Vida -->
    <div v-else>
      <!-- Barra superior con acciones de navegación -->
      <div class="d-flex align-center justify-space-between mb-4 flex-wrap gap-2">
        <v-btn
          variant="text"
          color="primary"
          prepend-icon="mdi-arrow-left"
          to="/empleados"
          class="text-none"
        >
          Volver a la lista
        </v-btn>
        <div class="d-flex align-center">
          <v-btn
            color="primary"
            variant="flat"
            prepend-icon="mdi-pencil"
            :to="`/empleados/${empleado.id}/editar`"
            class="text-none mr-2"
          >
            Editar Empleado
          </v-btn>
          <v-btn
            color="error"
            variant="outlined"
            prepend-icon="mdi-delete-outline"
            @click="dialogEliminar = true"
            class="text-none"
          >
            Eliminar
          </v-btn>
        </div>
      </div>

      <v-row>
        <!-- Columna principal (Estilo Hoja de Vida) -->
        <v-col cols="12" md="8">
          <!-- Encabezado Titular tipo CV -->
          <v-card elevation="2" class="rounded-lg pa-6 mb-6">
            <div class="d-flex align-center flex-wrap gap-4">
              <Avatar :nombre="nombreCompleto" :size="76" font-size="28px" class="mr-4" />
              <div>
                <h1 class="text-h4 font-weight-bold text-slate-800 mb-1">
                  {{ nombreCompleto }}
                </h1>
                <div class="text-h6 text-primary font-weight-medium mb-1">
                  {{ empleado.cargo }}
                </div>
                <div v-if="empleado.area" class="text-subtitle-2 text-medium-emphasis">
                  <v-icon size="16" class="mr-1">mdi-domain</v-icon>
                  Área: {{ empleado.area }}
                </div>
              </div>
            </div>
          </v-card>

          <!-- Sección: Datos de Contacto -->
          <v-card elevation="2" class="rounded-lg pa-6 mb-6">
            <div class="d-flex align-center mb-4">
              <v-icon color="primary" class="mr-2">mdi-card-account-phone-outline</v-icon>
              <h2 class="text-h6 font-weight-bold">Datos de Contacto</h2>
            </div>
            <v-row dense>
              <v-col cols="12" sm="6" class="mb-2">
                <div class="text-caption text-medium-emphasis">Correo electrónico</div>
                <div class="d-flex align-center font-weight-medium">
                  <v-icon size="16" class="mr-2 text-primary">mdi-email-outline</v-icon>
                  <a v-if="empleado.correo" :href="`mailto:${empleado.correo}`" class="text-decoration-none text-primary">
                    {{ empleado.correo }}
                  </a>
                  <span v-else class="text-medium-emphasis">No registrado</span>
                </div>
              </v-col>

              <v-col cols="12" sm="6" class="mb-2">
                <div class="text-caption text-medium-emphasis">Teléfono</div>
                <div class="d-flex align-center font-weight-medium">
                  <v-icon size="16" class="mr-2 text-primary">mdi-phone-outline</v-icon>
                  <a v-if="empleado.telefono" :href="`tel:${empleado.telefono}`" class="text-decoration-none text-body-1">
                    {{ empleado.telefono }}
                  </a>
                  <span v-else class="text-medium-emphasis">No registrado</span>
                </div>
              </v-col>

              <v-col cols="12" sm="6" class="mb-2">
                <div class="text-caption text-medium-emphasis">Dirección de residencia</div>
                <div class="d-flex align-center font-weight-medium">
                  <v-icon size="16" class="mr-2 text-primary">mdi-map-marker-outline</v-icon>
                  <span>{{ empleado.direccion || 'No registrada' }}</span>
                </div>
              </v-col>

              <v-col cols="12" sm="6" class="mb-2">
                <div class="text-caption text-medium-emphasis">Fecha de nacimiento</div>
                <div class="d-flex align-center font-weight-medium">
                  <v-icon size="16" class="mr-2 text-primary">mdi-cake-variant-outline</v-icon>
                  <span>{{ formatearFecha(empleado.fecha_nacimiento) }}</span>
                </div>
              </v-col>
            </v-row>
          </v-card>

          <!-- Sección: Experiencia Laboral (Línea de tiempo vertical) -->
          <v-card elevation="2" class="rounded-lg pa-6 mb-6">
            <div class="d-flex align-center mb-4">
              <v-icon color="primary" class="mr-2">mdi-briefcase-outline</v-icon>
              <h2 class="text-h6 font-weight-bold">Experiencia Laboral</h2>
            </div>

            <div v-if="experienciasOrdenadas.length === 0" class="text-medium-emphasis py-4 text-center">
              <v-icon size="32" class="mb-1 text-grey-lighten-1">mdi-briefcase-clock-outline</v-icon>
              <div>No hay experiencia laboral registrada para este empleado.</div>
            </div>

            <v-timeline
              v-else
              side="end"
              density="compact"
              align="start"
              truncate-line="both"
              class="cv-timeline"
            >
              <v-timeline-item
                v-for="exp in experienciasOrdenadas"
                :key="exp.id"
                dot-color="primary"
                size="small"
              >
                <div class="timeline-content pa-2">
                  <div class="text-subtitle-1 font-weight-bold text-slate-800">
                    {{ exp.cargo }}
                  </div>
                  <div class="text-subtitle-2 font-weight-medium text-primary mb-1">
                    {{ exp.empresa }}
                  </div>
                  <div class="text-caption text-medium-emphasis mb-2">
                    <v-icon size="14" class="mr-1">mdi-calendar-range</v-icon>
                    {{ formatearFecha(exp.fecha_inicio) }} — {{ exp.fecha_fin ? formatearFecha(exp.fecha_fin) : 'Presente' }}
                  </div>
                  <p v-if="exp.descripcion" class="text-body-2 text-grey-darken-3 mt-1" style="white-space: pre-line;">
                    {{ exp.descripcion }}
                  </p>
                </div>
              </v-timeline-item>
            </v-timeline>
          </v-card>

          <!-- Sección: Educación (Línea de tiempo vertical) -->
          <v-card elevation="2" class="rounded-lg pa-6 mb-6">
            <div class="d-flex align-center mb-4">
              <v-icon color="secondary" class="mr-2">mdi-school-outline</v-icon>
              <h2 class="text-h6 font-weight-bold">Educación y Formación</h2>
            </div>

            <div v-if="educacionOrdenada.length === 0" class="text-medium-emphasis py-4 text-center">
              <v-icon size="32" class="mb-1 text-grey-lighten-1">mdi-school-outline</v-icon>
              <div>No hay registros educativos agregados.</div>
            </div>

            <v-timeline
              v-else
              side="end"
              density="compact"
              align="start"
              truncate-line="both"
              class="cv-timeline"
            >
              <v-timeline-item
                v-for="edu in educacionOrdenada"
                :key="edu.id"
                dot-color="secondary"
                size="small"
              >
                <div class="timeline-content pa-2">
                  <div class="d-flex align-center flex-wrap gap-2 mb-1">
                    <span class="text-subtitle-1 font-weight-bold text-slate-800 mr-2">
                      {{ edu.titulo || edu.nivel }}
                    </span>
                    <v-chip size="x-small" color="secondary" variant="tonal">
                      {{ edu.nivel }}
                    </v-chip>
                  </div>
                  <div class="text-subtitle-2 font-weight-medium text-secondary mb-1">
                    {{ edu.institucion }}
                  </div>
                  <div v-if="edu.fecha_graduacion" class="text-caption text-medium-emphasis">
                    <v-icon size="14" class="mr-1">mdi-calendar-check-outline</v-icon>
                    Fecha de graduación: {{ formatearFecha(edu.fecha_graduacion) }}
                  </div>
                </div>
              </v-timeline-item>
            </v-timeline>
          </v-card>
        </v-col>

        <!-- Columna lateral: Datos Administrativos (Menos protagonismo visual) -->
        <v-col cols="12" md="4">
          <v-card elevation="1" variant="outlined" class="rounded-lg pa-5 bg-grey-lighten-5">
            <div class="d-flex align-center mb-3">
              <v-icon size="20" color="grey-darken-1" class="mr-2">mdi-shield-account-outline</v-icon>
              <span class="text-subtitle-2 font-weight-bold text-uppercase text-medium-emphasis" style="letter-spacing: 1px;">
                Datos Administrativos
              </span>
            </div>

            <v-divider class="mb-4" />

            <div class="mb-3">
              <div class="text-caption text-medium-emphasis">Cédula de ciudadanía</div>
              <div class="text-body-1 font-weight-bold">{{ empleado.cedula }}</div>
            </div>

            <div class="mb-3">
              <div class="text-caption text-medium-emphasis">Estado laboral</div>
              <div class="mt-1">
                <v-chip
                  :color="empleado.estado === 'Activo' ? 'success' : empleado.estado === 'Retirado' ? 'error' : 'grey'"
                  size="small"
                  variant="flat"
                  class="font-weight-medium"
                >
                  {{ empleado.estado }}
                </v-chip>
              </div>
            </div>

            <div class="mb-3">
              <div class="text-caption text-medium-emphasis">Tipo de contrato</div>
              <div class="text-body-2 font-weight-medium">{{ empleado.tipo_contrato || 'No especificado' }}</div>
            </div>

            <div class="mb-3">
              <div class="text-caption text-medium-emphasis">Fecha de ingreso</div>
              <div class="text-body-2 font-weight-medium">{{ formatearFecha(empleado.fecha_ingreso) }}</div>
            </div>

            <div v-if="empleado.fecha_retiro" class="mb-3">
              <div class="text-caption text-medium-emphasis">Fecha de retiro</div>
              <div class="text-body-2 font-weight-medium text-error">{{ formatearFecha(empleado.fecha_retiro) }}</div>
            </div>

            <div class="mb-3">
              <div class="text-caption text-medium-emphasis">Registro creado</div>
              <div class="text-caption text-medium-emphasis">{{ formatearFecha(empleado.created_at?.split('T')[0]) }}</div>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Diálogo de confirmación para eliminar -->
    <v-dialog v-model="dialogEliminar" max-width="450" persistent>
      <v-card class="rounded-lg">
        <v-card-title class="d-flex align-center px-4 py-3 bg-error text-white">
          <v-icon class="mr-2">mdi-alert</v-icon>
          <span>Eliminar Empleado</span>
        </v-card-title>
        <v-card-text class="pt-4">
          <p class="text-body-1">
            ¿Estás seguro de que deseas eliminar permanentemente a <strong>{{ nombreCompleto }}</strong>?
          </p>
          <p class="text-caption text-medium-emphasis mt-2">
            Esta acción eliminará también todo el historial de educación y experiencia laboral asociado. No se puede deshacer.
          </p>
        </v-card-text>
        <v-card-actions class="px-4 py-3">
          <v-spacer />
          <v-btn
            variant="text"
            color="grey-darken-1"
            :disabled="eliminando"
            @click="dialogEliminar = false"
            class="text-none"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="eliminando"
            @click="confirmarEliminar"
            class="text-none px-4"
          >
            Confirmar eliminación
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3000"
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
.cv-timeline :deep(.v-timeline-item__body) {
  padding-bottom: 24px;
}
.timeline-content {
  background-color: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}
</style>
