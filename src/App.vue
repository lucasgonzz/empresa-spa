<template>
    <div id="app" :class="uiSizeClass">

        <!-- Comentario de prueba Leonardo -->
        
        <error-modal></error-modal>
        <logo-loading></logo-loading>
        <nav-component></nav-component>
        <btn-scroll-top></btn-scroll-top>
        <support-chat-floating-button></support-chat-floating-button>
        <asistente-ia-floating-button></asistente-ia-floating-button>
        <!--
            Anfitrión del sidebar de WhatsApp. Va acá arriba, y no adentro del módulo, porque
            desde este refactor la conversación se abre también desde Clientes, Pedidos y
            Compradores: si el sidebar y la suscripción a Echo vivieran en views/Whatsapp.vue,
            fuera del módulo no habría ni conversación ni tiempo real. El componente se gatea
            solo (sesión + extensión `whatsapp`), igual que el botón del asistente IA.
        -->
        <whatsapp-sidebar-host></whatsapp-sidebar-host>
        <!--
            Descripciones de controles. Va acá, una sola vez para toda la aplicación, porque
            escucha el mouse por delegación en `document` y busca el control por su
            `data-testid` en el diccionario de `src/descripciones/`. Poner una descripción no
            requiere tocar el componente dueño del botón: se agrega la entrada al diccionario
            y aparece sola.
        -->
        <descripcion-de-control></descripcion-de-control>
        <offline-articles-progress
        :offline_articles_sync_progress="offline_articles_sync_progress"></offline-articles-progress>
        <afip-reenviar-facturas></afip-reenviar-facturas>
        <!--
            Facturacion de las ventas que se guardaron sin conexion. Va aca arriba, al lado de
            afip-reenviar-facturas, porque el que llena su lista es el mixin offline -- que se
            mezcla en este mismo App.vue -- y el modal tiene que existir en cualquier vista: la
            conexion puede volver estando en cualquier pantalla, no solo en Vender.
        -->
        <facturar-ventas-offline></facturar-ventas-offline>
        <articles-stock-minimo></articles-stock-minimo>
        <synced-version-notifications></synced-version-notifications>
        <!--
            Cotización del dólar. Se autogatea en su propia raíz (extensión + rol), igual que
            whatsapp-sidebar-host y el botón del asistente IA: montarlo acá no significa que se
            ejecute para todos.
        -->
        <cotizacion-dolar-modal></cotizacion-dolar-modal>
        <!--
            Aviso de "Asignar imágenes automáticamente". Va acá arriba, y no adentro del módulo
            de artículos, porque el que dispara el lote es `SearchImageAutomatica.vue`, que vive
            adentro del dropdown de opciones del listado: ese dropdown se desmonta apenas la
            selección queda vacía, así que si la suscripción a Echo viviera ahí, el callback
            quedaría corriendo sobre una instancia destruida y el modal de resumen no aparecería
            nunca (sin error y sin log). Acá el anfitrión está siempre montado.
            No se suscribe a nada por su cuenta: solo cuando alguien largó un lote en ESTA
            pestaña. El porqué está en el docblock del componente.
        -->
        <aviso-imagenes-automaticas></aviso-imagenes-automaticas>
        <!--
            Aviso de "Descripciones inteligentes". Está acá por lo mismo, exactamente, que el de
            imágenes de arriba: su disparador (`SearchDescriptionAutomatica.vue`) también vive
            adentro del dropdown de opciones del listado y también se desmontaba con la selección,
            llevándose el listener puesto. Tampoco se suscribe por su cuenta.
        -->
        <aviso-descripciones-automaticas></aviso-descripciones-automaticas>

        <!--
            Panel de tutoriales de la demo (misión 51, corregido por la 52). El v-if es la guarda
            que protege a los ~40 clientes reales: para un cliente el componente NO se monta, no
            se ejecuta una línea suya y no se hace ninguna llamada. Es v-if y no v-show a propósito.

            🔴 Lo que NO hace la guarda, y conviene que esté escrito para que nadie lo prometa de
            nuevo: el chunk igual se DESCARGA. Vue CLI registra el plugin `prefetch` por defecto y
            este repo no lo borra en vue.config.js, así que el navegador se baja todos los chunks
            async con <link rel="prefetch"> (medido: 861 en el dist del 12/8). Es descarga de baja
            prioridad después del load, no ejecución — pero no es cero, y decir que sí lo era fue
            una afirmación falsa en la misión 51.

            🔴 El getter es `panel_visible` y NO `demo/activa`, y la diferencia importa (pedido de
            Lucas, 25/8/2026): `panel_visible` mira solo el marcador en memoria que prende
            DemoIngreso.vue al canjear el token, así que el panel aparece únicamente cuando se
            entró con el `?t=` en la URL. Entrar a la demo sin el parámetro con la sesión todavía
            viva deja pasar al lead —la sesión se respeta— pero sin panel. `demo/activa` sigue
            existiendo y mirando las dos fuentes: responde "¿esta sesión es una demo?", que es otra
            pregunta y es la que gatea las llamadas a la API. Ojo con la explicación fácil de por
            qué se dejó: NO es que salve la telemetría después de un F5 —los eventos los emite este
            mismo panel, así que sin panel no hay eventos—. Está en store/demo.js, escrito bien.
        -->
        <panel-demo v-if="$store.getters['demo/panel_visible']"></panel-demo>

        <b-container
        fluid>
            <payment-expire></payment-expire>
            <router-view/>
            
        </b-container> 
    </div>
