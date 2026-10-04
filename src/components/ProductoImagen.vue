<script setup>
import { ref, onMounted, nextTick } from 'vue'
import * as UC from '@uploadcare/file-uploader'
import '@uploadcare/file-uploader/web/uc-file-uploader-regular.min.css'
import { supabase } from '../lib/supabase'

// ─── Props & Emits ────────────────────────────────────────────────────────────
const props = defineProps({
  productoId: {
    type: String,
    required: true,
  },
  uuid: {
    type: String,
    default: null,
  },
})

const emit = defineEmits(['subida'])

// ─── Refs ─────────────────────────────────────────────────────────────────────
const wrapperRef = ref(null)   // ref al div contenedor (elemento nativo → siempre funciona)
const ctxName = `uploader-${props.productoId}`

// ─── Handler de subida ────────────────────────────────────────────────────────
async function onUploadSuccess(e) {
  console.log('[ProductoImagen] file-upload-success disparado', e.detail)
  const nuevoUuid = e.detail?.uuid
  if (!nuevoUuid) {
    console.warn('[ProductoImagen] No se encontró uuid en e.detail')
    return
  }

  const { error } = await supabase
    .from('productos')
    .update({ imagen_url: nuevoUuid })
    .eq('id', props.productoId)

  if (error) {
    console.error('[ProductoImagen] Error guardando en BD:', error.message)
    return
  }

  console.log('[ProductoImagen] imagen_url actualizada en BD, uuid:', nuevoUuid)
  emit('subida', nuevoUuid)
}

// ─── Inicialización ───────────────────────────────────────────────────────────
onMounted(async () => {
  // 1. Registrar los Web Components de Uploadcare
  UC.defineComponents(UC)

  // 2. Esperar a que Vue termine de renderizar
  await nextTick()

  // 3. Usar el wrapper nativo (div) para buscar el uc-upload-ctx-provider
  const wrapper = wrapperRef.value
  if (!wrapper) {
    console.error('[ProductoImagen] wrapperRef no disponible')
    return
  }

  const ctxEl = wrapper.querySelector('uc-upload-ctx-provider')
  if (!ctxEl) {
    console.error('[ProductoImagen] No se encontró uc-upload-ctx-provider en el DOM')
    return
  }

  console.log('[ProductoImagen] Registrando listener en', ctxEl)
  ctxEl.addEventListener('file-upload-success', onUploadSuccess)
})
</script>

<template>
  <!-- wrapper nativo (div) → ref siempre funciona en Vue 3 -->
  <div ref="wrapperRef">
    <uc-config
      :ctx-name="ctxName"
      pubkey="d604b401cd70f089cbeb"
      cdn-cname="https://30mojuouxo.ucarecd.net/"
      source-list="local"
      img-only
      multiple="false"
      image-shrink="800x800 80%"
      max-local-file-size-bytes="5242880"
    />

    <uc-file-uploader-regular
      :ctx-name="ctxName"
      dynamic-button
    />

    <uc-upload-ctx-provider :ctx-name="ctxName" />
  </div>
</template>
