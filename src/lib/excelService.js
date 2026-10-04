import ExcelJS from 'exceljs'
import { erpCache } from './erpDataCache'

const NOMBRE_HOJA_MENU = '🏠 Menú Principal'

function safeMerge(ws, r1, c1, r2, c2) {
  if (r1 === r2 && c1 === c2) return
  if (r1 > r2 || c1 > c2) return
  try {
    ws.mergeCells(r1, c1, r2, c2)
  } catch (e) {
    // Si ya estaba combinada, se ignora
  }
}

function getColumnLetter(colIndex) {
  let temp, letter = ''
  while (colIndex > 0) {
    temp = (colIndex - 1) % 26
    letter = String.fromCharCode(temp + 65) + letter
    colIndex = Math.floor((colIndex - temp - 1) / 26)
  }
  return letter
}

// ─── Estilos corporativos de alta calidad ──────────────────────────────────
const FONT_TITULO = { name: 'Segoe UI', size: 15, bold: true, color: { argb: 'FFFFFFFF' } }
const FONT_SUB = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
const FONT_LABEL = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF555555' } }
const FONT_VALUE = { name: 'Segoe UI', size: 9 }
const FONT_BODY = { name: 'Segoe UI', size: 10 }
const FILL_PRIMARY = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B5E20' } }
const FILL_SECONDARY = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } }
const FILL_TERTIARY = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF388E3C' } }
const FILL_LIGHT = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F9F2' } }
const FILL_BTN_BACK = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD32F2F' } }
const BORDER_SOFT = {
  top: { style: 'thin', color: { argb: 'FFE6EFE6' } },
  bottom: { style: 'thin', color: { argb: 'FFE6EFE6' } },
  left: { style: 'thin', color: { argb: 'FFE6EFE6' } },
  right: { style: 'thin', color: { argb: 'FFE6EFE6' } },
}
const BORDER_BOX = {
  top: { style: 'medium', color: { argb: 'FF1B5E20' } },
  bottom: { style: 'medium', color: { argb: 'FF1B5E20' } },
  left: { style: 'medium', color: { argb: 'FF1B5E20' } },
  right: { style: 'medium', color: { argb: 'FF1B5E20' } },
}

function applyKpiCard(ws, startRow, startCol, title, value, subtext = '') {
  const c2 = startCol + 1
  safeMerge(ws, startRow, startCol, startRow, c2)
  safeMerge(ws, startRow + 1, startCol, startRow + 1, c2)
  if (subtext) safeMerge(ws, startRow + 2, startCol, startRow + 2, c2)

  const ct = ws.getCell(startRow, startCol)
  ct.value = String(title).toUpperCase()
  ct.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF556B2F' } }
  ct.alignment = { horizontal: 'center', vertical: 'middle' }

  const cv = ws.getCell(startRow + 1, startCol)
  cv.value = value ?? 0
  cv.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF1B5E20' } }
  cv.alignment = { horizontal: 'center', vertical: 'middle' }

  if (subtext) {
    const cs = ws.getCell(startRow + 2, startCol)
    cs.value = String(subtext)
    cs.font = { name: 'Segoe UI', size: 8, italic: true, color: { argb: 'FF777777' } }
    cs.alignment = { horizontal: 'center', vertical: 'middle' }
  }

  const maxR = subtext ? startRow + 2 : startRow + 1
  for (let r = startRow; r <= maxR; r++) {
    for (let c = startCol; c <= c2; c++) {
      const cell = ws.getCell(r, c)
      cell.fill = FILL_LIGHT
      cell.border = BORDER_SOFT
    }
  }
}

function addBackButton(ws, row, colStart, colEnd) {
  safeMerge(ws, row, colStart, row, colEnd)
  const btn = ws.getCell(row, colStart)
  btn.value = {
    text: '⬅ VOLVER AL MENÚ',
    hyperlink: `#'${NOMBRE_HOJA_MENU}'!A1`,
    tooltip: 'Regresar al Menú Principal',
  }
  btn.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
  btn.alignment = { horizontal: 'center', vertical: 'middle' }
  for (let c = colStart; c <= colEnd; c++) {
    const cell = ws.getCell(row, c)
    cell.fill = FILL_BTN_BACK
    cell.border = {
      top: { style: 'medium', color: { argb: 'FFB71C1C' } },
      bottom: { style: 'medium', color: { argb: 'FFB71C1C' } },
      left: { style: 'medium', color: { argb: 'FFB71C1C' } },
      right: { style: 'medium', color: { argb: 'FFB71C1C' } },
    }
  }
}

function addNavButton(ws, r1, c1, r2, c2, texto, destino, sub, customFill = FILL_PRIMARY) {
  safeMerge(ws, r1, c1, r1, c2)
  if (sub) safeMerge(ws, r2, c1, r2, c2)

  const btn = ws.getCell(r1, c1)
  btn.value = { text: texto, hyperlink: `#'${destino}'!A1`, tooltip: `Ir a ${destino}` }
  btn.font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } }
  btn.alignment = { horizontal: 'center', vertical: 'middle' }

  if (sub) {
    const s = ws.getCell(r2, c1)
    s.value = sub
    s.font = { name: 'Segoe UI', size: 8, italic: true, color: { argb: 'FFE8F5E9' } }
    s.alignment = { horizontal: 'center', vertical: 'middle' }
  }

  const maxR = sub ? r2 : r1
  for (let r = r1; r <= maxR; r++) {
    for (let c = c1; c <= c2; c++) {
      ws.getCell(r, c).fill = customFill
      ws.getCell(r, c).border = {
        top: { style: 'medium', color: { argb: 'FF0D330E' } },
        bottom: { style: 'medium', color: { argb: 'FF0D330E' } },
        left: { style: 'medium', color: { argb: 'FF0D330E' } },
        right: { style: 'medium', color: { argb: 'FF0D330E' } },
      }
    }
  }
}

function addNavCard(ws, r1, c1, r2, c2, title, subtitle, targetSheet, isHighlight = false) {
  safeMerge(ws, r1, c1, r1, c2)
  safeMerge(ws, r2, c1, r2, c2)

  const cTitle = ws.getCell(r1, c1)
  cTitle.value = {
    text: title,
    hyperlink: `#'${targetSheet}'!A1`,
    tooltip: `Ir a pestaña ${targetSheet}`,
  }
  cTitle.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1B5E20' }, underline: true }
  cTitle.alignment = { horizontal: 'center', vertical: 'middle' }

  const cSub = ws.getCell(r2, c1)
  cSub.value = subtitle
  cSub.font = { name: 'Segoe UI', size: 8.5, italic: true, color: { argb: 'FF555555' } }
  cSub.alignment = { horizontal: 'center', vertical: 'middle' }

  const bg = isHighlight ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } } : FILL_LIGHT
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      ws.getCell(r, c).fill = bg
      ws.getCell(r, c).border = {
        top: { style: 'thin', color: { argb: 'FF2E7D32' } },
        bottom: { style: 'thin', color: { argb: 'FF2E7D32' } },
        left: { style: 'thin', color: { argb: 'FF2E7D32' } },
        right: { style: 'thin', color: { argb: 'FF2E7D32' } },
      }
    }
  }
}

function addNavInfoBox(ws, r1, c1, r2, c2, title, subtitle) {
  safeMerge(ws, r1, c1, r1, c2)
  safeMerge(ws, r2, c1, r2, c2)

  const cTitle = ws.getCell(r1, c1)
  cTitle.value = title
  cTitle.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF2E7D32' } }
  cTitle.alignment = { horizontal: 'center', vertical: 'middle' }

  const cSub = ws.getCell(r2, c1)
  cSub.value = subtitle
  cSub.font = { name: 'Segoe UI', size: 8.5, italic: true, color: { argb: 'FF666666' } }
  cSub.alignment = { horizontal: 'center', vertical: 'middle' }

  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      ws.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
      ws.getCell(r, c).border = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      }
    }
  }
}

/**
 * Agrega una hoja de datos con tabla, filtros, totales y botón de volver
 */
function agregarHojaDatos(wb, { nombreHoja, tituloTabla, subtitulo, columnas = [], datos = [], fechaStr, horaStr }) {
  const ws = wb.addWorksheet(nombreHoja, {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 5 }],
  })
  const numCols = Math.max(columnas.length, 4)

  ws.columns = columnas.map((col) => ({ key: col.key, width: col.width || 18 }))

  // Fila 1: Banner + Botón Volver
  ws.getRow(1).height = 32
  if (numCols >= 4) {
    safeMerge(ws, 1, 1, 1, numCols - 2)
    const h = ws.getCell(1, 1)
    h.value = 'AGROINSUMOS DEL HUILA S.A.S.'
    h.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FFFFFFFF' } }
    h.fill = FILL_PRIMARY
    h.alignment = { horizontal: 'center', vertical: 'middle' }
    addBackButton(ws, 1, numCols - 1, numCols)
  }

  // Fila 2: Título de la tabla
  safeMerge(ws, 2, 1, 2, numCols)
  const ht = ws.getCell(2, 1)
  ht.value = String(tituloTabla).toUpperCase()
  ht.font = FONT_SUB
  ht.fill = FILL_SECONDARY
  ht.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(2).height = 24

  // Fila 3: Metadatos
  const half = Math.max(1, Math.floor(numCols / 2))
  if (half > 1) safeMerge(ws, 3, 1, 3, half)
  ws.getCell(3, 1).value = `Generado: ${fechaStr} ${horaStr} | ${subtitulo || ''}`
  ws.getCell(3, 1).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF555555' } }
  ws.getCell(3, 1).alignment = { vertical: 'middle' }
  if (numCols > half) {
    if (numCols - half > 1) safeMerge(ws, 3, half + 1, 3, numCols)
    const mr = ws.getCell(3, half + 1)
    mr.value = `${datos.length} registros • Caché Local ERP`
    mr.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF1B5E20' } }
    mr.alignment = { horizontal: 'right', vertical: 'middle' }
  }
  ws.getRow(3).height = 20
  ws.getRow(4).height = 6

  // Fila 5: Headers de columna
  const HR = 5
  ws.getRow(HR).height = 26
  columnas.forEach((col, i) => {
    const cell = ws.getRow(HR).getCell(i + 1)
    cell.value = col.header
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = FILL_PRIMARY
    cell.alignment = { horizontal: col.align || 'left', vertical: 'middle', wrapText: true }
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0D330E' } },
      bottom: { style: 'medium', color: { argb: 'FF0D330E' } },
      left: { style: 'thin', color: { argb: 'FF2E7D32' } },
      right: { style: 'thin', color: { argb: 'FF2E7D32' } },
    }
  })

  // AutoFilter
  const lastData = HR + Math.max(datos.length, 1)
  ws.autoFilter = { from: { row: HR, column: 1 }, to: { row: lastData, column: columnas.length } }

  // Filas de datos
  datos.forEach((item, rIdx) => {
    const row = ws.getRow(HR + 1 + rIdx)
    row.height = 20
    const even = rIdx % 2 === 1
    columnas.forEach((col, cIdx) => {
      const cell = row.getCell(cIdx + 1)
      let val = item[col.key]
      if (typeof col.transform === 'function') val = col.transform(val, item)
      if (col.type === 'number' || col.type === 'currency') {
        const n = Number(val)
        cell.value = isNaN(n) ? 0 : n
        cell.numFmt = col.numFmt || (col.type === 'currency' ? '"$"#,##0' : '#,##0')
      } else {
        cell.value = val != null ? String(val) : ''
      }
      cell.font = FONT_BODY
      cell.alignment = {
        horizontal: col.align || (col.type === 'currency' ? 'right' : 'left'),
        vertical: 'middle',
      }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: even ? 'FFF6FAF4' : 'FFFFFFFF' },
      }
      cell.border = BORDER_SOFT
    })
  })

  // Totales
  const hasT = columnas.some((c) => c.total)
  if (hasT && datos.length > 0) {
    const tr = ws.getRow(lastData + 1)
    tr.height = 24
    columnas.forEach((col, i) => {
      const cell = tr.getCell(i + 1)
      const L = getColumnLetter(i + 1)
      if (i === 0) {
        cell.value = 'TOTALES'
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1B5E20' } }
      }
      if (col.total === 'sum') {
        cell.value = { formula: `SUM(${L}${HR + 1}:${L}${lastData})` }
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1B5E20' } }
        cell.numFmt = col.numFmt || (col.type === 'currency' ? '"$"#,##0' : '#,##0')
      }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } }
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF1B5E20' } },
        bottom: { style: 'double', color: { argb: 'FF1B5E20' } },
        left: { style: 'thin', color: { argb: 'FFD0DDD0' } },
        right: { style: 'thin', color: { argb: 'FFD0DDD0' } },
      }
    })
  }

  // Ajuste automático de anchos de columna
  columnas.forEach((col, i) => {
    let mx = (col.header || '').length
    datos.slice(0, 100).forEach((item) => {
      let v = item[col.key]
      if (typeof col.transform === 'function') v = col.transform(v, item)
      if (v != null && String(v).length > mx) mx = String(v).length
    })
    ws.getColumn(i + 1).width = Math.max(col.width || 12, Math.min(mx + 4, 45))
  })
  return ws
}

