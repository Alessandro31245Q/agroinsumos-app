# Agroinsumos del Huila S.A.S. — Sistema Integral ERP

Sistema integral de gestión administrativa, comercial, inventario, talento humano y control corporativo desarrollado en **Vue 3**, **Vuetify 3**, **Vite** y **Supabase**.

---

## 🚀 Módulos Implementados

- **🏢 Identidad Corporativa & MVH**: Información institucional, Misión, Visión 2030, trayectoria e historia con línea de tiempo.
- **👥 Clientes**: Directorio de clientes, estado de cartera, contactos y direcciones.
- **🤝 Proveedores**: Directorio de aliados comerciales, contactos y gestión.
- **📦 Productos e Inventario**: Catálogo valorizado con costos, precios de venta, stock mínimo y alertas automáticas de reabastecimiento.
- **🔄 Kardex de Movimientos**: Registro de entradas, salidas, transferencias y control de existencias en tiempo real.
- **🧾 Facturación de Venta (FV)**: Generación de facturas con validación de existencias y cálculo automático de subtotales.
- **🛒 Órdenes de Compra**: Gestión de compras y pedidos a proveedores con notificación por correo.
- **🏢 Activos Fijos**: Control de propiedad, planta y equipo con cálculo de vida útil, depreciación mensual, acumulada y valor en libros.
- **👔 Talento Humano (Hojas de Vida)**: Directorio de colaboradores con cargos, salarios, EPS y datos contractuales.
- **🌳 Organigrama Jerárquico**: Árbol organizacional dinámico basado en líneas de reporte reales (`jefe_id`) y niveles de jerarquía.
- **📊 Libro Maestro en Excel**: Exportación unificada multi-hoja con portada interactiva, logo institucional, hipervínculos de navegación interna, botón de retorno y filtros nativos.
- **🔒 Seguridad y Usuarios**: Autenticación con Supabase Auth, roles (Admin / Usuario) y auditoría.

---

## 🛠️ Instalación y Ejecución Local

### 1. Clonar e instalar dependencias

```bash
git clone <URL_DEL_REPOSITORIO>
cd agroinsumos-app
npm install
```

### 2. Configurar variables de entorno

Copia el archivo de plantilla:

```bash
cp .env.example .env
```

Configura en `.env`:
- `VITE_SUPABASE_URL` = URL de tu proyecto de Supabase
- `VITE_SUPABASE_ANON_KEY` = Clave pública anónima de Supabase
- `VITE_USER_SERVICE_URL` = URL del microservicio de usuarios

### 3. Iniciar servidor de desarrollo

```bash
npm run dev
```

La aplicación se ejecutará en: `http://localhost:5173`.

---

## ☁️ Despliegue en Producción

El proyecto está optimizado para desplegarse con 1 solo clic en **Vercel** o **Netlify**:
- `vercel.json` incluido para redirección de rutas SPA y proxy de microservicios.
- `public/_redirects` incluido para compatibilidad con Netlify y Cloudflare Pages.
