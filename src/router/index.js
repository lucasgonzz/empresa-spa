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
        path: '/abm/:view?',
        name: 'abm',
        component: () => import('@/common-vue/views/Abm')
    },
    {
        path: '/empleados',
        name: 'employee',
        component: () => import('@/common-vue/views/Employee')
    },
    
    {
        path: '/vender/:view?',
        name: 'vender',
        component: () => import('@/views/Vender')
    },
    // {
    //     path: '/ingresar-articulo',
    //     name: 'ingresar',
    //     component: () => import('@/views/Ingresar')
    // },
    {
        path: '/listado-de-articulos',
        name: 'article',
        component: () => import('@/views/Listado')
    },
    {
        path: '/ventas/:view?/:sub_view?',
        name: 'sale',
        component: () => import('@/views/Ventas')
    },
    {
        path: '/proveedores/:view?/:sub_view?',
        name: 'provider',
        component: () => import('@/views/Provider')
    },
    {
        path: '/clientes',
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
        path: '/online/:view?/:sub_view?/:chat_id?',
        name: 'online',
        component: () => import('@/views/Online')
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