// ══════════════════════════════════════════════════════════════════════════
// EXPORTAR LIBRO MAESTRO COMPLETO DEL ERP
// ══════════════════════════════════════════════════════════════════════════
export async function exportarLibroMaestroCompletoERP() {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'AgroInsumos del Huila ERP'
  wb.created = new Date()

  const now = new Date()
  const fechaStr = now.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
  const horaStr = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

  // Cargar imagen del logo institucional
  let logoImageId = null
  try {
    const resp = await fetch('/logo-agrofuturo.png')
    if (resp.ok) {
      const arrayBuffer = await resp.arrayBuffer()
      logoImageId = wb.addImage({
        buffer: arrayBuffer,
        extension: 'png',
      })
    }
  } catch (err) {
    console.warn('No se pudo cargar el logo para Excel:', err)
  }

  const clientes = erpCache.clientes || []
  const productos = erpCache.productos || []
  const facturas = erpCache.facturas || []
  const movimientos = erpCache.movimientos || []
  const proveedores = erpCache.proveedores || []
  const empleados = erpCache.empleados || []
  const activosFijos = erpCache.activos_fijos || []

  // Calcular valores en libros y depreciación de activos fijos si no vienen calculados
  const hoy = new Date()
  const activosCalculados = activosFijos.map((a) => {
    const costo = Number(a.costo_historico) || 0
    const residual = costo * 0.10
    const vidaUtilMeses = (Number(a.vida_util_anios) || 1) * 12
    const depreciacionMensual = vidaUtilMeses > 0 ? (costo - residual) / vidaUtilMeses : 0
    let mesesTranscurridos = 0
    if (a.fecha_compra) {
      const desde = new Date(a.fecha_compra)
      mesesTranscurridos = Math.min(
        Math.max((hoy.getFullYear() - desde.getFullYear()) * 12 + hoy.getMonth() - desde.getMonth(), 0),
        vidaUtilMeses
      )
    }
    const depreciacionAcumulada = depreciacionMensual * mesesTranscurridos
    const valorEnLibros = costo - depreciacionAcumulada
    return {
      ...a,
      valor_residual: residual,
      depreciacion_mensual: Math.round(depreciacionMensual),
      depreciacion_acumulada: Math.round(depreciacionAcumulada),
      valor_en_libros: Math.round(valorEnLibros),
    }
  })

  // Nombres de hojas estandarizados
  const H_ID = '🏢 Identidad Corporativa'
  const H_MVH = '📜 Misión Visión Historia'
  const H_TH = '👔 Talento Humano'
  const H_ORG = '🌳 Organigrama'
  const H_CLI = '👥 Clientes'
  const H_PROV = '🤝 Proveedores'
  const H_PROD = '📦 Productos'
  const H_FACT = '🧾 Facturación'
  const H_INV = '🔄 Kardex Inventario'
  const H_ACT = '🏢 Activos Fijos'
  const H_CONSULTAS = '🔍 Panel de Consultas'

  // ──────────────────────────────────────────────────────────────────────
  // PESTAÑA 1: 🏠 MENÚ PRINCIPAL INTERACTIVO (PORTADA EJECUTIVA ELEGANTE)
  // ──────────────────────────────────────────────────────────────────────
  const wsMenu = wb.addWorksheet(NOMBRE_HOJA_MENU, { views: [{ showGridLines: true }] })
  wsMenu.columns = [
    { width: 3.5 }, // A: Margen izquierdo
    { width: 16 },  // B: Columna 1 izquierda
    { width: 19 },  // C: Columna 1 derecha
    { width: 4 },   // D: Espaciador central 1
    { width: 16 },  // E: Columna 2 izquierda
    { width: 19 },  // F: Columna 2 derecha
    { width: 4 },   // G: Espaciador central 2
    { width: 16 },  // H: Columna 3 izquierda
    { width: 19 },  // I: Columna 3 derecha
    { width: 3.5 }, // J: Margen derecho
  ]

  // Fila 1: Margen superior
  wsMenu.getRow(1).height = 14

  // Filas 2 a 4: Encabezado Ejecutivo con Logo y Título
  wsMenu.getRow(2).height = 28
  wsMenu.getRow(3).height = 24
  wsMenu.getRow(4).height = 22

  // Cajón para el Logo institucional (B2:C4)
  safeMerge(wsMenu, 2, 2, 4, 3)
  for (let r = 2; r <= 4; r++) {
    for (let c = 2; c <= 3; c++) {
      wsMenu.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
      wsMenu.getCell(r, c).border = {
        top: { style: 'medium', color: { argb: 'FF1B5E20' } },
        bottom: { style: 'medium', color: { argb: 'FF1B5E20' } },
        left: { style: 'medium', color: { argb: 'FF1B5E20' } },
        right: { style: 'medium', color: { argb: 'FF1B5E20' } },
      }
    }
  }

  if (logoImageId !== null) {
    wsMenu.addImage(logoImageId, {
      tl: { col: 1.12, row: 1.12 },
      ext: { width: 175, height: 64 },
      editAs: 'oneCell',
    })
  } else {
    const cFallback = wsMenu.getCell(2, 2)
    cFallback.value = '🌾 AGROINSUMOS\nDEL HUILA S.A.S.'
    cFallback.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1B5E20' } }
    cFallback.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  }

  // Título Corporativo a la derecha del Logo (Cols D a I)
  safeMerge(wsMenu, 2, 4, 2, 9)
  const b1 = wsMenu.getCell(2, 4)
  b1.value = 'AGROINSUMOS DEL HUILA S.A.S.'
  b1.font = FONT_TITULO
  b1.fill = FILL_PRIMARY
  b1.alignment = { horizontal: 'center', vertical: 'middle' }

  safeMerge(wsMenu, 3, 4, 3, 9)
  const b2 = wsMenu.getCell(3, 4)
  b2.value = 'LIBRO MAESTRO INTERACTIVO • SISTEMA INTEGRAL ERP'
  b2.font = FONT_SUB
  b2.fill = FILL_SECONDARY
  b2.alignment = { horizontal: 'center', vertical: 'middle' }

  safeMerge(wsMenu, 4, 4, 4, 9)
  const b3 = wsMenu.getCell(4, 4)
  b3.value = 'NIT 901.234.567-8 • Neiva, Huila • República de Colombia'
  b3.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FFFFFFFF' } }
  b3.fill = FILL_TERTIARY
  b3.alignment = { horizontal: 'center', vertical: 'middle' }

  // Fila 5: Barra de Metadatos (B5:I5)
  wsMenu.getRow(5).height = 22
  safeMerge(wsMenu, 5, 2, 5, 9)
  const meta = wsMenu.getCell(5, 2)
  meta.value = `📅 Reporte Generado: ${fechaStr} a las ${horaStr}   •   🔒 100% Caché Local ERP   •   📂 10 Módulos Oficiales Integrados`
  meta.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF1B5E20' } }
  meta.fill = FILL_LIGHT
  meta.alignment = { horizontal: 'center', vertical: 'middle' }
  for (let c = 2; c <= 9; c++) {
    wsMenu.getCell(5, c).border = {
      bottom: { style: 'medium', color: { argb: 'FF1B5E20' } },
      left: { style: 'medium', color: { argb: 'FF1B5E20' } },
      right: { style: 'medium', color: { argb: 'FF1B5E20' } },
    }
  }

  // Fila 6: Separador
  wsMenu.getRow(6).height = 14

  // Fila 7: Encabezado de KPIs
  wsMenu.getRow(7).height = 24
  safeMerge(wsMenu, 7, 2, 7, 9)
  const hKpis = wsMenu.getCell(7, 2)
  hKpis.value = '📊 RESUMEN EJECUTIVO DE INDICADORES CLAVE (KPIS)'
  hKpis.font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: 'FF1B5E20' } }
  hKpis.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } }
  hKpis.alignment = { horizontal: 'center', vertical: 'middle' }
  for (let c = 2; c <= 9; c++) {
    wsMenu.getCell(7, c).border = {
      top: { style: 'thin', color: { argb: 'FF2E7D32' } },
      bottom: { style: 'thin', color: { argb: 'FF2E7D32' } },
      left: { style: 'thin', color: { argb: 'FF2E7D32' } },
      right: { style: 'thin', color: { argb: 'FF2E7D32' } },
    }
  }

  // Filas 8-10: KPIs Fila 1
  wsMenu.getRow(8).height = 18
  wsMenu.getRow(9).height = 22
  wsMenu.getRow(10).height = 16

  const totalVentas = facturas.reduce((a, f) => a + (Number(f.subtotal) || 0), 0)
  const totalStock = productos.reduce((a, p) => a + (Number(p.stock_actual) || 0), 0)
  const valorInv = productos.reduce((a, p) => a + (Number(p.valor_inventario) || ((p.costo_unitario || 0) * (p.stock_actual || 0)) || 0), 0)
  const valorActivosLibros = activosCalculados.reduce((a, act) => a + (Number(act.valor_en_libros) || 0), 0)

  applyKpiCard(wsMenu, 8, 2, 'Clientes y Cartera', clientes.length, `${clientes.filter((c) => c.estado === 'Activo').length} activos en cartera`)
  applyKpiCard(wsMenu, 8, 5, 'Valuación Inventario', `$${valorInv.toLocaleString('es-CO')}`, `${totalStock.toLocaleString('es-CO')} unidades en stock`)
  applyKpiCard(wsMenu, 8, 8, 'Facturación Total FV', `$${totalVentas.toLocaleString('es-CO')}`, `${facturas.length} ítems facturados`)

  // Filas 11-13: KPIs Fila 2
  wsMenu.getRow(11).height = 18
  wsMenu.getRow(12).height = 22
  wsMenu.getRow(13).height = 16

  applyKpiCard(wsMenu, 11, 2, 'Proveedores y Aliados', proveedores.length, `${proveedores.filter((p) => p.estado === 'Activo').length} aliados activos`)
  applyKpiCard(wsMenu, 11, 5, 'Talento Humano', empleados.length, `Estructura organizacional oficial`)
  applyKpiCard(wsMenu, 11, 8, 'Activos Fijos en Libros', `$${valorActivosLibros.toLocaleString('es-CO')}`, `${activosFijos.length} activos en planta`)

  // Fila 14: Separador
  wsMenu.getRow(14).height = 16

  // Fila 15: Encabezado de Directorio de Navegación
  wsMenu.getRow(15).height = 24
  safeMerge(wsMenu, 15, 2, 15, 9)
  const hNav = wsMenu.getCell(15, 2)
  hNav.value = '🧭 ÍNDICE MAESTRO DE NAVEGACIÓN — HAGA CLIC EN UN MÓDULO PARA ABRIRLO'
  hNav.font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: 'FF1B5E20' } }
  hNav.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } }
  hNav.alignment = { horizontal: 'center', vertical: 'middle' }
  for (let c = 2; c <= 9; c++) {
    wsMenu.getCell(15, c).border = {
      top: { style: 'thin', color: { argb: 'FF2E7D32' } },
      bottom: { style: 'thin', color: { argb: 'FF2E7D32' } },
      left: { style: 'thin', color: { argb: 'FF2E7D32' } },
      right: { style: 'thin', color: { argb: 'FF2E7D32' } },
    }
  }

  // Fila 16: Separador
  wsMenu.getRow(16).height = 8

  // Fila 17: Cabeceras de las 3 Columnas
  wsMenu.getRow(17).height = 24
  const titulosCols = [
    { start: 2, end: 3, texto: '1. IDENTIDAD CORPORATIVA' },
    { start: 5, end: 6, texto: '2. TALENTO HUMANO' },
    { start: 8, end: 9, texto: '3. GESTIÓN Y CONTROL' },
  ]
  titulosCols.forEach((tc) => {
    safeMerge(wsMenu, 17, tc.start, 17, tc.end)
    const cHead = wsMenu.getCell(17, tc.start)
    cHead.value = tc.texto
    cHead.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } }
    cHead.fill = FILL_PRIMARY
    cHead.alignment = { horizontal: 'center', vertical: 'middle' }
    for (let c = tc.start; c <= tc.end; c++) {
      wsMenu.getCell(17, c).border = {
        top: { style: 'medium', color: { argb: 'FF0D330E' } },
        bottom: { style: 'medium', color: { argb: 'FF0D330E' } },
        left: { style: 'medium', color: { argb: 'FF0D330E' } },
        right: { style: 'medium', color: { argb: 'FF0D330E' } },
      }
    }
  })

  // Fila 18: Separador
  wsMenu.getRow(18).height = 8

  // Filas 19-20: Tarjetas Bloque 1
  wsMenu.getRow(19).height = 22
  wsMenu.getRow(20).height = 18
  addNavCard(wsMenu, 19, 2, 20, 3, '🏢 Identidad Corporativa ➔', 'Ficha técnica, NIT, sede y datos legales', H_ID)
  addNavCard(wsMenu, 19, 5, 20, 6, '👔 Hojas de Vida ➔', `${empleados.length} colaboradores, salarios y EPS`, H_TH)
  addNavCard(wsMenu, 19, 8, 20, 9, '👥 Clientes y Cartera ➔', `${clientes.length} clientes registrados en sistema`, H_CLI)

  // Fila 21: Separador
  wsMenu.getRow(21).height = 6

  // Filas 22-23: Tarjetas Bloque 2
  wsMenu.getRow(22).height = 22
  wsMenu.getRow(23).height = 18
  addNavCard(wsMenu, 22, 2, 23, 3, '📜 Misión, Visión e Historia ➔', 'Propósito, Visión 2030 y trayectoria', H_MVH)
  addNavCard(wsMenu, 22, 5, 23, 6, '🌳 Organigrama Oficial ➔', 'Árbol jerárquico real y líneas de mando', H_ORG, true)
  addNavCard(wsMenu, 22, 8, 23, 9, '🤝 Proveedores y Aliados ➔', `${proveedores.length} proveedores registrados`, H_PROV)

  // Fila 24: Separador
  wsMenu.getRow(24).height = 6

  // Filas 25-26: Tarjetas Bloque 3
  wsMenu.getRow(25).height = 22
  wsMenu.getRow(26).height = 18
  addNavInfoBox(wsMenu, 25, 2, 26, 3, '📍 Sede Principal: Neiva, Huila', 'Cobertura departamental desde 2015')
  addNavInfoBox(wsMenu, 25, 5, 26, 6, '👥 Planta de Personal Activa', '100% Verificado en el sistema')
  addNavCard(wsMenu, 25, 8, 26, 9, '📦 Catálogo de Productos ➔', `${productos.length} referencias y existencias`, H_PROD)

  // Fila 27: Separador
  wsMenu.getRow(27).height = 6

  // Filas 28-29: Tarjetas Bloque 4
  wsMenu.getRow(28).height = 22
  wsMenu.getRow(29).height = 18
  addNavInfoBox(wsMenu, 28, 2, 29, 3, '🌾 Insumos Agrícolas del Sur', 'Comercialización y distribución')
  addNavInfoBox(wsMenu, 28, 5, 29, 6, '⚖️ Cumplimiento Laboral', 'Nómina, seguridad social y contratos')
  addNavCard(wsMenu, 28, 8, 29, 9, '🧾 Historial Facturación ➔', `${facturas.length} ítems facturados (FV)`, H_FACT)

  // Fila 30: Separador
  wsMenu.getRow(30).height = 6

  // Filas 31-32: Tarjetas Bloque 5
  wsMenu.getRow(31).height = 22
  wsMenu.getRow(32).height = 18
  addNavInfoBox(wsMenu, 31, 2, 32, 3, '⭐ Calidad Garantizada', 'Asesoría técnica en campo')
  addNavInfoBox(wsMenu, 31, 5, 32, 6, '🌱 Crecimiento Sostenible', 'Equipo profesional calificado')
  addNavCard(wsMenu, 31, 8, 32, 9, '🔄 Kardex de Inventario ➔', `${movimientos.length} movimientos registrados`, H_INV)

  // Fila 33: Separador
  wsMenu.getRow(33).height = 6

  // Filas 34-35: Tarjetas Bloque 6
  wsMenu.getRow(34).height = 22
  wsMenu.getRow(35).height = 18
  addNavInfoBox(wsMenu, 34, 2, 35, 3, '🇨🇴 AgroInsumos del Huila', 'S.A.S. - Neiva')
  addNavInfoBox(wsMenu, 34, 5, 35, 6, '📋 Hojas de Vida Validadas', 'Directorio de colaboradores')
  addNavCard(wsMenu, 34, 8, 35, 9, '🏢 Control Activos Fijos ➔', `${activosFijos.length} activos y depreciación`, H_ACT)

  // Fila 36: Separador
  wsMenu.getRow(36).height = 12

  // Filas 37-38: Caja de Instrucciones y Tips
  wsMenu.getRow(37).height = 20
  wsMenu.getRow(38).height = 20
  safeMerge(wsMenu, 37, 2, 38, 9)
  const tip = wsMenu.getCell(37, 2)
  tip.value =
    '💡 Instrucciones de Uso: Haga clic en cualquiera de las tarjetas de color verde para ir directamente al módulo deseado. Cada pestaña interna cuenta con un botón rojo "⬅ VOLVER AL MENÚ" en la fila 1 para retornar instantáneamente a esta portada.'
  tip.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF1B5E20' } }
  tip.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  for (let r = 37; r <= 38; r++) {
    for (let c = 2; c <= 9; c++) {
      wsMenu.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } }
      wsMenu.getCell(r, c).border = {
        top: { style: 'thin', color: { argb: 'FF2E7D32' } },
        bottom: { style: 'thin', color: { argb: 'FF2E7D32' } },
        left: { style: 'thin', color: { argb: 'FF2E7D32' } },
        right: { style: 'thin', color: { argb: 'FF2E7D32' } },
      }
    }
  }

  // Fila 39: Separador
  wsMenu.getRow(39).height = 8

  // Filas 40-41: Tarjeta Panel de Consultas BUSCARV/BUSCARH (destacada)
  wsMenu.getRow(40).height = 22
  wsMenu.getRow(41).height = 18
  addNavCard(wsMenu, 40, 2, 41, 9, '🔍 Panel de Consultas BUSCARV / BUSCARH ➔',
    'Búsqueda interactiva: Productos, Clientes y Empleados con fórmulas Excel nativas',
    H_CONSULTAS, true)

  // Fila 42: Separador
  wsMenu.getRow(42).height = 8

  // Fila 43: Pie de Portada
  wsMenu.getRow(43).height = 20
  safeMerge(wsMenu, 43, 2, 43, 9)
  const footerCover = wsMenu.getCell(43, 2)
  footerCover.value = 'Agroinsumos del Huila S.A.S. • Sistema de Información ERP • Reporte Oficial Confidencial'
  footerCover.font = { name: 'Segoe UI', size: 8.5, color: { argb: 'FF777777' } }
  footerCover.alignment = { horizontal: 'center', vertical: 'middle' }

  // ──────────────────────────────────────────────────────────────────────
  // PESTAÑA 2: 🏢 IDENTIDAD CORPORATIVA
  // ──────────────────────────────────────────────────────────────────────
  const wsID = wb.addWorksheet(H_ID, { views: [{ showGridLines: true }] })
  wsID.columns = [{ width: 4 }, { width: 24 }, { width: 55 }, { width: 22 }, { width: 4 }]
  wsID.getRow(1).height = 32

  safeMerge(wsID, 1, 2, 1, 3)
  wsID.getCell(1, 2).value = 'AGROINSUMOS DEL HUILA S.A.S.'
  wsID.getCell(1, 2).font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FFFFFFFF' } }
  wsID.getCell(1, 2).fill = FILL_PRIMARY
  wsID.getCell(1, 2).alignment = { horizontal: 'center', vertical: 'middle' }
  addBackButton(wsID, 1, 4, 4)

  if (logoImageId !== null) {
    wsID.addImage(logoImageId, {
      tl: { col: 1.05, row: 0.08 },
      ext: { width: 120, height: 42 },
      editAs: 'oneCell',
    })
  }

  safeMerge(wsID, 2, 2, 2, 4)
  wsID.getCell(2, 2).value = 'IDENTIDAD CORPORATIVA Y DATOS DE LA EMPRESA'
  wsID.getCell(2, 2).font = FONT_SUB
  wsID.getCell(2, 2).fill = FILL_SECONDARY
  wsID.getCell(2, 2).alignment = { horizontal: 'center', vertical: 'middle' }
  wsID.getRow(2).height = 26

  const infoEmpresa = [
    ['Razón Social', 'AgroInsumos del Huila S.A.S.'],
    ['NIT', '901.234.567-8'],
    ['Tipo de Sociedad', 'Sociedad por Acciones Simplificada (S.A.S.)'],
    ['Año de Fundación', '2015'],
    ['Año de Constitución Legal', '2018'],
    ['Ciudad Principal', 'Neiva, Huila'],
    ['Departamento', 'Huila'],
    ['País', 'Colombia'],
    ['Sector Económico', 'Comercialización y distribución de insumos agrícolas e industriales'],
    ['Actividad Principal', 'Venta mayorista y minorista de fertilizantes, agroquímicos, semillas y herramientas'],
    ['Cobertura Geográfica', 'Neiva, Campoalegre, Rivera, Pitalito, Garzón, La Plata y municipios del Huila'],
    ['Número de Colaboradores', '10 empleados en planta'],
    ['Cámara de Comercio', 'Cámara de Comercio del Huila (Sede Neiva)'],
    ['Sistema ERP', 'AgroInsumos ERP - Sistema Integral de Control y Gestión'],
    ['Fecha de Generación', `${fechaStr} a las ${horaStr}`],
  ]

  let rowID = 4
  infoEmpresa.forEach(([label, value], idx) => {
    rowID++
    wsID.getRow(rowID).height = 22
    wsID.getCell(rowID, 2).value = label
    wsID.getCell(rowID, 2).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1B5E20' } }
    wsID.getCell(rowID, 2).alignment = { vertical: 'middle' }
    wsID.getCell(rowID, 3).value = value
    wsID.getCell(rowID, 3).font = FONT_BODY
    wsID.getCell(rowID, 3).alignment = { vertical: 'middle' }
    const bgColor = idx % 2 === 0 ? 'FFF4F9F2' : 'FFFFFFFF'
    for (let c = 2; c <= 3; c++) {
      wsID.getCell(rowID, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
      wsID.getCell(rowID, c).border = BORDER_SOFT
    }
  })

  // ──────────────────────────────────────────────────────────────────────
  // PESTAÑA 3: 📜 MISIÓN, VISIÓN E HISTORIA (MVH)
  // ──────────────────────────────────────────────────────────────────────
  const wsMVH = wb.addWorksheet(H_MVH, { views: [{ showGridLines: true }] })
  wsMVH.columns = [{ width: 4 }, { width: 22 }, { width: 62 }, { width: 20 }, { width: 4 }]
  wsMVH.getRow(1).height = 32

  safeMerge(wsMVH, 1, 2, 1, 3)
  wsMVH.getCell(1, 2).value = 'AGROINSUMOS DEL HUILA S.A.S.'
  wsMVH.getCell(1, 2).font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FFFFFFFF' } }
  wsMVH.getCell(1, 2).fill = FILL_PRIMARY
  wsMVH.getCell(1, 2).alignment = { horizontal: 'center', vertical: 'middle' }
  addBackButton(wsMVH, 1, 4, 4)

  safeMerge(wsMVH, 2, 2, 2, 4)
  wsMVH.getCell(2, 2).value = 'MISIÓN, VISIÓN E HISTORIA INSTITUCIONAL'
  wsMVH.getCell(2, 2).font = FONT_SUB
  wsMVH.getCell(2, 2).fill = FILL_SECONDARY
  wsMVH.getCell(2, 2).alignment = { horizontal: 'center', vertical: 'middle' }
  wsMVH.getRow(2).height = 26

  let mr = 4
  // MISIÓN
  safeMerge(wsMVH, mr, 2, mr, 3)
  wsMVH.getCell(mr, 2).value = '🎯 MISIÓN'
  wsMVH.getCell(mr, 2).font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FF1B5E20' } }
  wsMVH.getRow(mr).height = 28
  mr++
  safeMerge(wsMVH, mr, 2, mr + 2, 3)
  wsMVH.getCell(mr, 2).value =
    'AgroInsumos del Huila S.A.S. es una empresa dedicada a la comercialización y distribución de insumos agrícolas e industriales en el departamento del Huila, comprometida con ofrecer productos de calidad, asesoría técnica especializada y un servicio oportuno que contribuya a la productividad de nuestros clientes del sector agropecuario.'
  wsMVH.getCell(mr, 2).font = { name: 'Segoe UI', size: 10.5 }
  wsMVH.getCell(mr, 2).alignment = { horizontal: 'left', vertical: 'top', wrapText: true }
  for (let r = mr; r <= mr + 2; r++) {
    for (let c = 2; c <= 3; c++) {
      wsMVH.getCell(r, c).fill = FILL_LIGHT
      wsMVH.getCell(r, c).border = BORDER_SOFT
    }
  }
  mr += 4

  // VISIÓN
  safeMerge(wsMVH, mr, 2, mr, 3)
  wsMVH.getCell(mr, 2).value = '🔭 VISIÓN 2030'
  wsMVH.getCell(mr, 2).font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FF1B5E20' } }
  wsMVH.getRow(mr).height = 28
  mr++
  safeMerge(wsMVH, mr, 2, mr + 2, 3)
  wsMVH.getCell(mr, 2).value =
    'Para el año 2030, AgroInsumos del Huila S.A.S. será reconocida como la empresa líder en distribución de insumos agropecuarios en el sur del país, destacada por su innovación, cobertura regional y compromiso con el desarrollo sostenible del campo.'
  wsMVH.getCell(mr, 2).font = { name: 'Segoe UI', size: 10.5 }
  wsMVH.getCell(mr, 2).alignment = { horizontal: 'left', vertical: 'top', wrapText: true }
  for (let r = mr; r <= mr + 2; r++) {
    for (let c = 2; c <= 3; c++) {
      wsMVH.getCell(r, c).fill = FILL_LIGHT
      wsMVH.getCell(r, c).border = BORDER_SOFT
    }
  }
  mr += 4

  // HISTORIA
  safeMerge(wsMVH, mr, 2, mr, 3)
  wsMVH.getCell(mr, 2).value = '📖 HISTORIA Y CONSTITUCIÓN'
  wsMVH.getCell(mr, 2).font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FF1B5E20' } }
  wsMVH.getRow(mr).height = 28
  mr++
  safeMerge(wsMVH, mr, 2, mr + 3, 3)
  wsMVH.getCell(mr, 2).value =
    'La empresa fue fundada en el año 2015 en la ciudad de Neiva por un grupo de emprendedores del sector agroindustrial, inicialmente como distribuidora de fertilizantes a pequeña escala. En 2018 se constituyó legalmente como Sociedad por Acciones Simplificada (S.A.S.) ante la Cámara de Comercio de Neiva, ampliando su portafolio a insumos veterinarios y herramientas agrícolas. Desde entonces ha crecido hasta contar con una planta de 10 colaboradores y cobertura en varios municipios del Huila.'
  wsMVH.getCell(mr, 2).font = { name: 'Segoe UI', size: 10.5 }
  wsMVH.getCell(mr, 2).alignment = { horizontal: 'left', vertical: 'top', wrapText: true }
  for (let r = mr; r <= mr + 3; r++) {
    for (let c = 2; c <= 3; c++) {
      wsMVH.getCell(r, c).fill = FILL_LIGHT
      wsMVH.getCell(r, c).border = BORDER_SOFT
    }
  }
  mr += 5

  // LÍNEA DE TIEMPO
  safeMerge(wsMVH, mr, 2, mr, 3)
  wsMVH.getCell(mr, 2).value = '📅 LÍNEA DE TIEMPO DE HITOS HISTÓRICOS'
  wsMVH.getCell(mr, 2).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1B5E20' } }
  wsMVH.getRow(mr).height = 24
  mr++
  const hitos = [
    ['2015', 'Fundación en Neiva', 'Inicios en el agro huilense como distribuidora de fertilizantes a pequeña escala.'],
    ['2018', 'Constitución S.A.S.', 'Formalización ante la Cámara de Comercio de Neiva y ampliación a insumos veterinarios y herramientas agrícolas.'],
    ['Hoy', 'Consolidación Regional', 'Equipo humano consolidado de 10 colaboradores expertos y presencia activa en múltiples municipios del departamento del Huila.'],
  ]
  hitos.forEach(([year, title, desc], i) => {
    wsMVH.getCell(mr, 2).value = year
    wsMVH.getCell(mr, 2).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1B5E20' } }
    wsMVH.getCell(mr, 2).alignment = { horizontal: 'center', vertical: 'middle' }
    wsMVH.getCell(mr, 3).value = `${title} — ${desc}`
    wsMVH.getCell(mr, 3).font = FONT_BODY
    wsMVH.getCell(mr, 3).alignment = { vertical: 'middle', wrapText: true }
    wsMVH.getRow(mr).height = 34
    const bg = i % 2 === 0 ? 'FFF4F9F2' : 'FFFFFFFF'
    for (let c = 2; c <= 3; c++) {
      wsMVH.getCell(mr, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
      wsMVH.getCell(mr, c).border = BORDER_SOFT
    }
    mr++
  })

  // ──────────────────────────────────────────────────────────────────────
  // PESTAÑA 4: 🌳 ORGANIGRAMA EMPRESARIAL (ÁRBOL JERÁRQUICO REAL Y DINÁMICO)
  // ──────────────────────────────────────────────────────────────────────
  const wsOrg = wb.addWorksheet(H_ORG, { views: [{ showGridLines: true }] })
  wsOrg.columns = [
    { width: 3 },  // A
    { width: 14 }, // B: Nivel
    { width: 36 }, // C: Árbol Jerárquico Visual
    { width: 26 }, // D: Colaborador
    { width: 15 }, // E: Cédula
    { width: 25 }, // F: Cargo
    { width: 20 }, // G: Área
    { width: 26 }, // H: Jefe Inmediato
    { width: 16 }, // I: Subordinados
    { width: 14 }, // J: Estado
    { width: 16 }, // K: Teléfono
    { width: 26 }, // L: Correo
    { width: 3 },  // M
  ]

  // Fila 1: Banner + Volver
  wsOrg.getRow(1).height = 32
  safeMerge(wsOrg, 1, 2, 1, 10)
  wsOrg.getCell(1, 2).value = 'AGROINSUMOS DEL HUILA S.A.S. — ESTRUCTURA ORGANIZACIONAL'
  wsOrg.getCell(1, 2).font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FFFFFFFF' } }
  wsOrg.getCell(1, 2).fill = FILL_PRIMARY
  wsOrg.getCell(1, 2).alignment = { horizontal: 'center', vertical: 'middle' }
  addBackButton(wsOrg, 1, 11, 12)

  // Fila 2: Subtítulo
  safeMerge(wsOrg, 2, 2, 2, 12)
  wsOrg.getCell(2, 2).value = 'ORGANIGRAMA JERÁRQUICO OFICIAL (DATOS REALES DEL SISTEMA)'
  wsOrg.getCell(2, 2).font = FONT_SUB
  wsOrg.getCell(2, 2).fill = FILL_SECONDARY
  wsOrg.getCell(2, 2).alignment = { horizontal: 'center', vertical: 'middle' }
  wsOrg.getRow(2).height = 24

  // 1. CONSTRUCCIÓN DEL ÁRBOL REAL DESDE LOS DATOS DE EMPLEADOS
  const mapaEmpleados = new Map()
  empleados.forEach((emp) => {
    mapaEmpleados.set(emp.id, {
      ...emp,
      nombreCompleto: `${emp.nombres || ''} ${emp.apellidos || ''}`.trim() || 'Sin Nombre',
      subordinados: [],
    })
  })

  const raicesReales = []
  mapaEmpleados.forEach((emp) => {
    if (emp.jefe_id && mapaEmpleados.has(emp.jefe_id)) {
      const jefe = mapaEmpleados.get(emp.jefe_id)
      jefe.subordinados.push(emp)
      emp.jefeNombre = jefe.nombreCompleto
      emp.jefeCargo = jefe.cargo || 'Líder de Área'
    } else {
      emp.jefeNombre = '— (Máxima Autoridad / Cúspide)'
      emp.jefeCargo = 'Alta Dirección'
      raicesReales.push(emp)
    }
  })

  // Aplanar el árbol en recorrido jerárquico (DFS)
  const arbolAplanado = []
  const visitados = new Set()

  function recorrerNodo(nodo, nivel, prefijo, esUltimo) {
    if (visitados.has(nodo.id)) return
    visitados.add(nodo.id)

    const conector = nivel === 1 ? '🏢 ' : (esUltimo ? '└── 👔 ' : '├── 👔 ')
    arbolAplanado.push({
      ...nodo,
      nivel,
      totalSubordinados: nodo.subordinados ? nodo.subordinados.length : 0,
      visualArbol: prefijo + conector + nodo.nombreCompleto,
    })

    const nuevoPrefijo = prefijo + (nivel === 1 ? '    ' : (esUltimo ? '     ' : '│    '))
    const subs = nodo.subordinados || []
    subs.forEach((hijo, idx) => {
      recorrerNodo(hijo, nivel + 1, nuevoPrefijo, idx === subs.length - 1)
    })
  }

  raicesReales.forEach((raiz, i) => {
    recorrerNodo(raiz, 1, '', i === raicesReales.length - 1)
  })

  // 2. NODO RAÍZ EMPRESARIAL (CÚSPIDE DEL ORGANIGRAMA)
  wsOrg.getRow(4).height = 26
  safeMerge(wsOrg, 4, 3, 4, 11)
  const cEmp = wsOrg.getCell(4, 3)
  cEmp.value = '🏛️ AGROINSUMOS DEL HUILA S.A.S.'
  cEmp.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FFFFFFFF' } }
  cEmp.fill = FILL_PRIMARY
  cEmp.alignment = { horizontal: 'center', vertical: 'middle' }

  wsOrg.getRow(5).height = 22
  safeMerge(wsOrg, 5, 3, 5, 11)
  const cEmpSub = wsOrg.getCell(5, 3)
  cEmpSub.value = `Estructura Oficial • ${raicesReales.length} Líderes Principales • ${empleados.length} Total de Colaboradores`
  cEmpSub.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF1B5E20' } }
  cEmpSub.fill = FILL_LIGHT
  cEmpSub.alignment = { horizontal: 'center', vertical: 'middle' }

  for (let c = 3; c <= 11; c++) {
    wsOrg.getCell(4, c).border = { top: { style: 'medium', color: { argb: 'FF1B5E20' } }, left: { style: 'medium', color: { argb: 'FF1B5E20' } }, right: { style: 'medium', color: { argb: 'FF1B5E20' } } }
    wsOrg.getCell(5, c).border = { bottom: { style: 'medium', color: { argb: 'FF1B5E20' } }, left: { style: 'medium', color: { argb: 'FF1B5E20' } }, right: { style: 'medium', color: { argb: 'FF1B5E20' } } }
  }

  // 3. TABLA MATRIZ JERÁRQUICA CON SANGRÍA Y ESTRUCTURA EN ÁRBOL
  let rTabla = 7
  safeMerge(wsOrg, rTabla, 2, rTabla, 12)
  wsOrg.getCell(rTabla, 2).value = 'ESTRUCTURA JERÁRQUICA DEL PERSONAL (ÁRBOL ORGANIZACIONAL REAL)'
  wsOrg.getCell(rTabla, 2).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1B5E20' } }
  wsOrg.getRow(rTabla).height = 24

  rTabla++
  const headersTree = [
    'Nivel',
    'Jerarquía en Árbol',
    'Colaborador',
    'Cédula',
    'Cargo',
    'Área',
    'Jefe Inmediato',
    'Subordinados',
    'Estado',
    'Teléfono',
    'Correo Electrónico',
  ]

  wsOrg.getRow(rTabla).height = 26
  headersTree.forEach((h, idx) => {
    const colNumber = idx + 2 // Inicia en columna B (2)
    const cell = wsOrg.getCell(rTabla, colNumber)
    cell.value = h
    cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = FILL_PRIMARY
    cell.alignment = {
      horizontal: idx === 0 || idx === 3 || idx === 7 || idx === 8 || idx === 9 ? 'center' : 'left',
      vertical: 'middle',
    }
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0D330E' } },
      bottom: { style: 'medium', color: { argb: 'FF0D330E' } },
      left: { style: 'thin', color: { argb: 'FF2E7D32' } },
      right: { style: 'thin', color: { argb: 'FF2E7D32' } },
    }
  })

  // Filas de colaboradores ordenados jerárquicamente
  if (arbolAplanado.length === 0) {
    rTabla++
    safeMerge(wsOrg, rTabla, 2, rTabla, 12)
    const emptyCell = wsOrg.getCell(rTabla, 2)
    emptyCell.value = 'No se encontraron colaboradores registrados en el sistema.'
    emptyCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF777777' } }
    emptyCell.alignment = { horizontal: 'center', vertical: 'middle' }
    wsOrg.getRow(rTabla).height = 30
  } else {
    arbolAplanado.forEach((emp, idx) => {
      rTabla++
      const row = wsOrg.getRow(rTabla)
      row.height = 24

      // Outline level para expandir / contraer en Excel según el nivel jerárquico
      if (emp.nivel > 1) {
        row.outlineLevel = Math.min(emp.nivel - 1, 7)
      }

      // Estilos según el nivel jerárquico real
      let nivelTexto = `Nivel ${emp.nivel}`
      let bgNivel = 'FFFFFFFF'
      let fontColor = 'FF000000'
      let esBold = false

      if (emp.nivel === 1) {
        nivelTexto = 'Nivel 1 (Líder)'
        bgNivel = 'FFE8F5E9'
        fontColor = 'FF1B5E20'
        esBold = true
      } else if (emp.nivel === 2) {
        nivelTexto = 'Nivel 2 (Jefatura)'
        bgNivel = 'FFF6FAF4'
        esBold = true
      } else {
        nivelTexto = `Nivel ${emp.nivel} (Operativo)`
        bgNivel = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF9FCF8'
      }

      const valoresFila = [
        nivelTexto,
        emp.visualArbol,
        emp.nombreCompleto,
        emp.cedula || '—',
        emp.cargo || '—',
        emp.area || 'General',
        emp.jefeNombre || '—',
        emp.totalSubordinados,
        emp.estado || 'Activo',
        emp.telefono || '—',
        emp.correo || '—',
      ]

      valoresFila.forEach((val, cIdx) => {
        const cell = row.getCell(cIdx + 2)
        cell.value = val
        cell.font = {
          name: 'Segoe UI',
          size: emp.nivel === 1 ? 10 : 9.5,
          bold: cIdx === 1 ? esBold : (cIdx === 0 && emp.nivel === 1),
          color: { argb: cIdx === 0 && emp.nivel === 1 ? fontColor : 'FF333333' },
        }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgNivel } }
        cell.alignment = {
          horizontal: cIdx === 0 || cIdx === 3 || cIdx === 7 || cIdx === 8 || cIdx === 9 ? 'center' : 'left',
          vertical: 'middle',
        }
        cell.border = BORDER_SOFT
      })
    })

    // Filtros automáticos en la tabla del organigrama
    wsOrg.autoFilter = {
      from: { row: 8, column: 2 },
      to: { row: rTabla, column: 12 },
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // PESTAÑA 5: 👔 TALENTO HUMANO (HOJAS DE VIDA)
  // ──────────────────────────────────────────────────────────────────────
  const colsTH = [
    { header: 'Cédula', key: 'cedula', width: 16, align: 'center' },
    { header: 'Nombres', key: 'nombres', width: 22 },
    { header: 'Apellidos', key: 'apellidos', width: 22 },
    { header: 'Cargo', key: 'cargo', width: 24 },
    { header: 'Área', key: 'area', width: 20 },
    { header: 'Estado', key: 'estado', width: 14, align: 'center' },
    { header: 'Tipo Contrato', key: 'tipo_contrato', width: 18 },
    { header: 'Fecha Ingreso', key: 'fecha_ingreso', width: 16, align: 'center', transform: (v) => (v ? new Date(v).toLocaleDateString('es-CO') : '—') },
    { header: 'Salario Base', key: 'salario', width: 18, type: 'currency', align: 'right', total: 'sum' },
    { header: 'EPS', key: 'eps', width: 18 },
    { header: 'Teléfono', key: 'telefono', width: 16, align: 'center' },
    { header: 'Correo', key: 'correo', width: 26 },
  ]
  agregarHojaDatos(wb, {
    nombreHoja: H_TH,
    tituloTabla: 'DIRECTORIO DE TALENTO HUMANO — HOJAS DE VIDA',
    subtitulo: 'Módulo de Talento Humano y Nómina',
    columnas: colsTH,
    datos: empleados,
    fechaStr,
    horaStr,
  })

  // ──────────────────────────────────────────────────────────────────────
  // PESTAÑA 6: 👥 CLIENTES
  // ──────────────────────────────────────────────────────────────────────
  agregarHojaDatos(wb, {
    nombreHoja: H_CLI,
    tituloTabla: 'DIRECTORIO GENERAL DE CLIENTES Y CARTERA',
    subtitulo: 'Gestión y Control — Clientes',
    columnas: [
      { header: 'Cédula / NIT', key: 'cedula', width: 16, align: 'center' },
      { header: 'Nombre', key: 'nombre', width: 20 },
      { header: 'Apellidos', key: 'apellidos', width: 20 },
      { header: 'Teléfono', key: 'telefono', width: 16, align: 'center' },
      { header: 'Correo', key: 'correo', width: 26 },
      { header: 'Dirección', key: 'direccion', width: 30 },
      { header: 'Estado', key: 'estado', width: 14, align: 'center' },
      { header: 'Fecha Registro', key: 'created_at', width: 18, align: 'center', transform: (v) => (v ? new Date(v).toLocaleDateString('es-CO') : '—') },
    ],
    datos: clientes,
    fechaStr,
    horaStr,
  })

  // ──────────────────────────────────────────────────────────────────────
  // PESTAÑA 7: 🤝 PROVEEDORES
  // ──────────────────────────────────────────────────────────────────────
  agregarHojaDatos(wb, {
    nombreHoja: H_PROV,
    tituloTabla: 'DIRECTORIO DE PROVEEDORES Y ALIADOS COMERCIALES',
    subtitulo: 'Gestión y Control — Proveedores',
    columnas: [
      { header: 'Código', key: 'codigo', width: 14, align: 'center' },
      { header: 'NIT', key: 'nit', width: 16, align: 'center' },
      { header: 'Razón Social / Empresa', key: 'nombre', width: 32 },
      { header: 'Contacto Comercial', key: 'contacto', width: 24 },
      { header: 'Teléfono', key: 'telefono', width: 16, align: 'center' },
      { header: 'Correo Electrónico', key: 'correo', width: 26 },
      { header: 'Ciudad', key: 'ciudad', width: 18, align: 'center' },
      { header: 'Estado', key: 'estado', width: 14, align: 'center' },
    ],
    datos: proveedores,
    fechaStr,
    horaStr,
  })

  // ──────────────────────────────────────────────────────────────────────
  // PESTAÑA 8: 📦 PRODUCTOS
  // ──────────────────────────────────────────────────────────────────────
  agregarHojaDatos(wb, {
    nombreHoja: H_PROD,
    tituloTabla: 'CATÁLOGO DE PRODUCTOS E INVENTARIO VALUADO',
    subtitulo: 'Gestión y Control — Productos',
    columnas: [
      { header: 'Código', key: 'codigo', width: 14, align: 'center' },
      { header: 'Producto', key: 'nombre', width: 34 },
      { header: 'Categoría', key: 'categoria', width: 20 },
      { header: 'Unidad', key: 'unidad', width: 12, align: 'center' },
      { header: 'Stock Actual', key: 'stock_actual', width: 15, type: 'number', align: 'center', total: 'sum' },
      { header: 'Stock Mínimo', key: 'stock_minimo', width: 15, type: 'number', align: 'center' },
      { header: 'Costo Unitario', key: 'costo_unitario', width: 18, type: 'currency', align: 'right' },
      { header: 'Precio Venta', key: 'precio_venta', width: 18, type: 'currency', align: 'right' },
      { header: 'Valor Inventario', key: 'valor_inventario', width: 20, type: 'currency', align: 'right', total: 'sum', transform: (v, r) => v || ((r.costo_unitario || 0) * (r.stock_actual || 0)) },
      { header: 'Alerta Reposición', key: 'alerta', width: 18, align: 'center', transform: (v, r) => ((r.stock_actual ?? 0) <= (r.stock_minimo ?? 0) ? '⚠️ REABASTECER' : '✅ OK') },
    ],
    datos: productos,
    fechaStr,
    horaStr,
  })

  // ──────────────────────────────────────────────────────────────────────
  // PESTAÑA 9: 🧾 FACTURACIÓN Y VENTAS
  // ──────────────────────────────────────────────────────────────────────
  agregarHojaDatos(wb, {
    nombreHoja: H_FACT,
    tituloTabla: 'HISTORIAL DE FACTURACIÓN Y LÍNEAS DE VENTA (FV)',
    subtitulo: 'Gestión y Control — Ventas e Ingresos',
    columnas: [
      { header: 'N.° Factura', key: 'documento', width: 16, align: 'center' },
      { header: 'Fecha', key: 'fecha', width: 14, align: 'center', transform: (v, r) => v || (r.created_at ? new Date(r.created_at).toLocaleDateString('es-CO') : '—') },
      { header: 'Cliente', key: 'cliente_nombre', width: 30 },
      { header: 'Producto', key: 'producto_nombre', width: 32 },
      { header: 'Cantidad', key: 'cantidad', width: 14, type: 'number', align: 'center', total: 'sum' },
      { header: 'Precio Unitario', key: 'precio_unitario', width: 18, type: 'currency', align: 'right' },
      { header: 'Subtotal Venta', key: 'subtotal', width: 20, type: 'currency', align: 'right', total: 'sum' },
    ],
    datos: facturas,
    fechaStr,
    horaStr,
  })

  // ──────────────────────────────────────────────────────────────────────
  // PESTAÑA 10: 🔄 KARDEX INVENTARIO
  // ──────────────────────────────────────────────────────────────────────
  agregarHojaDatos(wb, {
    nombreHoja: H_INV,
    tituloTabla: 'KARDEX DE MOVIMIENTOS Y CONTROL DE EXISTENCIAS',
    subtitulo: 'Gestión y Control — Inventario',
    columnas: [
      { header: 'Fecha', key: 'fecha', width: 14, align: 'center' },
      { header: 'Documento', key: 'documento', width: 16, align: 'center' },
      { header: 'Producto', key: 'producto', width: 34, transform: (v, r) => r.productos?.nombre || 'Producto' },
      { header: 'Tipo Mov.', key: 'tipo', width: 14, align: 'center' },
      { header: 'Cantidad', key: 'cantidad', width: 14, type: 'number', align: 'center', total: 'sum' },
      { header: 'Stock Resultante', key: 'stock_resultante', width: 16, type: 'number', align: 'center' },
      { header: 'Valor Movimiento', key: 'valor_movimiento', width: 18, type: 'currency', align: 'right', total: 'sum' },
      { header: 'Estado Stock', key: 'alerta', width: 16, align: 'center', transform: (v, r) => ((r.stock_resultante ?? 0) <= (r.productos?.stock_minimo ?? 0) ? '⚠️ BAJO MÍNIMO' : '✅ NORMAL') },
    ],
    datos: movimientos,
    fechaStr,
    horaStr,
  })

  // ──────────────────────────────────────────────────────────────────────
  // PESTAÑA 11: 🏢 ACTIVOS FIJOS
  // ──────────────────────────────────────────────────────────────────────
  agregarHojaDatos(wb, {
    nombreHoja: H_ACT,
    tituloTabla: 'CONTROL DE ACTIVOS FIJOS Y DEPRECIACIÓN ACUMULADA',
    subtitulo: 'Gestión y Control — Propiedad, Planta y Equipo',
    columnas: [
      { header: 'Código', key: 'codigo', width: 14, align: 'center' },
      { header: 'Nombre del Activo', key: 'nombre', width: 32 },
      { header: 'Área Asignada', key: 'area', width: 20 },
      { header: 'Fecha Compra', key: 'fecha_compra', width: 14, align: 'center', transform: (v) => (v ? new Date(v).toLocaleDateString('es-CO') : '—') },
      { header: 'Costo Histórico', key: 'costo_historico', width: 18, type: 'currency', align: 'right', total: 'sum' },
      { header: 'Vida Útil (Años)', key: 'vida_util_anios', width: 16, type: 'number', align: 'center' },
      { header: 'Valor Residual', key: 'valor_residual', width: 18, type: 'currency', align: 'right', total: 'sum' },
      { header: 'Depr. Mensual', key: 'depreciacion_mensual', width: 18, type: 'currency', align: 'right' },
      { header: 'Depr. Acumulada', key: 'depreciacion_acumulada', width: 18, type: 'currency', align: 'right', total: 'sum' },
      { header: 'Valor en Libros', key: 'valor_en_libros', width: 18, type: 'currency', align: 'right', total: 'sum' },
      { header: 'Estado', key: 'estado', width: 14, align: 'center' },
    ],
    datos: activosCalculados,
    fechaStr,
    horaStr,
  })

  // ══════════════════════════════════════════════════════════════════════════
  // PESTAÑA 12: 🔍 PANEL DE CONSULTAS — BUSCARV Y BUSCARH
  // ══════════════════════════════════════════════════════════════════════════
  const wsQ = wb.addWorksheet(H_CONSULTAS, { views: [{ showGridLines: true, state: 'frozen', ySplit: 4 }] })

  // Anchos de columnas
  wsQ.columns = [
    { width: 3 },   // A: margen
    { width: 22 },  // B: etiqueta / cabecera tabla
    { width: 28 },  // C: valor de entrada / columna 1 tabla
    { width: 26 },  // D: resultado / columna 2 tabla
    { width: 26 },  // E: resultado / columna 3 tabla
    { width: 26 },  // F: resultado / columna 4 tabla
    { width: 26 },  // G: resultado / columna 5 tabla
    { width: 3 },   // H: margen
  ]

  // ── Fila 1: Banner principal ─────────────────────────────────────────────
  wsQ.getRow(1).height = 32
  safeMerge(wsQ, 1, 2, 1, 6)
  const qBanner = wsQ.getCell(1, 2)
  qBanner.value = 'AGROINSUMOS DEL HUILA S.A.S. — PANEL DE CONSULTAS ERP'
  qBanner.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FFFFFFFF' } }
  qBanner.fill = FILL_PRIMARY
  qBanner.alignment = { horizontal: 'center', vertical: 'middle' }
  addBackButton(wsQ, 1, 7, 7)

  // ── Fila 2: Subtítulo ────────────────────────────────────────────────────
  wsQ.getRow(2).height = 24
  safeMerge(wsQ, 2, 2, 2, 7)
  const qSub = wsQ.getCell(2, 2)
  qSub.value = '🔍 CONSULTAS CON BUSCARV Y BUSCARH — INGRESE EL CÓDIGO EN LA CELDA AMARILLA Y EXCEL DEVUELVE LOS DATOS AUTOMÁTICAMENTE'
  qSub.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
  qSub.fill = FILL_SECONDARY
  qSub.alignment = { horizontal: 'center', vertical: 'middle' }

  // ── Fila 3: Metadatos ────────────────────────────────────────────────────
  wsQ.getRow(3).height = 20
  safeMerge(wsQ, 3, 2, 3, 7)
  const qMeta = wsQ.getCell(3, 2)
  qMeta.value = `Generado: ${fechaStr} ${horaStr}   •   Las fórmulas BUSCARV/BUSCARH referencian las pestañas de datos dinámicamente`
  qMeta.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF555555' } }
  qMeta.fill = FILL_LIGHT
  qMeta.alignment = { horizontal: 'center', vertical: 'middle' }

  // ── Fila 4: Separador ────────────────────────────────────────────────────
  wsQ.getRow(4).height = 10

  // ════════════════════════════════════════════════════════════════════════
  // SECCIÓN 1: BUSCARV — Consulta de PRODUCTOS por Código
  // Las columnas de la hoja Productos son (desde fila 6 de datos):
  //   Col A=Código, B=Producto, C=Categoría, D=Unidad, E=Stock Actual,
  //   F=Stock Mínimo, G=Costo Unitario, H=Precio Venta, I=Valor Inventario, J=Alerta
  // ════════════════════════════════════════════════════════════════════════

  // En agregarHojaDatos: HR=5 (headers), datos en HR+1..HR+n => fila 6..5+n
  // La última fila real de datos es 5 + datos.length
  const prodLastRow = Math.max(5 + productos.length, 7)
  const cliLastRow  = Math.max(5 + clientes.length,  7)
  const thLastRow   = Math.max(5 + empleados.length,  7)

  // ── Fila 5: Título Sección BUSCARV Productos ─────────────────────────────
  wsQ.getRow(5).height = 26
  safeMerge(wsQ, 5, 2, 5, 7)
  const qT1 = wsQ.getCell(5, 2)
  qT1.value = '📦 SECCIÓN 1 — BUSCARV: Consultar Producto por Código'
  qT1.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
  qT1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } }
  qT1.alignment = { horizontal: 'left', vertical: 'middle' }

  // ── Fila 6: Instrucción y celda de búsqueda ──────────────────────────────
  wsQ.getRow(6).height = 28
  wsQ.getCell(6, 2).value = '🔎 Ingrese el Código del Producto:'
  wsQ.getCell(6, 2).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1B5E20' } }
  wsQ.getCell(6, 2).alignment = { vertical: 'middle' }
  wsQ.getCell(6, 2).fill = FILL_LIGHT
  wsQ.getCell(6, 2).border = BORDER_SOFT

  // Celda de entrada amarilla — el usuario escribe aquí el código
  const PROD_INPUT = 'C6'
  wsQ.getCell(6, 3).value = productos.length > 0 ? String(productos[0].codigo || '') : ''
  wsQ.getCell(6, 3).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1B5E20' } }
  wsQ.getCell(6, 3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }  // Amarillo vivo
  wsQ.getCell(6, 3).border = {
    top: { style: 'medium', color: { argb: 'FFFF6F00' } },
    bottom: { style: 'medium', color: { argb: 'FFFF6F00' } },
    left: { style: 'medium', color: { argb: 'FFFF6F00' } },
    right: { style: 'medium', color: { argb: 'FFFF6F00' } },
  }
  wsQ.getCell(6, 3).alignment = { horizontal: 'center', vertical: 'middle' }

  // Nota explicativa
  safeMerge(wsQ, 6, 4, 6, 7)
  wsQ.getCell(6, 4).value = '← Escribe aquí el código. Las celdas de abajo se actualizan automáticamente con BUSCARV'
  wsQ.getCell(6, 4).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF777777' } }
  wsQ.getCell(6, 4).alignment = { vertical: 'middle' }

  // ── Fila 7: Headers de resultados Productos ──────────────────────────────
  wsQ.getRow(7).height = 24
  const headsProd = ['Campo', 'Valor BUSCARV', 'Fórmula utilizada']
  ;[2, 3, 4].forEach((col, i) => {
    const c = wsQ.getCell(7, col)
    c.value = headsProd[i]
    c.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = FILL_PRIMARY
    c.alignment = { horizontal: 'center', vertical: 'middle' }
    c.border = BORDER_SOFT
  })
  // Merge columns 3-4 for value cell header, then formula column
  safeMerge(wsQ, 7, 3, 7, 4)
  safeMerge(wsQ, 7, 5, 7, 7)
  const cFormulaHead = wsQ.getCell(7, 5)
  cFormulaHead.value = 'Descripción de la fórmula'
  cFormulaHead.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } }
  cFormulaHead.fill = FILL_PRIMARY
  cFormulaHead.alignment = { horizontal: 'center', vertical: 'middle' }
  cFormulaHead.border = BORDER_SOFT

  // ── Filas 8–17: Resultados BUSCARV para cada campo de Producto ───────────
  const camposProd = [
    { label: 'Nombre del Producto', colNum: 2, colLetter: 'B', numFmt: null },
    { label: 'Categoría',           colNum: 3, colLetter: 'C', numFmt: null },
    { label: 'Unidad de Medida',    colNum: 4, colLetter: 'D', numFmt: null },
    { label: 'Stock Actual (uds)',  colNum: 5, colLetter: 'E', numFmt: '#,##0' },
    { label: 'Stock Mínimo (uds)',  colNum: 6, colLetter: 'F', numFmt: '#,##0' },
    { label: 'Costo Unitario',      colNum: 7, colLetter: 'G', numFmt: '"$"#,##0' },
    { label: 'Precio de Venta',     colNum: 8, colLetter: 'H', numFmt: '"$"#,##0' },
    { label: 'Valor Inventario',    colNum: 9, colLetter: 'I', numFmt: '"$"#,##0' },
    { label: 'Alerta Reposición',   colNum: 10, colLetter: 'J', numFmt: null },
  ]

  const prodRangeName = `'${H_PROD}'!A6:J${prodLastRow}`

  camposProd.forEach(({ label, colNum, numFmt }, idx) => {
    const r = 8 + idx
    wsQ.getRow(r).height = 22
    const even = idx % 2 === 1
    const bgArgb = even ? 'FFF6FAF4' : 'FFFFFFFF'

    // Columna B: nombre del campo
    wsQ.getCell(r, 2).value = label
    wsQ.getCell(r, 2).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF1B5E20' } }
    wsQ.getCell(r, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } }
    wsQ.getCell(r, 2).border = BORDER_SOFT
    wsQ.getCell(r, 2).alignment = { vertical: 'middle' }

    // Columnas C-D: resultado con fórmula BUSCARV
    safeMerge(wsQ, r, 3, r, 4)
    const cellVal = wsQ.getCell(r, 3)
    const formula = `VLOOKUP(${PROD_INPUT},${prodRangeName},${colNum},0)`
    cellVal.value = { formula }
    cellVal.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1B5E20' } }
    cellVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: even ? 'FFE8F5E9' : 'FFF4F9F2' } }
    cellVal.border = {
      top: { style: 'thin', color: { argb: 'FF2E7D32' } },
      bottom: { style: 'thin', color: { argb: 'FF2E7D32' } },
      left: { style: 'medium', color: { argb: 'FF2E7D32' } },
      right: { style: 'medium', color: { argb: 'FF2E7D32' } },
    }
    cellVal.alignment = { horizontal: 'center', vertical: 'middle' }
    if (numFmt) cellVal.numFmt = numFmt

    // Columnas E-G: descripción de la fórmula en texto
    safeMerge(wsQ, r, 5, r, 7)
    const cellDesc = wsQ.getCell(r, 5)
    cellDesc.value = `=BUSCARV(C6,'${H_PROD}'!A6:J${prodLastRow},${colNum},0)`
    cellDesc.font = { name: 'Courier New', size: 8.5, color: { argb: 'FF1565C0' } }
    cellDesc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F8FF' } }
    cellDesc.border = BORDER_SOFT
    cellDesc.alignment = { vertical: 'middle' }
  })

  // Fila 18: separador
  wsQ.getRow(18).height = 14

  // ════════════════════════════════════════════════════════════════════════
  // SECCIÓN 2: BUSCARV — Consulta de CLIENTE por Cédula / NIT
  // Columnas hoja Clientes: A=Cédula/NIT, B=Nombre, C=Apellidos, D=Teléfono,
  //   E=Correo, F=Dirección, G=Estado, H=Fecha Registro
  // ════════════════════════════════════════════════════════════════════════

  wsQ.getRow(19).height = 26
  safeMerge(wsQ, 19, 2, 19, 7)
  const qT2 = wsQ.getCell(19, 2)
  qT2.value = '👥 SECCIÓN 2 — BUSCARV: Consultar Cliente por Cédula / NIT'
  qT2.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
  qT2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } }
  qT2.alignment = { horizontal: 'left', vertical: 'middle' }

  // Celda de entrada clientes
  wsQ.getRow(20).height = 28
  wsQ.getCell(20, 2).value = '🔎 Ingrese Cédula / NIT del Cliente:'
  wsQ.getCell(20, 2).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1565C0' } }
  wsQ.getCell(20, 2).alignment = { vertical: 'middle' }
  wsQ.getCell(20, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } }
  wsQ.getCell(20, 2).border = BORDER_SOFT

  const CLI_INPUT = 'C20'
  wsQ.getCell(20, 3).value = clientes.length > 0 ? String(clientes[0].cedula || '') : ''
  wsQ.getCell(20, 3).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1565C0' } }
  wsQ.getCell(20, 3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }
  wsQ.getCell(20, 3).border = {
    top: { style: 'medium', color: { argb: 'FFFF6F00' } },
    bottom: { style: 'medium', color: { argb: 'FFFF6F00' } },
    left: { style: 'medium', color: { argb: 'FFFF6F00' } },
    right: { style: 'medium', color: { argb: 'FFFF6F00' } },
  }
  wsQ.getCell(20, 3).alignment = { horizontal: 'center', vertical: 'middle' }

  safeMerge(wsQ, 20, 4, 20, 7)
  wsQ.getCell(20, 4).value = '← Escribe aquí la cédula o NIT. BUSCARV localiza al cliente en la hoja de Clientes'
  wsQ.getCell(20, 4).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF777777' } }
  wsQ.getCell(20, 4).alignment = { vertical: 'middle' }

  // Headers resultados clientes
  wsQ.getRow(21).height = 24
  ;[2, 3, 5].forEach((col) => {
    const c = wsQ.getCell(21, col)
    c.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } }
    c.alignment = { horizontal: 'center', vertical: 'middle' }
    c.border = BORDER_SOFT
  })
  wsQ.getCell(21, 2).value = 'Campo'
  safeMerge(wsQ, 21, 3, 21, 4)
  wsQ.getCell(21, 3).value = 'Valor BUSCARV'
  wsQ.getCell(21, 3).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } }
  wsQ.getCell(21, 3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } }
  wsQ.getCell(21, 3).alignment = { horizontal: 'center', vertical: 'middle' }
  wsQ.getCell(21, 3).border = BORDER_SOFT
  safeMerge(wsQ, 21, 5, 21, 7)
  wsQ.getCell(21, 5).value = 'Descripción de la fórmula'
  wsQ.getCell(21, 5).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } }
  wsQ.getCell(21, 5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } }
  wsQ.getCell(21, 5).alignment = { horizontal: 'center', vertical: 'middle' }
  wsQ.getCell(21, 5).border = BORDER_SOFT

  // Filas resultados clientes
  const camposCli = [
    { label: 'Nombre',          colNum: 2, colLetter: 'B' },
    { label: 'Apellidos',       colNum: 3, colLetter: 'C' },
    { label: 'Teléfono',        colNum: 4, colLetter: 'D' },
    { label: 'Correo',          colNum: 5, colLetter: 'E' },
    { label: 'Dirección',       colNum: 6, colLetter: 'F' },
    { label: 'Estado',          colNum: 7, colLetter: 'G' },
    { label: 'Fecha Registro',  colNum: 8, colLetter: 'H' },
  ]
  const cliRangeName = `'${H_CLI}'!A6:H${cliLastRow}`

  camposCli.forEach(({ label, colNum }, idx) => {
    const r = 22 + idx
    wsQ.getRow(r).height = 22
    const even = idx % 2 === 1
    const bgArgb = even ? 'FFF6FAF4' : 'FFFFFFFF'

    wsQ.getCell(r, 2).value = label
    wsQ.getCell(r, 2).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF1565C0' } }
    wsQ.getCell(r, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } }
    wsQ.getCell(r, 2).border = BORDER_SOFT
    wsQ.getCell(r, 2).alignment = { vertical: 'middle' }

    safeMerge(wsQ, r, 3, r, 4)
    const cellVal = wsQ.getCell(r, 3)
    const formula = `VLOOKUP(${CLI_INPUT},${cliRangeName},${colNum},0)`
    cellVal.value = { formula }
    cellVal.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1565C0' } }
    cellVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: even ? 'FFE3F2FD' : 'FFBBDEFB' } }
    cellVal.border = {
      top: { style: 'thin', color: { argb: 'FF1565C0' } },
      bottom: { style: 'thin', color: { argb: 'FF1565C0' } },
      left: { style: 'medium', color: { argb: 'FF1565C0' } },
      right: { style: 'medium', color: { argb: 'FF1565C0' } },
    }
    cellVal.alignment = { horizontal: 'center', vertical: 'middle' }

    safeMerge(wsQ, r, 5, r, 7)
    const cellDesc = wsQ.getCell(r, 5)
    cellDesc.value = `=BUSCARV(C20,'${H_CLI}'!A6:H${cliLastRow},${colNum},0)`
    cellDesc.font = { name: 'Courier New', size: 8.5, color: { argb: 'FF1565C0' } }
    cellDesc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F8FF' } }
    cellDesc.border = BORDER_SOFT
    cellDesc.alignment = { vertical: 'middle' }
  })

  // Fila separadora
  wsQ.getRow(30).height = 14

  // ════════════════════════════════════════════════════════════════════════
  // SECCIÓN 3: BUSCARV — Consulta de EMPLEADO por Cédula
  // Columnas hoja Talento Humano: A=Cédula, B=Nombres, C=Apellidos, D=Cargo,
  //   E=Área, F=Estado, G=Tipo Contrato, H=Fecha Ingreso, I=Salario, J=EPS, K=Teléfono, L=Correo
  // ════════════════════════════════════════════════════════════════════════

  wsQ.getRow(31).height = 26
  safeMerge(wsQ, 31, 2, 31, 7)
  const qT3 = wsQ.getCell(31, 2)
  qT3.value = '👔 SECCIÓN 3 — BUSCARV: Consultar Empleado por Cédula'
  qT3.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
  qT3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A148C' } }
  qT3.alignment = { horizontal: 'left', vertical: 'middle' }

  wsQ.getRow(32).height = 28
  wsQ.getCell(32, 2).value = '🔎 Ingrese Cédula del Empleado:'
  wsQ.getCell(32, 2).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF4A148C' } }
  wsQ.getCell(32, 2).alignment = { vertical: 'middle' }
  wsQ.getCell(32, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E5F5' } }
  wsQ.getCell(32, 2).border = BORDER_SOFT

  const EMP_INPUT = 'C32'
  wsQ.getCell(32, 3).value = empleados.length > 0 ? String(empleados[0].cedula || '') : ''
  wsQ.getCell(32, 3).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF4A148C' } }
  wsQ.getCell(32, 3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }
  wsQ.getCell(32, 3).border = {
    top: { style: 'medium', color: { argb: 'FFFF6F00' } },
    bottom: { style: 'medium', color: { argb: 'FFFF6F00' } },
    left: { style: 'medium', color: { argb: 'FFFF6F00' } },
    right: { style: 'medium', color: { argb: 'FFFF6F00' } },
  }
  wsQ.getCell(32, 3).alignment = { horizontal: 'center', vertical: 'middle' }

  safeMerge(wsQ, 32, 4, 32, 7)
  wsQ.getCell(32, 4).value = '← Escribe la cédula. BUSCARV busca en la hoja Talento Humano'
  wsQ.getCell(32, 4).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF777777' } }
  wsQ.getCell(32, 4).alignment = { vertical: 'middle' }

  // Headers resultados empleados
  wsQ.getRow(33).height = 24
  wsQ.getCell(33, 2).value = 'Campo'
  wsQ.getCell(33, 2).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } }
  wsQ.getCell(33, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A148C' } }
  wsQ.getCell(33, 2).alignment = { horizontal: 'center', vertical: 'middle' }
  wsQ.getCell(33, 2).border = BORDER_SOFT
  safeMerge(wsQ, 33, 3, 33, 4)
  wsQ.getCell(33, 3).value = 'Valor BUSCARV'
  wsQ.getCell(33, 3).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } }
  wsQ.getCell(33, 3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A148C' } }
  wsQ.getCell(33, 3).alignment = { horizontal: 'center', vertical: 'middle' }
  wsQ.getCell(33, 3).border = BORDER_SOFT
  safeMerge(wsQ, 33, 5, 33, 7)
  wsQ.getCell(33, 5).value = 'Descripción de la fórmula'
  wsQ.getCell(33, 5).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } }
  wsQ.getCell(33, 5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A148C' } }
  wsQ.getCell(33, 5).alignment = { horizontal: 'center', vertical: 'middle' }
  wsQ.getCell(33, 5).border = BORDER_SOFT

  const camposEmp = [
    { label: 'Nombres',          colNum: 2 },
    { label: 'Apellidos',        colNum: 3 },
    { label: 'Cargo',            colNum: 4 },
    { label: 'Área',             colNum: 5 },
    { label: 'Estado',           colNum: 6 },
    { label: 'Tipo de Contrato', colNum: 7 },
    { label: 'Fecha Ingreso',    colNum: 8 },
    { label: 'Salario Base',     colNum: 9, numFmt: '"$"#,##0' },
    { label: 'EPS',              colNum: 10 },
    { label: 'Teléfono',         colNum: 11 },
    { label: 'Correo',           colNum: 12 },
  ]
  const thRangeName = `'${H_TH}'!A6:L${thLastRow}`

  camposEmp.forEach(({ label, colNum, numFmt }, idx) => {
    const r = 34 + idx
    wsQ.getRow(r).height = 22
    const even = idx % 2 === 1
    const bgArgb = even ? 'FFF6FAF4' : 'FFFFFFFF'

    wsQ.getCell(r, 2).value = label
    wsQ.getCell(r, 2).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF4A148C' } }
    wsQ.getCell(r, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } }
    wsQ.getCell(r, 2).border = BORDER_SOFT
    wsQ.getCell(r, 2).alignment = { vertical: 'middle' }

    safeMerge(wsQ, r, 3, r, 4)
    const cellVal = wsQ.getCell(r, 3)
    const formula = `VLOOKUP(${EMP_INPUT},${thRangeName},${colNum},0)`
    cellVal.value = { formula }
    cellVal.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF4A148C' } }
    cellVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: even ? 'FFF3E5F5' : 'FFECE0F5' } }
    cellVal.border = {
      top: { style: 'thin', color: { argb: 'FF4A148C' } },
      bottom: { style: 'thin', color: { argb: 'FF4A148C' } },
      left: { style: 'medium', color: { argb: 'FF4A148C' } },
      right: { style: 'medium', color: { argb: 'FF4A148C' } },
    }
    cellVal.alignment = { horizontal: 'center', vertical: 'middle' }
    if (numFmt) cellVal.numFmt = numFmt

    safeMerge(wsQ, r, 5, r, 7)
    const cellDesc = wsQ.getCell(r, 5)
    cellDesc.value = `=BUSCARV(C32,'${H_TH}'!A6:L${thLastRow},${colNum},0)`
    cellDesc.font = { name: 'Courier New', size: 8.5, color: { argb: 'FF4A148C' } }
    cellDesc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F3FF' } }
    cellDesc.border = BORDER_SOFT
    cellDesc.alignment = { vertical: 'middle' }
  })

  // Fila separadora
  wsQ.getRow(46).height = 18

  // ════════════════════════════════════════════════════════════════════════
  // SECCIÓN 4: BUSCARH — Tabla de Métricas Resumen por Categoría de Producto
  // BUSCARH busca en la PRIMERA FILA (cabecera horizontal) el nombre de
  // la categoría y devuelve el valor de la fila indicada.
  // ════════════════════════════════════════════════════════════════════════

  wsQ.getRow(47).height = 26
  safeMerge(wsQ, 47, 2, 47, 7)
  const qT4 = wsQ.getCell(47, 2)
  qT4.value = '📊 SECCIÓN 4 — BUSCARH: Métricas Resumen por Categoría de Producto'
  qT4.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
  qT4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF004D40' } }
  qT4.alignment = { horizontal: 'left', vertical: 'middle' }

  // Construir tabla de resumen por categoría (horizontal)
  const catMap = {}
  productos.forEach((p) => {
    const cat = String(p.categoria || 'Sin Categoría').trim()
    if (!catMap[cat]) catMap[cat] = { stock: 0, valor: 0, count: 0 }
    catMap[cat].stock += Number(p.stock_actual) || 0
    catMap[cat].valor += Number(p.valor_inventario) || ((p.costo_unitario || 0) * (p.stock_actual || 0))
    catMap[cat].count += 1
  })
  const categorias = Object.keys(catMap)

  // Tabla horizontal: fila 48 = cabeceras (categorías), filas 49-51 = métricas
  // Columnas: B=etiqueta fila, C...(C+n) = una por categoría
  wsQ.getRow(48).height = 24
  wsQ.getRow(49).height = 22
  wsQ.getRow(50).height = 22
  wsQ.getRow(51).height = 22

  // Columna B: título de la tabla y etiquetas de filas
  wsQ.getCell(48, 2).value = 'Indicador \ Categoría →'
  wsQ.getCell(48, 2).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } }
  wsQ.getCell(48, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF004D40' } }
  wsQ.getCell(48, 2).border = BORDER_SOFT
  wsQ.getCell(48, 2).alignment = { horizontal: 'center', vertical: 'middle' }

  const metricasLabels = [
    { row: 49, label: 'Cantidad de Productos',  key: 'count',  numFmt: '#,##0' },
    { row: 50, label: 'Stock Total (uds)',       key: 'stock',  numFmt: '#,##0' },
    { row: 51, label: 'Valor Inventario ($)',    key: 'valor',  numFmt: '"$"#,##0' },
  ]

  metricasLabels.forEach(({ row, label }) => {
    wsQ.getCell(row, 2).value = label
    wsQ.getCell(row, 2).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF004D40' } }
    wsQ.getCell(row, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2F1' } }
    wsQ.getCell(row, 2).border = BORDER_SOFT
    wsQ.getCell(row, 2).alignment = { vertical: 'middle' }
  })

  // Rellenar columnas de categorías (máximo 5 para que quepan en el ancho)
  const maxCats = Math.min(categorias.length, 5)
  categorias.slice(0, maxCats).forEach((cat, catIdx) => {
    const col = 3 + catIdx  // C, D, E, F, G
    const data = catMap[cat]

    // Fila 48: cabecera de categoría
    wsQ.getCell(48, col).value = cat
    wsQ.getCell(48, col).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } }
    wsQ.getCell(48, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00695C' } }
    wsQ.getCell(48, col).border = BORDER_SOFT
    wsQ.getCell(48, col).alignment = { horizontal: 'center', vertical: 'middle' }

    // Filas 49-51: métricas
    metricasLabels.forEach(({ row, key, numFmt }) => {
      wsQ.getCell(row, col).value = data[key]
      wsQ.getCell(row, col).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF00695C' } }
      wsQ.getCell(row, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: catIdx % 2 === 0 ? 'FFE0F2F1' : 'FFB2DFDB' } }
      wsQ.getCell(row, col).border = BORDER_SOFT
      wsQ.getCell(row, col).alignment = { horizontal: 'center', vertical: 'middle' }
      wsQ.getCell(row, col).numFmt = numFmt
    })
  })

  // ── Fila 53: ejemplo BUSCARH ─────────────────────────────────────────────
  wsQ.getRow(53).height = 24
  safeMerge(wsQ, 53, 2, 53, 7)
  const qExplain = wsQ.getCell(53, 2)
  qExplain.value = '💡 Ejemplo de BUSCARH: La celda C55 usa BUSCARH para buscar la primera categoría en la fila de cabecera (fila 48) y devolver el Stock Total de esa categoría'
  qExplain.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF004D40' } }
  qExplain.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2F1' } }
  qExplain.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
  qExplain.border = BORDER_SOFT

  // ── Fila 54: celda de búsqueda BUSCARH ──────────────────────────────────
  wsQ.getRow(54).height = 26
  wsQ.getCell(54, 2).value = '🔎 Categoría a buscar (BUSCARH):'
  wsQ.getCell(54, 2).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF004D40' } }
  wsQ.getCell(54, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2F1' } }
  wsQ.getCell(54, 2).border = BORDER_SOFT
  wsQ.getCell(54, 2).alignment = { vertical: 'middle' }

  // Celda amarilla de entrada BUSCARH
  const BUSCARH_INPUT = 'C54'
  wsQ.getCell(54, 3).value = categorias.length > 0 ? categorias[0] : ''
  wsQ.getCell(54, 3).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF004D40' } }
  wsQ.getCell(54, 3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }
  wsQ.getCell(54, 3).border = {
    top: { style: 'medium', color: { argb: 'FFFF6F00' } },
    bottom: { style: 'medium', color: { argb: 'FFFF6F00' } },
    left: { style: 'medium', color: { argb: 'FFFF6F00' } },
    right: { style: 'medium', color: { argb: 'FFFF6F00' } },
  }
  wsQ.getCell(54, 3).alignment = { horizontal: 'center', vertical: 'middle' }

  // ── Filas 55-57: Resultados BUSCARH ─────────────────────────────────────
  // La tabla de categorías está en C48:G51
  // Fila 1 de cabecera = fila 48, fila 2 = count (fila 49), fila 3 = stock (fila 50), fila 4 = valor (fila 51)
  const catTableRange = `C48:${getColumnLetter(2 + maxCats)}51`

  const buscarHResultados = [
    { row: 55, label: 'Cant. de Productos (BUSCARH fila 2)', rowIdx: 2, numFmt: '#,##0' },
    { row: 56, label: 'Stock Total uds (BUSCARH fila 3)',    rowIdx: 3, numFmt: '#,##0' },
    { row: 57, label: 'Valor Inventario $ (BUSCARH fila 4)', rowIdx: 4, numFmt: '"$"#,##0' },
  ]

  buscarHResultados.forEach(({ row, label, rowIdx, numFmt }, idx) => {
    wsQ.getRow(row).height = 22
    const even = idx % 2 === 1

    wsQ.getCell(row, 2).value = label
    wsQ.getCell(row, 2).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF004D40' } }
    wsQ.getCell(row, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: even ? 'FFB2DFDB' : 'FFE0F2F1' } }
    wsQ.getCell(row, 2).border = BORDER_SOFT
    wsQ.getCell(row, 2).alignment = { vertical: 'middle' }

    // Valor con fórmula BUSCARH
    safeMerge(wsQ, row, 3, row, 4)
    const cellH = wsQ.getCell(row, 3)
    const hFormula = `HLOOKUP(${BUSCARH_INPUT},${catTableRange},${rowIdx},0)`
    cellH.value = { formula: hFormula }
    cellH.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF004D40' } }
    cellH.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: even ? 'FFCCF7F0' : 'FFB2DFDB' } }
    cellH.border = {
      top: { style: 'thin', color: { argb: 'FF004D40' } },
      bottom: { style: 'thin', color: { argb: 'FF004D40' } },
      left: { style: 'medium', color: { argb: 'FF004D40' } },
      right: { style: 'medium', color: { argb: 'FF004D40' } },
    }
    cellH.alignment = { horizontal: 'center', vertical: 'middle' }
    cellH.numFmt = numFmt

    // Descripción de la fórmula
    safeMerge(wsQ, row, 5, row, 7)
    const cellDescH = wsQ.getCell(row, 5)
    cellDescH.value = `=BUSCARH(C54,${catTableRange},${rowIdx},0)`
    cellDescH.font = { name: 'Courier New', size: 8.5, color: { argb: 'FF004D40' } }
    cellDescH.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FBF8' } }
    cellDescH.border = BORDER_SOFT
    cellDescH.alignment = { vertical: 'middle' }
  })

  // ── Fila 59: Nota final ──────────────────────────────────────────────────
  wsQ.getRow(59).height = 20
  safeMerge(wsQ, 59, 2, 59, 7)
  const qNota = wsQ.getCell(59, 2)
  qNota.value =
    '✅ Instrucciones: Modifica el valor de las celdas AMARILLAS para buscar otro código, cédula o categoría. Las fórmulas BUSCARV y BUSCARH actualizan todos los resultados automáticamente en tiempo real.'
  qNota.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF1B5E20' } }
  qNota.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } }
  qNota.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  qNota.border = BORDER_SOFT

  await descargarWorkbook(wb, 'AgroInsumos_LIBRO_MAESTRO_ERP')
  return true
}

// ── Exportación individual (desde el botón del header) ──────────────────
export async function exportarExcelDesdeCache(opts) {
  return exportarLibroMaestroCompletoERP()
}

async function descargarWorkbook(wb, baseName) {
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${baseName.replace(/[^a-zA-Z0-9_\-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}
