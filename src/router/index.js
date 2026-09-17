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
        // Ruta pública de ingreso a la demo: el lead entra con un token en la query
        // string (`?t=`) y la vista canjea ese token por una sesión ya iniciada.
        path: '/demo/ingreso',
        name: 'demoIngreso',
        component: () => import('@/views/DemoIngreso'),
    },
    {
        // Informe del mostrador abierto desde el link que llegó por WhatsApp (misión
        // asistente-por-whatsapp, 16/9/2026). Ruta PÚBLICA: el dueño la abre desde el
        // teléfono, en la calle, sin tipear usuario ni contraseña — decisión de Lucas en la
        // Fase 2. Lo que la sostiene es el token de la URL: 64 caracteres al azar que el
        // backend guarda solo hasheado, vencen a los 7 días y abren UN informe de solo
        // lectura. Va listada abajo en `public_route_names`, y App.vue la excluye de su
        // arranque autenticado por el mismo motivo que a `demoIngreso`.
        path: '/informe/:token',
        name: 'informeCompartido',
        component: () => import('@/views/InformeCompartido'),
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
    {
        // Módulo IA: el mostrador (misión "modulo-ia-mostrador", 14/9/2026). Sin :id
        // muestra el escritorio con las carpetas; con :id abre directamente ese
        // informe (es el puente "Ver el informe" de una conversación del chat,
        // components/asistente-ia/Conversation.vue). El router no procesa
        // extensiones ni dueño: el gate vive en el menú (routes.js), en el
        // componente (aviso si no corresponde) y en el backend (403).
        //
        // Las rutas /sugerencias-de-stock y /sugerencias-de-compra que vivían acá
        // se quitaron en la misma misión, junto con sus vistas: las carpetas Stock y
        // Compras del mostrador las reemplazan.
        path: '/ia/:id?',
        name: 'ia',
        component: () => import('@/views/Ia')
    },
    {
        // Motor de ofertas por cliente (extension 'motor_de_ofertas'). Sin :id
        // muestra el listado; con :id, el detalle de esa corrida. El MISMO
        // componente se monta ademas en /online/promociones (Tienda Online ->
        // Promociones), que desde el 14/9/2026 es su unica entrada del menu; esta
        // ruta queda porque el puente "Ver las ofertas sugeridas" del chat la usa.
        path: '/ofertas/:id?',
        name: 'ofertas',
        component: () => import('@/views/Ofertas')
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
    // 'demoIngreso' es el ingreso a la demo vía token: la vista maneja su propia autenticación.
    // 'informeCompartido' es el informe del mostrador abierto desde el link que llegó por
    // WhatsApp (misión asistente-por-whatsapp): no inicia ninguna sesión y el que la autoriza es
    // el token de la URL, contra la ruta pública informe-compartido/{token} del API.
    const public_route_names = ['login', 'passwordReset', 'demoIngreso', 'informeCompartido']

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
