import { reactive } from 'vue'

/**
 * Almacén central de caché en memoria para todos los módulos del ERP.
 * Permite que los datos cargados por cada vista se compartan para exportaciones
 * masivas y multi-pestaña sin volver a consultar la base de datos.
 */
export const erpCache = reactive({
  clientes: [],
  productos: [],
  facturas: [],
  movimientos: [],
  proveedores: [],
  empleados: [],
  activos_fijos: [],
  ultimaActualizacion: {
    clientes: null,
    productos: null,
    facturas: null,
    movimientos: null,
    proveedores: null,
    empleados: null,
    activos_fijos: null,
  }
})

/**
 * Guarda o actualiza los datos en caché para un módulo específico
 */
export function guardarEnCache(modulo, datos) {
  if (!erpCache[modulo]) {
    erpCache[modulo] = []
  }
  if (Array.isArray(datos)) {
    erpCache[modulo] = [...datos]
    erpCache.ultimaActualizacion[modulo] = new Date()
  }
}

/**
 * Obtiene los datos en caché de un módulo
 */
export function obtenerDeCache(modulo) {
  return erpCache[modulo] || []
}

/**
 * Devuelve un resumen de los registros en caché
 */
export function resumenCache() {
  return {
    clientes: erpCache.clientes.length,
    productos: erpCache.productos.length,
    facturas: erpCache.facturas.length,
    movimientos: erpCache.movimientos.length,
    proveedores: erpCache.proveedores.length,
  }
}
