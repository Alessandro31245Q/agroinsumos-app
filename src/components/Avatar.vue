<script setup>
import { computed } from 'vue'

const props = defineProps({
  nombre: {
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
})

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
</script>

<template>
  <v-avatar
    :size="size"
    :style="{ backgroundColor: colorFondo, color: '#ffffff', fontWeight: 'bold' }"
    class="elevation-1"
  >
    <span :style="{ fontSize: fontSize || `${Math.max(12, Math.round(Number(size) * 0.4))}px` }">
      {{ iniciales }}
    </span>
  </v-avatar>
</template>
