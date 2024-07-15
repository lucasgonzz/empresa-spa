import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const routes = [
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
        path: '/inicio/:view?',
        name: 'home',
        component: () => import('@/views/Home')
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
        path: '/reportes/:view?',
        name: 'reportes',
        component: () => import('@/views/Reportes')
    },
    {
        path: '/panel-de-control/:view?/:sub_view?',
        name: 'panel',
        component: () => import('@/views/PanelDeControl')
    },
    {
        path: '/listado-de-articulos',
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
        path: '/mercado-libre/:view?',
        name: 'mercado_libre',
        component: () => import('@/views/MercadoLibre')
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

export default router
