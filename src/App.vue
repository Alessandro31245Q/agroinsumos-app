<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { user, perfil, cerrarSesion, esAdmin } from './lib/auth'
import { supabase } from './lib/supabase'
import { erpCache, guardarEnCache } from './lib/erpDataCache'
import { exportarLibroMaestroCompletoERP } from './lib/excelService'

const isAdmin = computed(() => esAdmin())

const drawer = ref(true)
const opened = ref(['Gestion y Control', 'Talento Humano', 'Administracion'])
const route = useRoute()
const router = useRouter()
const exportandoMaestro = ref(false)
const snackbarGlobal = ref({ show: false, text: '', color: 'success' })

async function exportarTodoElERP() {
  exportandoMaestro.value = true
  try {
    // Si algún módulo aún no está en caché, lo precargamos para que el libro quede completo
    if (!erpCache.clientes || erpCache.clientes.length === 0) {
      const { data } = await supabase.from('clientes').select('*').order('nombre')
      if (data) guardarEnCache('clientes', data)
    }
    if (!erpCache.productos || erpCache.productos.length === 0) {
      const { data } = await supabase.from('productos_con_valor').select('*').order('nombre')
      if (data) guardarEnCache('productos', data)
    }
    if (!erpCache.facturas || erpCache.facturas.length === 0) {
      const { data } = await supabase.from('facturas_items').select(`
        id, cantidad, precio_unitario, subtotal,
        productos ( nombre ),
        facturas ( documento, fecha, created_at, clientes ( nombre, apellidos, cedula ) )
      `)
      if (data) {
        const mapeados = data.map(it => {
          const cli = it.facturas?.clientes
          return {
            id: it.id,
            documento: it.facturas?.documento || '—',
            fecha: it.facturas?.fecha,
            created_at: it.facturas?.created_at,
            cliente_nombre: cli ? `${cli.nombre || ''} ${cli.apellidos || ''}`.trim() || cli.cedula : 'Cliente General',
            producto_nombre: it.productos?.nombre || 'Producto',
            cantidad: it.cantidad,
            precio_unitario: it.precio_unitario,
            subtotal: it.subtotal || (it.cantidad * it.precio_unitario),
          }
        })
        guardarEnCache('facturas', mapeados)
      }
    }
    if (!erpCache.movimientos || erpCache.movimientos.length === 0) {
      const { data } = await supabase.from('inventario_movimientos').select('*, productos(nombre, stock_minimo)').order('fecha', { ascending: false })
      if (data) guardarEnCache('movimientos', data)
    }
    if (!erpCache.proveedores || erpCache.proveedores.length === 0) {
      const { data } = await supabase.from('proveedores').select('*').order('nombre')
      if (data) guardarEnCache('proveedores', data)
    }
    if (!erpCache.empleados || erpCache.empleados.length === 0) {
      const { data } = await supabase.from('empleados').select('*').order('nombres')
      if (data) guardarEnCache('empleados', data)
    }
    if (!erpCache.activos_fijos || erpCache.activos_fijos.length === 0) {
      const { data } = await supabase.from('activos_fijos').select('*').order('created_at', { ascending: false })
      if (data) guardarEnCache('activos_fijos', data)
    }

    await exportarLibroMaestroCompletoERP()
    snackbarGlobal.value = {
      show: true,
      text: '¡Libro Maestro Completo de AgroInsumos exportado con éxito!',
      color: 'success'
    }
  } catch (err) {
    console.error('Error al exportar todo el ERP:', err)
    snackbarGlobal.value = {
      show: true,
      text: 'Error al exportar: ' + err.message,
      color: 'error'
    }
  } finally {
    exportandoMaestro.value = false
  }
}

const items = [
  { title: 'Productos', icon: 'mdi-package-variant', to: '/productos' },
  { title: 'Inventario', icon: 'mdi-clipboard-list-outline', to: '/inventario' },
  { title: 'Facturas de Venta', icon: 'mdi-receipt-text-outline', to: '/facturas' },
  { title: 'Clientes', icon: 'mdi-account-group-outline', to: '/clientes' },
  { title: 'Proveedores', icon: 'mdi-truck-delivery-outline', to: '/proveedores' },
  { title: 'Activos Fijos', icon: 'mdi-desk', to: '/activos-fijos' },
  { title: 'Órdenes de Compra', icon: 'mdi-cart-outline', to: '/ordenes-compra' },
]

const nombreUsuario = computed(() => {
  return perfil.value?.nombre || user.value?.email?.split('@')[0] || 'Usuario'
})

const iniciales = computed(() => {
  const nom = nombreUsuario.value.trim()
  const partes = nom.split(' ')
  if (partes.length >= 2) {
    return (partes[0][0] + partes[1][0]).toUpperCase()
  }
  return nom.slice(0, 2).toUpperCase()
})

const rolUsuario = computed(() => {
  return perfil.value?.rol || 'usuario'
})

const mostrarLayoutERP = computed(() => {
  const esRutaPublica = route.meta?.publica || route.path === '/' || route.path === '/login'
  return Boolean(user.value && !esRutaPublica)
})

async function handleLogout() {
  await cerrarSesion()
  router.push('/login')
}
</script>

