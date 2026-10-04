/**
 * Genera el diseño HTML del correo para la orden de compra
 */
export function generarHtmlCorreoOrdenCompra(proveedor, lineasProv, documento) {
  const fechaHoy = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const subtotal = lineasProv.reduce((s, l) => s + l.subtotal, 0)

  const filasProductos = lineasProv
    .map(
      (l, i) => `
    <tr style="${i % 2 === 0 ? 'background-color: #f8fafc;' : 'background-color: #ffffff;'}">
      <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 14px;">${l.producto_nombre}</td>
      <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 14px; text-align: center;">${l.cantidad}</td>
      <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 14px; text-align: right;">$${Number(l.costo_unitario).toLocaleString('es-CO')}</td>
      <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px; text-align: right; font-weight: 600;">$${Number(l.subtotal).toLocaleString('es-CO')}</td>
    </tr>
  `
    )
    .join('')

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="650" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header con gradiente -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f766e 0%, #14b8a6 50%, #2dd4bf 100%); padding: 40px 40px 32px 40px; text-align: center;">
              <div style="background: rgba(255,255,255,0.2); display: inline-block; padding: 12px 16px; border-radius: 12px; margin-bottom: 16px;">
                <span style="font-size: 28px;">📋</span>
              </div>
              <h1 style="color: #ffffff; font-size: 26px; margin: 0 0 6px 0; font-weight: 700; letter-spacing: -0.5px;">Orden de Compra</h1>
              <p style="color: rgba(255,255,255,0.85); font-size: 15px; margin: 0; font-weight: 400;">${documento}</p>
            </td>
          </tr>

          <!-- Saludo -->
          <tr>
            <td style="padding: 32px 40px 0 40px;">
              <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0;">
                Estimado(a) proveedor,
              </p>
              <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 12px 0 0 0;">
                Le informamos que hemos generado una nueva orden de compra con los siguientes detalles:
              </p>
            </td>
          </tr>

          <!-- Info del proveedor -->
          <tr>
            <td style="padding: 24px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f0fdfa 0%, #f0f9ff 100%); border-radius: 12px; border: 1px solid #ccfbf1;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%" style="vertical-align: top;">
                          <p style="color: #0f766e; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin: 0 0 6px 0;">Proveedor</p>
                          <p style="color: #134e4a; font-size: 16px; font-weight: 600; margin: 0;">${proveedor.nombre}</p>
                        </td>
                        <td width="25%" style="vertical-align: top;">
                          <p style="color: #0f766e; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin: 0 0 6px 0;">NIT</p>
                          <p style="color: #134e4a; font-size: 16px; font-weight: 600; margin: 0;">${proveedor.nit || '—'}</p>
                        </td>
                        <td width="25%" style="vertical-align: top; text-align: right;">
                          <p style="color: #0f766e; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin: 0 0 6px 0;">Fecha</p>
                          <p style="color: #134e4a; font-size: 14px; font-weight: 600; margin: 0;">${fechaHoy}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Tabla de productos -->
          <tr>
            <td style="padding: 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
                <thead>
                  <tr>
                    <th style="background-color: #0f766e; color: #ffffff; padding: 14px 18px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Producto</th>
                    <th style="background-color: #0f766e; color: #ffffff; padding: 14px 18px; text-align: center; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Cantidad</th>
                    <th style="background-color: #0f766e; color: #ffffff; padding: 14px 18px; text-align: right; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Costo Unit.</th>
                    <th style="background-color: #0f766e; color: #ffffff; padding: 14px 18px; text-align: right; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${filasProductos}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Totales -->
          <tr>
            <td style="padding: 20px 40px 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>&nbsp;</td>
                  <td width="280" style="text-align: right;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius: 12px; overflow: hidden;">
                      <tr style="background-color: #f8fafc;">
                        <td style="padding: 12px 18px; color: #64748b; font-size: 14px;">Subtotal</td>
                        <td style="padding: 12px 18px; color: #334155; font-size: 14px; text-align: right; font-weight: 600;">$${subtotal.toLocaleString('es-CO')}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="border-top: 2px solid #0f766e;"></td>
                      </tr>
                      <tr style="background: linear-gradient(135deg, #0f766e, #14b8a6);">
                        <td style="padding: 16px 18px; color: #ffffff; font-size: 16px; font-weight: 700; border-radius: 0 0 0 12px;">TOTAL</td>
                        <td style="padding: 16px 18px; color: #ffffff; font-size: 18px; text-align: right; font-weight: 700; border-radius: 0 0 12px 0;">$${subtotal.toLocaleString('es-CO')}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Mensaje de cierre -->
          <tr>
            <td style="padding: 32px 40px 16px 40px;">
              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0;">
                Agradecemos su pronta confirmación y envío de los productos solicitados.
              </p>
              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 12px 0 0 0;">
                Cordialmente,<br>
                <strong style="color: #0f766e;">AgroInsumos</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                Este correo fue generado automáticamente por el sistema de gestión de <strong>AgroInsumos</strong>.
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin: 6px 0 0 0;">
                Por favor no responda a este mensaje.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Envía un correo a través del API de emails
 */
// En desarrollo se usa el proxy de Vite '/api/email/send' para evitar bloqueos de CORS del navegador.
// Si se define VITE_EMAIL_API_URL en .env o estamos fuera de dev, se usa esa URL o la de Render directamente.
const EMAIL_API_URL = import.meta.env.VITE_EMAIL_API_URL || '/api/email/send'

/**
 * Envía un correo a través del API de emails
 */
export async function sendEmail({ destinatarios, asunto, html }) {
  let res
  try {
    res = await fetch(EMAIL_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destinatarios,
        asunto,
        html,
      }),
    })
  } catch {
    // Si falla el proxy local, intentar directo a Render como respaldo
    res = await fetch('https://emailservice-i0wa.onrender.com/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destinatarios,
        asunto,
        html,
      }),
    })
  }

  const responseText = await res.text()

  if (!res.ok) {
    throw new Error(`Error en servicio de correo (${res.status}): ${responseText}`)
  }

  return responseText
}

/**
 * Agrupa los ítems de la orden por proveedor y envía los correos correspondientes
 * utilizando la información ya existente en memoria (sin consultar la BD de nuevo).
 */
export async function enviarCorreosOrdenCompra({ documento, lineas, proveedores }) {
  // Agrupar líneas por proveedor_id
  const porProveedor = {}
  for (const l of lineas) {
    if (!porProveedor[l.proveedor_id]) {
      porProveedor[l.proveedor_id] = []
    }
    porProveedor[l.proveedor_id].push(l)
  }

  const promesasCorreo = []

  for (const [provId, lineasProv] of Object.entries(porProveedor)) {
    // Comparar como strings para soportar tanto UUIDs como números
    const prov = proveedores.find((p) => String(p.id) === String(provId))

    if (!prov || !prov.correo || !prov.correo.trim()) continue

    const html = generarHtmlCorreoOrdenCompra(prov, lineasProv, documento)

    promesasCorreo.push(
      sendEmail({
        destinatarios: [prov.correo.trim()],
        asunto: `Orden de Compra ${documento} — AgroInsumos`,
        html,
      })
    )
  }

  if (promesasCorreo.length === 0) return 0

  const resultados = await Promise.allSettled(promesasCorreo)
  return resultados.filter((r) => r.status === 'fulfilled').length
}

