<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  nombre: {
    type: String,
    default: '',
  },
  foto: {
    type: String,
    default: '',
  },
  src: {
    type: String,
    default: '',
  },
  size: {
    type: [Number, String],
    default: 40,
  },
  fontSize: {
    type: String,
    default: '',
  },
  useDefaultAvatar: {
    type: Boolean,
    default: true,
  },
})

const imageError = ref(false)

watch(
  () => props.foto || props.src,
  () => {
    imageError.value = false
  }
)

// Paleta fija de 8 colores armónicos y determinísticos
const PALETTE = [
  '#0f766e', // Teal
  '#1b5e20', // Forest Green
  '#16a34a', // Green
  '#059669', // Emerald
  '#ea580c', // Orange
  '#0891b2', // Cyan
  '#2563eb', // Blue
  '#d97706', // Amber
]

// Iniciales del nombre completo (hasta 2 letras)
const iniciales = computed(() => {
  if (!props.nombre) return '?'
  const partes = props.nombre.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[1][0]).toUpperCase()
})

// Hash simple del string para asociar siempre el mismo color al mismo nombre
const colorFondo = computed(() => {
  if (!props.nombre) return PALETTE[0]
  let hash = 0
  for (let i = 0; i < props.nombre.length; i++) {
    hash = (hash << 5) - hash + props.nombre.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % PALETTE.length
  return PALETTE[index]
})

const imageUrl = computed(() => {
  if (imageError.value) return null
  const customFoto = props.foto || props.src
  if (customFoto && customFoto.trim()) {
    const val = customFoto.trim()
    if (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:')) {
      return val
    }
    // Si es un UUID de Uploadcare
    return `https://30mojuouxo.ucarecd.net/${val}/`
  }

  // Si tiene nombre, generamos un avatar estilizado y nítido
  if (props.useDefaultAvatar && props.nombre) {
    const seed = encodeURIComponent(props.nombre.trim())
    return `https://api.dicebear.com/7.x/personas/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
  }
  return null
})
</script>

<template>
  <v-avatar
    :size="size"
    :style="{ backgroundColor: colorFondo, color: '#ffffff', fontWeight: 'bold' }"
    class="elevation-1 avatar-organigrama overflow-hidden"
  >
    <v-img
      v-if="imageUrl"
      :src="imageUrl"
      :alt="nombre"
      cover
      @error="imageError = true"
    >
      <template #placeholder>
        <div class="d-flex align-center justify-center fill-height" :style="{ backgroundColor: colorFondo }">
          <span :style="{ fontSize: fontSize || `${Math.max(12, Math.round(Number(size) * 0.38))}px` }">
            {{ iniciales }}
          </span>
        </div>
      </template>
    </v-img>
    <span v-else :style="{ fontSize: fontSize || `${Math.max(12, Math.round(Number(size) * 0.38))}px` }">
      {{ iniciales }}
    </span>
  </v-avatar>
</template>

<style scoped>
.avatar-organigrama {
  transition: transform 0.2s ease;
}
.avatar-organigrama:hover {
  transform: scale(1.05);
}
</style>