<template>
  <v-app>
    <template v-if="mostrarLayoutERP">
      <v-app-bar color="primary" density="comfortable" elevation="2">
        <v-app-bar-nav-icon @click="drawer = !drawer" />
        <v-toolbar-title class="font-weight-bold cursor-pointer" @click="$router.push('/erp')">
          <div class="d-flex align-center">
            <v-icon icon="mdi-sprout" class="mr-2" />
            <span>Agroinsumos del Huila</span>
          </div>
        </v-toolbar-title>

        <v-spacer />

        <!-- Botón Global para Exportar Todo el ERP en un solo archivo -->
        <v-btn
          variant="flat"
          color="green-darken-3"
          size="small"
          prepend-icon="mdi-microsoft-excel"
          class="text-none font-weight-bold mr-2 text-white shadow-sm"
          :loading="exportandoMaestro"
          @click="exportarTodoElERP"
        >
          Exportar Todo el ERP
          <v-tooltip activator="parent" location="bottom">
            Descargar Libro Maestro Completo (Clientes, Productos, Ventas, Inventario en 1 archivo)
          </v-tooltip>
        </v-btn>

        <!-- Menú de Usuario en Barra Superior -->
        <v-menu min-width="240px" rounded="xl" location="bottom end">
          <template #activator="{ props }">
            <v-btn icon v-bind="props" class="ml-1">
              <v-avatar color="white" size="34">
                <span class="text-caption font-weight-bold text-primary">{{ iniciales }}</span>
              </v-avatar>
            </v-btn>
          </template>

          <v-card class="rounded-xl border pa-1 elevation-4">
            <v-card-text class="pa-3">
              <div class="d-flex align-center mb-2">
                <v-avatar color="primary" size="40" class="mr-3">
                  <span class="text-subtitle-2 font-weight-bold text-white">{{ iniciales }}</span>
                </v-avatar>
                <div class="overflow-hidden">
                  <div class="font-weight-bold text-body-2 text-truncate">
                    {{ nombreUsuario }}
                  </div>
                  <div class="text-caption text-medium-emphasis text-truncate">
                    {{ user?.email }}
                  </div>
                </div>
              </div>

              <v-chip
                :color="rolUsuario === 'admin' ? 'primary' : 'teal'"
                size="x-small"
                variant="flat"
                class="font-weight-bold text-uppercase mt-1"
              >
                <v-icon start size="12">
                  {{ rolUsuario === 'admin' ? 'mdi-shield-crown' : 'mdi-account' }}
                </v-icon>
                {{ rolUsuario }}
              </v-chip>
            </v-card-text>

            <v-divider />

            <v-list density="compact" nav class="py-1">
              <v-list-item
                to="/perfil"
                prepend-icon="mdi-account-circle-outline"
                title="Mi Perfil"
              />
              <v-list-item
                v-if="isAdmin"
                to="/usuarios"
                prepend-icon="mdi-account-cog-outline"
                title="Gestión de Usuarios"
              />
            </v-list>

            <v-divider />

            <v-list density="compact" nav class="py-1">
              <v-list-item
                prepend-icon="mdi-logout"
                title="Cerrar Sesión"
                color="error"
                class="text-error"
                @click="handleLogout"
              />
            </v-list>
          </v-card>
        </v-menu>
      </v-app-bar>

      <v-navigation-drawer v-model="drawer">
        <v-list density="compact" nav v-model:opened="opened">
          <!-- Acceso Principal Inicio ERP -->
          <v-list-item
            to="/erp"
            prepend-icon="mdi-view-dashboard-outline"
            title="Inicio"
            class="font-weight-bold mb-1"
          />

          <!-- Menú Gestión y Control -->
          <v-list-group value="Gestion y Control">
            <template #activator="{ props }">
              <v-list-item
                v-bind="props"
                prepend-icon="mdi-tune"
                title="Gestión y Control"
                class="font-weight-bold"
              />
            </template>

            <v-list-item
              v-for="item in items"
              :key="item.title"
              :to="item.to"
              :prepend-icon="item.icon"
              :title="item.title"
            />
          </v-list-group>

          <!-- Menú Talento Humano -->
          <v-list-group value="Talento Humano">
            <template #activator="{ props }">
              <v-list-item
                v-bind="props"
                prepend-icon="mdi-account-group-outline"
                title="Talento Humano"
                class="font-weight-bold"
              />
            </template>

            <v-list-item
              to="/empleados"
              prepend-icon="mdi-badge-account-horizontal-outline"
              title="Empleados"
            />
            <v-list-item
              to="/organigrama"
              prepend-icon="mdi-sitemap"
              title="Organigrama"
            />
          </v-list-group>

        </v-list>

        <!-- Pie de menú lateral con usuario actual -->
        <template #append>
          <div class="pa-3 border-t">
            <v-list-item
              to="/perfil"
              class="rounded-lg pa-2"
              lines="two"
            >
              <template #prepend>
                <v-avatar color="primary" size="36">
                  <span class="text-caption font-weight-bold text-white">{{ iniciales }}</span>
                </v-avatar>
              </template>
              <v-list-item-title class="font-weight-bold text-caption text-truncate">
                {{ nombreUsuario }}
              </v-list-item-title>
              <v-list-item-subtitle class="text-caption text-truncate">
                {{ user?.email }}
              </v-list-item-subtitle>
            </v-list-item>
          </div>
        </template>
      </v-navigation-drawer>
    </template>

    <v-main>
      <router-view />
    </v-main>

    <v-snackbar v-model="snackbarGlobal.show" :color="snackbarGlobal.color" :timeout="3500" location="bottom end">
      {{ snackbarGlobal.text }}
    </v-snackbar>
  </v-app>
</template>

<style scoped>
.border {
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
}
.border-t {
  border-top: 1px solid rgba(0, 0, 0, 0.08) !important;
}
</style>

