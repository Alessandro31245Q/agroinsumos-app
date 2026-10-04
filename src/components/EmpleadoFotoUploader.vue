<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import * as UC from '@uploadcare/file-uploader'
import '@uploadcare/file-uploader/web/uc-file-uploader-regular.min.css'
import Avatar from './Avatar.vue'
import { supabase } from '../lib/supabase'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  nombre: {
    type: String,
    default: 'Colaborador',
  },
  empleadoId: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue', 'change', 'guardado'])

// Generar ctxName ESTABLE una sola vez
const uniqueId = Math.random().toString(36).substring(2, 9)
const ctxName = ref(`uploader-emp-${props.empleadoId || uniqueId}`)

const wrapperRef = ref(null)
const guardando = ref(false)
const mensajeEstado = ref('')
const tipoMensaje = ref('success')

// Handler de subida exitosa desde Uploadcare
async function onUploadSuccess(e) {
  console.log('[EmpleadoFotoUploader] Evento de Uploadcare disparado:', e.type, e.detail)
  
  // Extraer UUID o CDN URL de forma exhaustiva
  const rawUuid = e.detail?.uuid || e.detail?.fileInfo?.uuid || e.detail?.allEntries?.[0]?.uuid
  const rawCdnUrl = e.detail?.cdnUrl || e.detail?.fileInfo?.cdnUrl || e.detail?.allEntries?.[0]?.cdnUrl

  let fotoFinal = ''
  if (rawCdnUrl) {
    fotoFinal = rawCdnUrl
  } else if (rawUuid) {
    fotoFinal = `https://30mojuouxo.ucarecd.net/${rawUuid}/`
  }

  if (!fotoFinal) {
    console.warn('[EmpleadoFotoUploader] No se pudo extraer URL/UUID del evento:', e.detail)
    return
  }

  console.log('[EmpleadoFotoUploader] Foto subida con éxito a Uploadcare:', fotoFinal)
  emit('update:modelValue', fotoFinal)
  emit('change', fotoFinal)

  // Si tenemos empleadoId (estamos en modo edición o ficha de colaborador), guardamos DIRECTAMENTE en la BD
  if (props.empleadoId) {
    guardando.value = true
    try {
      // Intentar primero con foto_url
      let res = await supabase
        .from('empleados')
        .update({ foto_url: fotoFinal })
        .eq('id', props.empleadoId)

      // Si no existe la columna foto_url, intentar con imagen_url
      if (res.error && res.error.message?.includes('column')) {
        console.warn('[EmpleadoFotoUploader] Falló foto_url, intentando con imagen_url...')
        res = await supabase
          .from('empleados')
          .update({ imagen_url: fotoFinal })
          .eq('id', props.empleadoId)
      }

      if (res.error) {
        console.error('[EmpleadoFotoUploader] Error guardando en BD:', res.error.message)
        mensajeEstado.value = 'Error guardando en BD: ' + res.error.message
        tipoMensaje.value = 'error'
      } else {
        console.log('[EmpleadoFotoUploader] ✅ Foto guardada correctamente en la BD!')
        mensajeEstado.value = '✅ ¡Fotografía guardada y actualizada en la base de datos!'
        tipoMensaje.value = 'success'
        emit('guardado', fotoFinal)
      }
    } catch (err) {
      console.error('[EmpleadoFotoUploader] Excepción guardando:', err)
      mensajeEstado.value = 'Error: ' + err.message
      tipoMensaje.value = 'error'
    } finally {
      guardando.value = false
      setTimeout(() => {
        mensajeEstado.value = ''
      }, 5000)
    }
  } else {
    mensajeEstado.value = '✅ Foto cargada lista para guardar.'
    tipoMensaje.value = 'info'
    setTimeout(() => {
      mensajeEstado.value = ''
    }, 4000)
  }
}

