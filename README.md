# Gestión Agroinsumos del Huila

Vue 3 + Vuetify + Supabase (reemplazo de la app de Power Apps / Excel).

## 1. Instalar dependencias

```bash
npm install
```

## 2. Configurar las variables de entorno

```bash
cp .env.example .env
```

Abre `.env` y completa con los datos de tu proyecto de Supabase:
- Ve a tu proyecto en supabase.com -> Project Settings -> API
- VITE_SUPABASE_URL = el "Project URL"
- VITE_SUPABASE_ANON_KEY = la "anon public" key

El archivo `.env` nunca se sube a Git (ya esta en .gitignore), asi que cada
persona que clone el proyecto debe crear el suyo propio con sus propias claves.

## 3. Correr en desarrollo

```bash
npm run dev
```

Abre la URL que te muestre en consola (normalmente http://localhost:5173).

## 4. Subir a Git

Si es la primera vez:

```bash
git init
git add .
git commit -m "Proyecto inicial: Productos e Inventario con Supabase"
git branch -M main
git remote add origin TU-URL-DE-GITHUB
git push -u origin main
```

Si ya tienes el repo creado y clonado, simplemente:

```bash
git add .
git commit -m "Descripcion de lo que cambiaste"
git push
```

## Estructura del proyecto

```
src/
  lib/supabase.js       -> conexion a Supabase
  router/index.js       -> rutas de la app
  views/
    ProductosView.vue   -> CRUD de productos
    InventarioView.vue  -> consulta de movimientos (solo lectura)
  App.vue               -> layout (menu lateral + barra superior)
  main.js                -> arranque de la app (Vuetify + router)
```

## Que falta por construir (proximos pasos)

- [ ] Pantalla de Proveedores
- [ ] Pantalla de Clientes
- [ ] Pantalla de Orden de Compra (con envio de correo por proveedor)
- [ ] Pantalla de Factura (con validacion de stock)
- [ ] Autenticacion (login de usuarios)
