<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { esAdmin } from '../lib/auth'
import EmpleadoFotoUploader from '../components/EmpleadoFotoUploader.vue'

const route = useRoute()
const router = useRouter()

const id = computed(() => route.params.id)
const editando = computed(() => Boolean(id.value))

const loading = ref(false)
const guardando = ref(false)
const sinPermisos = ref(false)
const snackbar = ref({ show: false, text: '', color: 'success' })

function mostrarMensaje(text, color = 'success') {
  snackbar.value = { show: true, text, color }
}

// 1. Datos personales & 2. Datos laborales
const form = ref({
  cedula: '',
  nombres: '',
  apellidos: '',
  foto_url: '',
  fecha_nacimiento: null,
  telefono: '',
  correo: '',
  direccion: '',
  cargo: '',
  area: '',
  fecha_ingreso: new Date().toISOString().split('T')[0],
  fecha_retiro: null,
  tipo_contrato: 'Indefinido',
  estado: 'Activo',
})

// Opciones
const tiposContrato = ['Indefinido', 'Término fijo', 'Prestación de servicios', 'Aprendizaje']
const estados = ['Activo', 'Inactivo', 'Retirado']
const nivelesEducacion = ['Bachillerato', 'Técnico', 'Tecnólogo', 'Pregrado', 'Especialización', 'Maestría', 'Doctorado']

// 3. Educación (Lista dinámica)
const educacionLista = ref([])

// 4. Experiencia laboral (Lista dinámica)
const experienciaLista = ref([])

function agregarEducacion() {
  educacionLista.value.push({
    nivel: 'Pregrado',
    institucion: '',
    titulo: '',
    fecha_graduacion: null,
  })
}

function quitarEducacion(index) {
  educacionLista.value.splice(index, 1)
}

function agregarExperiencia() {
  experienciaLista.value.push({
    empresa: '',
    cargo: '',
    fecha_inicio: '',
    fecha_fin: null,
    descripcion: '',
  })
}

function quitarExperiencia(index) {
  experienciaLista.value.splice(index, 1)
}

async function cargarDatosParaEditar() {
  if (!editando.value) return

  loading.value = true
  const { data, error } = await supabase
    .from('empleados')
    .select('*, empleados_educacion(*), empleados_experiencia(*)')
    .eq('id', id.value)
    .single()

  if (error) {
    if (error.code === '42501' || error.message?.toLowerCase().includes('permission') || error.message?.toLowerCase().includes('policy')) {
      sinPermisos.value = true
    } else {
      mostrarMensaje('Error cargando empleado: ' + error.message, 'error')
    }
  } else if (data) {
    form.value = {
      cedula: data.cedula || '',
      nombres: data.nombres || '',
      apellidos: data.apellidos || '',
      foto_url: data.foto_url || data.imagen_url || data.foto || data.avatar_url || '',
      fecha_nacimiento: data.fecha_nacimiento || null,
      telefono: data.telefono || '',
      correo: data.correo || '',
      direccion: data.direccion || '',
      cargo: data.cargo || '',
      area: data.area || '',
      fecha_ingreso: data.fecha_ingreso || new Date().toISOString().split('T')[0],
      fecha_retiro: data.fecha_retiro || null,
      tipo_contrato: data.tipo_contrato || 'Indefinido',
      estado: data.estado || 'Activo',
    }
    educacionLista.value = data.empleados_educacion || []
    experienciaLista.value = data.empleados_experiencia || []
  }

  loading.value = false
}

