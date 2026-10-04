import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import ProductosView from '../views/ProductosView.vue'
import InventarioView from '../views/InventarioView.vue'
import ProveedoresView from '../views/ProveedoresView.vue'
import ActivosFijosView from '../views/ActivosFijosView.vue'
import OrdenesCompraView from '../views/OrdenesCompraView.vue'
import EmpleadosView from '../views/EmpleadosView.vue'
import EmpleadoDetalleView from '../views/EmpleadoDetalleView.vue'
import EmpleadoFormView from '../views/EmpleadoFormView.vue'
import OrganigramaView from '../views/OrganigramaView.vue'
import HomeView from '../views/HomeView.vue'
import UsuariosView from '../views/UsuariosView.vue'
import PerfilView from '../views/PerfilView.vue'
import TiendaView from '../views/TiendaView.vue'
import FacturasView from '../views/FacturasView.vue'
import ClientesView from '../views/ClientesView.vue'
import { user, cargandoAuth, esAdmin } from '../lib/auth'

const routes = [
  { path: '/', name: 'tienda', component: TiendaView, meta: { publica: true } },
  { path: '/erp', name: 'home', component: HomeView },
  { path: '/login', name: 'login', component: LoginView, meta: { publica: true } },
  { path: '/productos', name: 'productos', component: ProductosView },
  { path: '/inventario', name: 'inventario', component: InventarioView },
  { path: '/clientes', name: 'clientes', component: ClientesView },
  { path: '/proveedores', name: 'proveedores', component: ProveedoresView },
  { path: '/activos-fijos', name: 'activos-fijos', component: ActivosFijosView },
  { path: '/ordenes-compra', name: 'ordenes-compra', component: OrdenesCompraView },
  { path: '/facturas', name: 'facturas', component: FacturasView },
  { path: '/empleados', name: 'empleados', component: EmpleadosView },
  { path: '/empleados/nuevo', name: 'empleado-nuevo', component: EmpleadoFormView },
  { path: '/empleados/:id', name: 'empleado-detalle', component: EmpleadoDetalleView },
  { path: '/empleados/:id/editar', name: 'empleado-editar', component: EmpleadoFormView },
  { path: '/organigrama', name: 'organigrama', component: OrganigramaView },
  { path: '/usuarios', name: 'usuarios', component: UsuariosView, meta: { soloAdmin: true } },
  { path: '/perfil', name: 'perfil', component: PerfilView },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Espera a que termine de cargar la sesión antes de decidir si deja pasar
function esperarAuthListo() {
  return new Promise((resolve) => {
    if (!cargandoAuth.value) return resolve()
    const detener = setInterval(() => {
      if (!cargandoAuth.value) {
        clearInterval(detener)
        resolve()
      }
    }, 50)
  })
}

router.beforeEach(async (to) => {
  await esperarAuthListo()

  if (!to.meta.publica && !user.value) return { name: 'login' }
  if (to.name === 'login' && user.value) return { name: 'home' }

  // Rutas solo para administradores
  if (to.meta.soloAdmin && !esAdmin()) return { name: 'home' }

  return true
})
