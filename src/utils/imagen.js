/**
 * Devuelve la URL de imagen desde el CDN de Uploadcare del proyecto.
 * Si no hay UUID, devuelve el placeholder.
 *
 * @param {string|null|undefined} uuid - UUID del archivo en Uploadcare
 * @param {number} ancho - Ancho de preview (se ignora si el CDN no soporta transformaciones)
 * @returns {string} URL lista para usar en <img :src="...">
 */
export function urlImagen(uuid, ancho = 400) {
  if (!uuid) return '/placeholder.png'
  // URL directa al CDN del proyecto — sin transformaciones para máxima compatibilidad
  return `https://30mojuouxo.ucarecd.net/${uuid}/`
}