</template>
<script>
import ErrorModal from '@/common-vue/components/error/Index'
import LogoLoading from '@/common-vue/components/LogoLoading'
import NavComponent from '@/components/nav/Index'
import BtnScrollTop from '@/common-vue/components/nav/BtnScrollTop'
import SupportChatFloatingButton from '@/common-vue/components/support-chat/FloatingButton'
import AsistenteIaFloatingButton from '@/components/asistente-ia/FloatingButton'
import WhatsappSidebarHost from '@/components/whatsapp/SidebarHost'
import DescripcionDeControl from '@/common-vue/components/ayuda/DescripcionDeControl'

import app from '@/common-vue/mixins/app'
import start_methods from '@/mixins/start_methods'
import broadcast from '@/mixins/broadcast'
import check_version from '@/mixins/check_version'
import offline from '@/offline/index'
import { apply_dark_mode_class, store_dark_mode } from '@/utils/dark_mode'

/**
 * Ruta pública de ingreso a la demo, tal como está declarada en `router/index.js`.
 * El literal se deja también allá: acá se necesita el path y allá el nombre.
 */
const RUTA_INGRESO_DEMO = '/demo/ingreso'

export default {
    mixins: [app, start_methods, broadcast, check_version, offline],
    components: {
        ErrorModal,
        LogoLoading, 
        NavComponent,
        BtnScrollTop,
        SupportChatFloatingButton,
        AsistenteIaFloatingButton,
        WhatsappSidebarHost,
        DescripcionDeControl,
        OfflineArticlesProgress: () => import('@/common-vue/components/offline-sync-articles/Progress'),
        PaymentExpire: () => import('@/components/nav/PaymentExpire'),
        AfipReenviarFacturas: () => import('@/components/common/afip-reenviar-facturas/Index'),
        FacturarVentasOffline: () => import('@/components/common/facturar-ventas-offline/Index'),
        ArticlesStockMinimo: () => import('@/components/common/ArticlesStockMinimo'),
        SyncedVersionNotifications: () => import('@/components/common/SyncedVersionNotifications'),
        CotizacionDolarModal: () => import('@/components/common/cotizacion-dolar/Modal'),
        AvisoImagenesAutomaticas: () => import('@/components/common/AvisoImagenesAutomaticas'),
        AvisoDescripcionesAutomaticas: () => import('@/components/common/AvisoDescripcionesAutomaticas'),
        // Carga diferida: sin demo, este chunk no se descarga nunca (misión 51).
        PanelDemo: () => import('@/components/demo/PanelDemo'),
    },
    computed: {
        uiSizeClass() {
            const slug = this.$store.state.auth.user?.inputs_size?.slug
            return slug ? `ui-${slug}` : ''
        },
        /**
         * Preferencia de modo oscuro del usuario autenticado. `null` mientras no se sepa quién
         * es (arranque, antes de que resuelva `auth/me`) -- a propósito, y no `false`: Vue solo
         * dispara un watch cuando el valor OBSERVADO cambia, así que si acá devolviéramos
         * `false` durante el arranque y el usuario resultara tener la preferencia en claro
         * (`false` también), la transición `false -> false` no dispararía el watch de abajo, y
         * ni la clase ni el recuerdo de `localStorage` se corregirían nunca contra la base.
         */
        dark_mode_del_usuario() {
            return this.user ? Boolean(this.user.dark_mode) : null
        },
    },
    created() {
        var self = this
        // La vista de ingreso a la demo maneja su propia autenticación: si dejamos correr el
        // auth/me de arranque, resuelve "no autenticado" y el watcher de abajo manda a login
        // antes de que el token de la demo llegue a canjearse.
        // 🔴 La guarda NO puede preguntar por `$route.name` acá: ver `es_ingreso_a_la_demo()`.
        if (this.es_ingreso_a_la_demo()) {
            return
        }
        /**
         * Si se llegó desde otra versión con token de transferencia, iniciar sesión aquí
         * antes de `auth/me` para que la versión correcta ya quede autenticada.
         */
        this.consume_version_session_token_if_present()
            .then(function (user_from_transfer) {
                if (user_from_transfer) {
                    self.$store.commit('auth/setUser', user_from_transfer)
                    self.$store.commit('auth/setAuthenticated', true)
                    return
                }
                self.$store.dispatch('auth/me')
            })
    },
    methods: {
        /**
         * ¿Este arranque es el ingreso a la demo por token (`/demo/ingreso?t=...`)?
         *
         * 🔴 Se decide por `window.location.pathname` y NO por `$route.name`, y esto es lo
         * primero que alguien va a querer "simplificar" de vuelta, porque el chequeo por nombre
         * *parece* correcto. No lo es en el `created()` de App.vue:
         *
         * En ese momento la navegación inicial del router TODAVÍA NO RESOLVIÓ. Todas las rutas
         * de este repo son lazy (`component: () => import(...)`, `router/index.js`), así que la
         * navegación queda esperando la descarga del chunk y `$route` sigue siendo la ruta de
         * arranque de vue-router, con `name === null`. Medido el 17/8/2026 entrando por el link
         * de la demo: el `sanctum/csrf-cookie` de este `auth/me` salía a los 678 ms con
         * `$route.name === null`, y `DemoIngreso.vue` recién montaba entre 95 y 466 ms después.
         *
         * Consecuencias de que la guarda no dispare, las dos medidas:
         * 1. El `GET /api/user` sale sin cookie de sesión, `auth:sanctum` lo rechaza y el lead se
         *    come el toast "Unauthenticated." — de 5 a 10 según cuántas llamadas arranquen.
         * 2. La grave: el `.catch` de `auth/me` deja `authenticated` en false, el watch de acá
         *    abajo hace `router.replace({name: 'login'})` en pleno ingreso y el lead termina
         *    en `/login` en vez de en la demo.
         *
         * `window.location.pathname` sí está disponible en el `created()`: el router está en modo
         * history (`router/index.js`) y el pathname no depende de que la navegación resuelva.
         *
         * Se descartó mover el `dispatch('auth/me')` adentro de `this.$router.onReady(...)`, que
         * también arregla el bug: eso retrasaría el `auth/me` de arranque de TODOS los clientes
         * hasta que baje el chunk de su vista inicial. Este camino cambia el comportamiento
         * únicamente en la ruta de la demo; el de los ~40 clientes reales queda idéntico.
         *
         * @returns {Boolean}
         */
        es_ingreso_a_la_demo() {
            // Cuando App.vue se crea con una ruta ya resuelta, el nombre es la fuente directa.
            if (this.$route.name === 'demoIngreso') {
                return true
            }

            // Se compara por sufijo y no por igualdad para que un `publicPath` distinto de '/'
            // (hoy no hay ninguno en vue.config.js) no rompa la guarda en silencio. La barra
            // inicial de la constante ancla la comparación: '/xxdemo/ingreso' no coincide.
            const pathname = window.location.pathname.replace(/\/+$/, '')

            return pathname.slice(-RUTA_INGRESO_DEMO.length) === RUTA_INGRESO_DEMO
        },
    },
    watch: {
        /**
         * Corrige el recuerdo de `localStorage` (aplicado en `main.js` antes de montar) contra
         * lo que dice la base apenas resuelve `auth/me`. Cubre el caso de que el usuario haya
         * cambiado la preferencia desde otra computadora, o que en esta se hubiera logueado
         * antes otra persona con una preferencia distinta. `immediate: true` para que corra
         * también en el primer cuadro, no solo ante cambios posteriores.
         */
        dark_mode_del_usuario: {
            immediate: true,
            handler(activo) {
                // `activo` es null hasta que resuelve auth/me, y este watch corre sincrónicamente
                // al crear el componente (mismo tick que main.js). Sin este guard, la primera
                // ejecución (con activo todavía null) borraría la clase que main.js acaba de
                // poner a partir del recuerdo de localStorage -- el destello blanco que se
                // quería evitar. Mientras no se sepa quién es el usuario, el recuerdo manda.
                if (activo === null) {
                    return
                }
                apply_dark_mode_class(activo)
                store_dark_mode(activo)
            },
        },
        authenticated() {
            console.log('watch de authenticateds')
            if (!this.authenticated) {
                /**
                 * Redirección de seguridad: si se pierde la sesión, volver a `login`.
                 * Evita quedar en vistas privadas sin autorización o en rutas inexistentes.
                 */
                if (this.$route.name !== 'login') {
                    this.$router.replace({name: 'login'}).catch(() => {})
                }
            } else {
                // this.check_online()
                this.check_version()
                this.checkPermissionForCurrentRoute()
                this.callMethods()
                this.listenChannels()
                this.listenChannelsLocal()
                this.startMethods()

                this.sincronizar_offline()
                
                this.$store.dispatch('cheque/getModels')

            }
        }
    },
}
</script>
<style lang="sass">
@import "./sass/fonts/styles.css"
@import '@/common-vue/sass/app.sass'
@import '@/sass/app.sass'
@import '@/sass/_custom.scss'

</style>