async function guardar() {
  // Validación de campos obligatorios
  if (!form.value.cedula?.trim()) return mostrarMensaje('La cédula es obligatoria', 'error')
  if (!form.value.nombres?.trim()) return mostrarMensaje('Los nombres son obligatorios', 'error')
  if (!form.value.apellidos?.trim()) return mostrarMensaje('Los apellidos son obligatorios', 'error')
  if (!form.value.cargo?.trim()) return mostrarMensaje('El cargo es obligatorio', 'error')
  if (!form.value.fecha_ingreso) return mostrarMensaje('La fecha de ingreso es obligatoria', 'error')

  guardando.value = true

  let empleadoId = id.value
  const payloadEmpleado = {
    cedula: form.value.cedula.trim(),
    nombres: form.value.nombres.trim(),
    apellidos: form.value.apellidos.trim(),
    fecha_nacimiento: form.value.fecha_nacimiento || null,
    telefono: form.value.telefono?.trim() || null,
    correo: form.value.correo?.trim() || null,
    direccion: form.value.direccion?.trim() || null,
    cargo: form.value.cargo.trim(),
    area: form.value.area?.trim() || null,
    fecha_ingreso: form.value.fecha_ingreso,
    fecha_retiro: form.value.fecha_retiro || null,
    tipo_contrato: form.value.tipo_contrato || null,
    estado: form.value.estado || 'Activo',
    foto_url: form.value.foto_url || null,
  }

  let errorEmpleado = null

  // 1. Guardar datos principales del empleado
  if (editando.value) {
    let res = await supabase.from('empleados').update(payloadEmpleado).eq('id', empleadoId)
    // Si la columna foto_url no existe, intentar con imagen_url o sin foto
    if (res.error && res.error.message?.includes('column')) {
      const payloadAlt = { ...payloadEmpleado }
      delete payloadAlt.foto_url
      let res2 = await supabase.from('empleados').update({ ...payloadAlt, imagen_url: form.value.foto_url || null }).eq('id', empleadoId)
      if (res2.error && res2.error.message?.includes('column')) {
        res = await supabase.from('empleados').update(payloadAlt).eq('id', empleadoId)
      } else {
        res = res2
      }
    }
    errorEmpleado = res.error
  } else {
    let res = await supabase.from('empleados').insert(payloadEmpleado).select('id').single()
    if (res.error && res.error.message?.includes('column')) {
      const payloadAlt = { ...payloadEmpleado }
      delete payloadAlt.foto_url
      let res2 = await supabase.from('empleados').insert({ ...payloadAlt, imagen_url: form.value.foto_url || null }).select('id').single()
      if (res2.error && res2.error.message?.includes('column')) {
        res = await supabase.from('empleados').insert(payloadAlt).select('id').single()
      } else {
        res = res2
      }
    }
    errorEmpleado = res.error
    if (!errorEmpleado && res.data) {
      empleadoId = res.data.id
    }
  }

  if (errorEmpleado) {
    mostrarMensaje('Error al guardar datos del empleado: ' + errorEmpleado.message, 'error')
    guardando.value = false
    return // No continuar si falla el empleado principal
  }

  // 2. Guardar registros de educación
  if (editando.value) {
    await supabase.from('empleados_educacion').delete().eq('empleado_id', empleadoId)
  }

  const itemsEdu = educacionLista.value
    .filter((e) => e.institucion?.trim() || e.titulo?.trim())
    .map((e) => ({
      empleado_id: empleadoId,
      nivel: e.nivel || null,
      institucion: e.institucion?.trim() || 'No especificada',
      titulo: e.titulo?.trim() || null,
      fecha_graduacion: e.fecha_graduacion || null,
    }))

  if (itemsEdu.length > 0) {
    const { error: errorEdu } = await supabase.from('empleados_educacion').insert(itemsEdu)
    if (errorEdu) {
      mostrarMensaje('Empleado guardado, pero ocurrió un error en educación: ' + errorEdu.message, 'warning')
    }
  }

  // 3. Guardar registros de experiencia
  if (editando.value) {
    await supabase.from('empleados_experiencia').delete().eq('empleado_id', empleadoId)
  }

  const itemsExp = experienciaLista.value
    .filter((x) => x.empresa?.trim() || x.cargo?.trim())
    .map((x) => ({
      empleado_id: empleadoId,
      empresa: x.empresa?.trim() || 'No especificada',
      cargo: x.cargo?.trim() || 'No especificado',
      fecha_inicio: x.fecha_inicio || new Date().toISOString().split('T')[0],
      fecha_fin: x.fecha_fin || null,
      descripcion: x.descripcion?.trim() || null,
    }))

  if (itemsExp.length > 0) {
    const { error: errorExp } = await supabase.from('empleados_experiencia').insert(itemsExp)
    if (errorExp) {
      mostrarMensaje('Empleado guardado, pero ocurrió un error en experiencia: ' + errorExp.message, 'warning')
    }
  }

  mostrarMensaje(editando.value ? 'Empleado actualizado exitosamente' : 'Empleado registrado exitosamente')
  guardando.value = false

  setTimeout(() => {
    router.push(`/empleados/${empleadoId}`)
  }, 400)
}

