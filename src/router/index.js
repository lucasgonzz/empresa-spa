import Vue from 'vue'
import VueRouter from 'vue-router'
import store from '@/store'

Vue.use(VueRouter)

const routes = [
    {
        path: '/',
        name: 'root',
        redirect: { name: 'login' },
    },
    {
        path: '/login',
        name: 'login',
        component: () => import('@/common-vue/views/Login')
    },
    {
        path: '/recuperar-clave/:view?/:sub_view?',
        name: 'passwordReset', 
        component: () => import('@/common-vue/views/PasswordReset')
    },
    {
        path: '/configuracion/:view?/:sub_view?',
        name: 'configuration',
        component: () => import('@/common-vue/views/Configuration')
    },
    {
        path: '/abm/:view?/:sub_view?',
        name: 'abm',
        component: () => import('@/common-vue/views/Abm')
    },
    {
        path: '/empleados',
        name: 'employee',
        component: () => import('@/common-vue/views/Employee')
    },
    {
        path: '/alertas/:view?',
        name: 'alertas',
        component: () => import('@/views/Alertas')
    },
    {
        path: '/vender/:view?',
        name: 'vender',
        component: () => import('@/views/Vender')
    },
    {
        path: '/gastos',
        name: 'expense',
        component: () => import('@/views/Expense')
    },
    {
        path: '/reportes/:view?/:sub_view?/:sub_sub_view?',
        name: 'reportes',
        component: () => import('@/views/Reportes')
    },
    {
        path: '/panel-de-control/:view?/:sub_view?',
        name: 'panel',
        component: () => import('@/views/PanelDeControl')
    },
    {
        path: '/listado-de-articulos/:view?',
        name: 'article',
        component: () => import('@/views/Listado')
    },
    {
        path: '/deposito-para-checkear/:view',
        name: 'deposito-para-checkear',
        component: () => import('@/views/DepositoParaCheckear')
    },
    {
        path: '/deposito-checkeadas',
        name: 'deposito-checkeadas',
        component: () => import('@/views/DepositoCheckeadas')
    },
    {
        path: '/por-entregar/:view',
        name: 'por-entregar',
        component: () => import('@/views/PorEntregar')
    },
    {
        path: '/por-estado/:view',
        name: 'por-estado',
        component: () => import('@/views/PorEstado')
    },
    {
        path: '/rutas',
        name: 'rutas',
        component: () => import('@/views/Rutas')
    },
    {
        path: '/ventas/:view?/:sub_view?',
        name: 'sale',
        component: () => import('@/views/Ventas')
    },
    {
        path: '/ventas-completas/:view?/:sub_view?',
        name: 'VentasAll',
        component: () => import('@/views/Ventas')
    },
    {
        path: '/proveedores/:view?/:sub_view?',
        name: 'provider',
        component: () => import('@/views/Provider')
    },
    {
        path: '/clientes/:view?/:sub_view?',
        name: 'client',
        component: () => import('@/views/Client')
    },
    {
        path: '/presupuestos/:view?/:sub_view?',
        name: 'budget',
        component: () => import('@/views/Budget')
    },
    {
        path: '/produccion/:view?/:sub_view?',
        name: 'produccion',
        component: () => import('@/views/Produccion')
    },
    {
        path: '/produccionV2/:view?/:sub_view?',
        name: 'produccionV2', 
        component: () => import('@/views/ProduccionV2')
    },
    {
        path: '/caja/:view?/:sub_view?',
        name: 'caja',
        component: () => import('@/views/Caja')
    },
    {
        path: '/online/:view?/:sub_view?/:chat_id?',
        name: 'online',
        component: () => import('@/views/Online')
    },
    {
        path: '/whatsapp/:chat_id?',
        name: 'whatsapp',
        component: () => import('@/views/Whatsapp')
    },
    {
        path: '/tienda-nube/:view?/:sub_view?/',
        name: 'tienda_nube',
        component: () => import('@/views/TiendaNube')
    },
    {
        path: '/mercado-libre/:view?',
        name: 'mercado_libre',
        component: () => import('@/views/MercadoLibre')
    },
    {
        path: '/agenda/:view?',
        name: 'pending',
        component: () => import('@/views/Pending')
    },
    {
        path: '/comprobantes/:view?/:sub_view?',
        name: 'comprobantes',
        component: () => import('@/views/Comprobantes')
    },
    {
        path: '/consultora-de-precios/:view?',
        name: 'consultora_de_precios',
        component: () => import('@/views/ConsultoraDePrecios')
    },
    {
        path: '/papelera/:view?',
        name: 'papelera',
        component: () => import('@/views/Papelera')
    },
    {
        path: '/devoluciones/:view?',
        name: 'devoluciones',
        component: () => import('@/views/Devoluciones')
    },
    // {
    //     path: '/ventas',
    //     name: 'ventas',
    //     component: () => import('@/views/Ventas')
    // },
]

const router = new VueRouter({
    mode: 'history',
    base: process.env.BASE_URL,
    routes
})

/**
 * Guardia global de navegación.
 *
 * - Si el usuario no está autenticado, redirige automáticamente a `login` para cualquier ruta privada.
 * - Permite rutas públicas (por ejemplo recuperación de clave) sin sesión.
 *
 * @param {Object} to destino de navegación (VueRouter route).
 * @param {Object} from origen de navegación (VueRouter route).
 * @param {Function} next callback para continuar / redirigir.
 * @returns {void}
 */
router.beforeEach((to, from, next) => {
    // Rutas públicas que deben poder accederse sin sesión iniciada.
    const public_route_names = ['login', 'passwordReset']

    // Estado de sesión: `null` se trata como no autenticado (hasta que `auth/me` resuelva).
    const is_authenticated = store && store.state && store.state.auth && store.state.auth.authenticated

    if (!is_authenticated && public_route_names.indexOf(to.name) === -1) {
        return next({
            name: 'login',
            query: {
                redirect: to.fullPath,
            },
        })
    }

    next()
})

export default router