// Quitar foto actual
async function quitarFoto() {
  emit('update:modelValue', '')
  emit('change', '')

  if (props.empleadoId) {
    guardando.value = true
    try {
      let res = await supabase
        .from('empleados')
        .update({ foto_url: null })
        .eq('id', props.empleadoId)

      if (res.error && res.error.message?.includes('column')) {
        res = await supabase
          .from('empleados')
          .update({ imagen_url: null })
          .eq('id', props.empleadoId)
      }

      if (!res.error) {
        mensajeEstado.value = 'Foto eliminada de la base de datos.'
        tipoMensaje.value = 'info'
        emit('guardado', '')
      }
    } catch (err) {
      console.error(err)
    } finally {
      guardando.value = false
      setTimeout(() => {
        mensajeEstado.value = ''
      }, 3000)
    }
  }
}

onMounted(async () => {
  // 1. Registrar Web Components de Uploadcare
  UC.defineComponents(UC)
  await nextTick()

  const wrapper = wrapperRef.value
  if (!wrapper) return

  // 2. Conectar listeners a uc-upload-ctx-provider
  const ctxEl = wrapper.querySelector('uc-upload-ctx-provider')
  if (ctxEl) {
    ctxEl.addEventListener('file-upload-success', onUploadSuccess)
    ctxEl.addEventListener('change', (e) => {
      // Si el evento change trae archivos exitosos
      const all = e.detail?.allEntries || []
      const successEntry = all.find((item) => item.status === 'success' || item.cdnUrl || item.uuid)
      if (successEntry) {
        onUploadSuccess({ detail: successEntry, type: 'change-entry' })
      }
    })
  }
})
</script>

<template>
  <div class="empleado-foto-uploader pa-4 rounded-lg border bg-grey-lighten-5">
    <div class="d-flex align-center flex-wrap gap-4">
      <!-- Vista previa del avatar / foto -->
      <div class="position-relative flex-shrink-0">
        <Avatar
          :nombre="nombre"
          :foto="modelValue"
          :size="76"
          font-size="28px"
          class="elevation-2 border"
        />
        <v-progress-circular
          v-if="guardando"
          indeterminate
          color="primary"
          size="24"
          width="3"
          class="position-absolute"
          style="top: calc(50% - 12px); left: calc(50% - 12px);"
        />
      </div>

      <!-- Controles de subida con Uploadcare -->
      <div class="flex-grow-1" ref="wrapperRef">
        <div class="d-flex align-center justify-space-between flex-wrap gap-2 mb-1">
          <div class="text-subtitle-2 font-weight-bold d-flex align-center">
            <v-icon size="18" color="primary" class="mr-1">mdi-camera-account</v-icon>
            Fotografía de Perfil (Uploadcare)
          </div>
          <v-chip
            v-if="modelValue"
            size="x-small"
            color="success"
            variant="flat"
            class="font-weight-medium"
          >
            Foto cargada
          </v-chip>
        </div>

        <div class="text-caption text-medium-emphasis mb-3">
          Sube la foto del colaborador. Se guardará en la nube con Uploadcare y se sincronizará automáticamente en el Organigrama y el Excel.
        </div>

        <div class="d-flex align-center flex-wrap gap-2">
          <!-- Web Components de Uploadcare -->
          <uc-config
            :ctx-name="ctxName"
            pubkey="d604b401cd70f089cbeb"
            cdn-cname="https://30mojuouxo.ucarecd.net/"
            source-list="local, camera, url"
            img-only
            multiple="false"
            image-shrink="600x600 85%"
            max-local-file-size-bytes="5242880"
          />

          <uc-file-uploader-regular
            :ctx-name="ctxName"
            dynamic-button
          />

          <uc-upload-ctx-provider :ctx-name="ctxName" />

          <!-- Botón para quitar foto -->
          <v-btn
            v-if="modelValue"
            variant="tonal"
            color="error"
            size="small"
            prepend-icon="mdi-trash-can-outline"
            class="text-none ml-2"
            :disabled="guardando"
            @click="quitarFoto"
          >
            Quitar Foto
          </v-btn>
        </div>

        <!-- Mensaje de estado en vivo -->
        <div v-if="mensajeEstado" class="mt-2">
          <v-alert
            :type="tipoMensaje"
            density="compact"
            variant="tonal"
            class="text-caption py-1 px-3"
          >
            {{ mensajeEstado }}
          </v-alert>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.empleado-foto-uploader {
  transition: all 0.2s ease;
}
.empleado-foto-uploader:hover {
  border-color: #1b5e20 !important;
  background-color: #f6faf5 !important;
}
</style>