onMounted(() => {
  if (!esAdmin()) {
    sinPermisos.value = true
    return
  }
  cargarDatosParaEditar()
})
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

    <!-- Formulario organizado por secciones tipo Hoja de Vida -->
    <div v-else style="max-width: 950px; margin: 0 auto;">
      <!-- Barra superior -->
      <div class="d-flex align-center justify-space-between mb-4">
        <v-btn
          variant="text"
          color="primary"
          prepend-icon="mdi-arrow-left"
          @click="router.back()"
          class="text-none"
        >
          Volver
        </v-btn>
        <h1 class="text-h5 font-weight-bold">
          {{ editando ? 'Editar Hoja de Vida del Empleado' : 'Registrar Nuevo Empleado' }}
        </h1>
        <div style="width: 80px;"></div>
      </div>

      <!-- SECCIÓN 1: DATOS PERSONALES -->
      <v-card elevation="2" class="rounded-lg mb-6 pa-6">
        <div class="d-flex align-center mb-4">
          <v-avatar color="primary" size="32" class="mr-3 text-white font-weight-bold">1</v-avatar>
          <div>
            <h2 class="text-h6 font-weight-bold">Datos Personales</h2>
            <div class="text-caption text-medium-emphasis">Información básica, fotografía de perfil y contacto del colaborador</div>
          </div>
        </div>

        <!-- Uploader de Fotografía con Uploadcare -->
        <EmpleadoFotoUploader
          v-model="form.foto_url"
          :nombre="`${form.nombres} ${form.apellidos}`.trim() || 'Colaborador'"
          :empleado-id="id || ''"
          class="mb-6"
        />

        <v-row dense>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="form.nombres"
              label="Nombres *"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-account"
              :rules="[v => !!v || 'Los nombres son requeridos']"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="form.apellidos"
              label="Apellidos *"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-account"
              :rules="[v => !!v || 'Los apellidos son requeridos']"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="form.cedula"
              label="Cédula de Ciudadanía *"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-card-account-details-outline"
              :rules="[v => !!v || 'La cédula es requerida']"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="form.fecha_nacimiento"
              label="Fecha de nacimiento"
              type="date"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-cake-variant-outline"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="form.telefono"
              label="Teléfono"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-phone"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="form.correo"
              label="Correo electrónico"
              type="email"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-email"
            />
          </v-col>
          <v-col cols="12">
            <v-text-field
              v-model="form.direccion"
              label="Dirección de residencia"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-map-marker"
            />
          </v-col>
        </v-row>
      </v-card>

      <!-- SECCIÓN 2: DATOS LABORALES -->
      <v-card elevation="2" class="rounded-lg mb-6 pa-6">
        <div class="d-flex align-center mb-4">
          <v-avatar color="primary" size="32" class="mr-3 text-white font-weight-bold">2</v-avatar>
          <div>
            <h2 class="text-h6 font-weight-bold">Datos Laborales</h2>
            <div class="text-caption text-medium-emphasis">Posición, vinculación contractual y estado dentro de la empresa</div>
          </div>
        </div>

        <v-row dense>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="form.cargo"
              label="Cargo *"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-badge-account-outline"
              :rules="[v => !!v || 'El cargo es requerido']"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="form.area"
              label="Área / Departamento"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-domain"
            />
          </v-col>
          <v-col cols="12" sm="4">
            <v-text-field
              v-model="form.fecha_ingreso"
              label="Fecha de ingreso *"
              type="date"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-calendar-start"
              :rules="[v => !!v || 'La fecha de ingreso es requerida']"
            />
          </v-col>
          <v-col cols="12" sm="4">
            <v-select
              v-model="form.tipo_contrato"
              :items="tiposContrato"
              label="Tipo de contrato"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-file-document-outline"
            />
          </v-col>
          <v-col cols="12" sm="4">
            <v-select
              v-model="form.estado"
              :items="estados"
              label="Estado laboral"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-check-circle-outline"
            />
          </v-col>
          <v-col v-if="form.estado === 'Retirado'" cols="12" sm="6">
            <v-text-field
              v-model="form.fecha_retiro"
              label="Fecha de retiro"
              type="date"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-calendar-end"
            />
          </v-col>
        </v-row>
      </v-card>

      <!-- SECCIÓN 3: EDUCACIÓN Y FORMACIÓN -->
      <v-card elevation="2" class="rounded-lg mb-6 pa-6">
        <div class="d-flex align-center justify-space-between mb-4 flex-wrap gap-2">
          <div class="d-flex align-center">
            <v-avatar color="secondary" size="32" class="mr-3 text-white font-weight-bold">3</v-avatar>
            <div>
              <h2 class="text-h6 font-weight-bold">Educación y Formación</h2>
              <div class="text-caption text-medium-emphasis">Estudios realizados, títulos obtenidos y certificaciones</div>
            </div>
          </div>
          <v-btn
            color="secondary"
            variant="tonal"
            prepend-icon="mdi-plus"
            @click="agregarEducacion"
            class="text-none"
          >
            Agregar estudio
          </v-btn>
        </div>

        <div v-if="educacionLista.length === 0" class="text-center py-6 text-medium-emphasis border rounded-lg bg-grey-lighten-5">
          <v-icon size="40" class="mb-2 text-grey-lighten-1">mdi-school-outline</v-icon>
          <div>No has agregado estudios o formación aún. Haz clic en "Agregar estudio" para añadir uno.</div>
        </div>

        <!-- Tarjetas dinámicas de educación -->
        <div v-else>
          <v-card
            v-for="(edu, index) in educacionLista"
            :key="index"
            variant="outlined"
            class="mb-4 pa-4 rounded-lg bg-grey-lighten-5"
          >
            <div class="d-flex align-center justify-space-between mb-3">
              <span class="text-subtitle-2 font-weight-bold text-secondary">
                <v-icon size="18" class="mr-1">mdi-school</v-icon>
                Estudio #{{ index + 1 }}
              </span>
              <v-btn
                icon="mdi-delete-outline"
                variant="text"
                size="small"
                color="error"
                title="Eliminar este estudio"
                @click="quitarEducacion(index)"
              />
            </div>

            <v-row dense>
              <v-col cols="12" sm="4">
                <v-select
                  v-model="edu.nivel"
                  :items="nivelesEducacion"
                  label="Nivel educativo *"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" sm="8">
                <v-text-field
                  v-model="edu.institucion"
                  label="Institución educativa *"
                  placeholder="Ej. Universidad Surcolombiana"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" sm="8">
                <v-text-field
                  v-model="edu.titulo"
                  label="Título o programa"
                  placeholder="Ej. Ingeniero Agrónomo"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="edu.fecha_graduacion"
                  label="Fecha de graduación"
                  type="date"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
            </v-row>
          </v-card>
        </div>
      </v-card>

      <!-- SECCIÓN 4: EXPERIENCIA LABORAL -->
      <v-card elevation="2" class="rounded-lg mb-6 pa-6">
        <div class="d-flex align-center justify-space-between mb-4 flex-wrap gap-2">
          <div class="d-flex align-center">
            <v-avatar color="primary" size="32" class="mr-3 text-white font-weight-bold">4</v-avatar>
            <div>
              <h2 class="text-h6 font-weight-bold">Experiencia Laboral</h2>
              <div class="text-caption text-medium-emphasis">Trayectoria profesional previa y cargos desempeñados</div>
            </div>
          </div>
          <v-btn
            color="primary"
            variant="tonal"
            prepend-icon="mdi-plus"
            @click="agregarExperiencia"
            class="text-none"
          >
            Agregar experiencia
          </v-btn>
        </div>

        <div v-if="experienciaLista.length === 0" class="text-center py-6 text-medium-emphasis border rounded-lg bg-grey-lighten-5">
          <v-icon size="40" class="mb-2 text-grey-lighten-1">mdi-briefcase-outline</v-icon>
          <div>No has agregado experiencias laborales aún. Haz clic en "Agregar experiencia" para añadir una.</div>
        </div>

        <!-- Tarjetas dinámicas de experiencia laboral -->
        <div v-else>
          <v-card
            v-for="(exp, index) in experienciaLista"
            :key="index"
            variant="outlined"
            class="mb-4 pa-4 rounded-lg bg-grey-lighten-5"
          >
            <div class="d-flex align-center justify-space-between mb-3">
              <span class="text-subtitle-2 font-weight-bold text-primary">
                <v-icon size="18" class="mr-1">mdi-briefcase</v-icon>
                Experiencia #{{ index + 1 }}
              </span>
              <v-btn
                icon="mdi-delete-outline"
                variant="text"
                size="small"
                color="error"
                title="Eliminar esta experiencia"
                @click="quitarExperiencia(index)"
              />
            </div>

            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="exp.empresa"
                  label="Empresa / Organización *"
                  placeholder="Ej. Agroinsumos del Huila S.A.S"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="exp.cargo"
                  label="Cargo desempeñado *"
                  placeholder="Ej. Asesor Técnico Comercial"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="exp.fecha_inicio"
                  label="Fecha de inicio *"
                  type="date"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="exp.fecha_fin"
                  label="Fecha de fin (dejar vacío si es actual)"
                  type="date"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="exp.descripcion"
                  label="Descripción de responsabilidades y logros"
                  placeholder="Breve resumen de las funciones principales y logros en el cargo..."
                  rows="2"
                  auto-grow
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
            </v-row>
          </v-card>
        </div>
      </v-card>

      <!-- Botones de Acción / Guardar -->
      <div class="d-flex align-center justify-end pb-8">
        <v-btn
          variant="outlined"
          color="grey-darken-1"
          @click="router.back()"
          class="text-none mr-3"
          :disabled="guardando"
        >
          Cancelar
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          size="large"
          prepend-icon="mdi-content-save"
          :loading="guardando"
          @click="guardar"
          class="text-none px-6"
        >
          {{ editando ? 'Guardar Cambios' : 'Registrar Empleado' }}
        </v-btn>
      </div>
    </div>

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
