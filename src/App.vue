<template>
    <div id="app" :class="uiSizeClass">

        <!-- Comentario de prueba Leonardo -->
        
        <error-modal></error-modal>
        <logo-loading></logo-loading>
        <!--
            Bloqueo de la app instalada (PWA) que quedó en una dirección vieja (misión
            redireccion-version-antes-del-login, 24/9/2026). Tapa todo, sin botón de cerrar. Se
            gatea solo con el estado del store (`auth.version_bloqueada`), igual que los avisos
            de sesión de más abajo.
        -->
        <app-instalada-vieja></app-instalada-vieja>
        <nav-component></nav-component>
        <btn-scroll-top></btn-scroll-top>
        <support-chat-floating-button></support-chat-floating-button>
        <asistente-ia-floating-button></asistente-ia-floating-button>
        <!--
            Anfitrión del sidebar de WhatsApp. Va acá arriba, y no adentro del módulo, porque
            desde este refactor la conversación se abre también desde Clientes, Pedidos y
            Compradores: si el sidebar y la suscripción a Echo vivieran en views/Whatsapp.vue,
            fuera del módulo no habría ni conversación ni tiempo real. El componente se gatea
            solo (sesión + extensión `agentes_ia`), igual que el botón del asistente IA.
        -->
        <whatsapp-sidebar-host></whatsapp-sidebar-host>
        <!--
            Anfitrión del sidebar de Mensajes de Tienda Online (misión mensajes-tienda-online,
            28/9/2026). Acá arriba por lo mismo que el de WhatsApp: la conversación se abre desde
            el submódulo, desde Clientes, desde Alertas y desde el aviso de mensaje nuevo, y el
            mensaje del comprador tiene que entrar en vivo esté donde esté el operador. Es el dueño
            único de esa suscripción y se gatea solo (sesión + extensión `online` + `buyer.index`).
        -->
        <tienda-mensajes-sidebar-host></tienda-mensajes-sidebar-host>
        <!--
            Descripciones de controles. Va acá, una sola vez para toda la aplicación, porque
            escucha el mouse por delegación en `document` y busca el control por su
            `data-testid` en el diccionario de `src/descripciones/`. Poner una descripción no
            requiere tocar el componente dueño del botón: se agrega la entrada al diccionario
            y aparece sola.
        -->
        <descripcion-de-control></descripcion-de-control>
        <!--
            Aviso fijo de "Sin conexión" y de las ventas guardadas en el equipo que todavía no
            subieron (misión ingreso-sin-internet, 23/10/2026). Se gatea solo con el store.
        -->
        <aviso-sin-conexion></aviso-sin-conexion>
        <offline-articles-progress
        :offline_articles_sync_progress="offline_articles_sync_progress"></offline-articles-progress>
        <afip-reenviar-facturas></afip-reenviar-facturas>
        <!--
            Modal de confirmación de factura. Global a propósito: el botón "Emitir factura" del
            detalle de una venta (BtnFacturar.vue) lo abre con $bvModal.show, y ese detalle se abre
            desde muchos lados (alertas de facturación, Tesorería, Reportes, etc.). Antes vivía
            solo en current-acounts y Caja, y en el resto el botón no hacía nada.
        -->
        <confirm-afip-tickets v-if="authenticated"></confirm-afip-tickets>
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
            Aviso de "tu sesión se cerró en este dispositivo" (candado de sesión única, botón
            "Cerrar la otra sesión e ingresar acá" del login). El listener del canal privado vive
            en src/mixins/broadcast.js (mixin de este mismo componente); acá solo el modal, SIEMPRE
            montado -a diferencia de los dos avisos de arriba, este puede llegar en cualquier
            pantalla del sistema, no solo desde el listado de artículos.
        -->
        <sesion-cerrada-otro-dispositivo-modal></sesion-cerrada-otro-dispositivo-modal>
        <!--
            Candado de sesión por pestaña (misión candado-sesion-por-pestana, 19/9/2026): abrir
            una pestaña nueva del mismo navegador ya logueado no pasa por LoginForm.vue -la
            cookie ya autentica-, así que este aviso no puede vivir ahí. Mismo criterio que el
            modal de arriba: SIEMPRE montado, porque el 403 puede llegar apenas arranca la SPA,
            antes de que cualquier vista privada monte nada.
        -->
        <misma-sesion-otra-pestana-modal></misma-sesion-otra-pestana-modal>

        <!--
            Procesos en segundo plano (misión procesos-en-segundo-plano, 18/9/2026): la píldora de
            arriba a la derecha con cuántos hay corriendo, y el modal con el detalle de todos. Van
            gateados por `authenticated` y no por v-show: la píldora es quien pide el listado en su
            created() (encadenado detrás del arranque de sesión), así que cada login lo vuelve a
            pedir y cada logout lo desmonta con sus timers. El canal de broadcast lo suscribe
            listenChannels() (common-vue/mixins/broadcast.js), no estos componentes.
        -->
        <procesos-tarjeta v-if="authenticated"></procesos-tarjeta>
        <procesos-modal v-if="authenticated"></procesos-modal>

        <!--
            Panel de tutoriales de la demo (misión 51, corregido por la 52). El v-if es la guarda
            que protege a los ~40 clientes reales: para un cliente el componente NO se monta, no
            se ejecuta una línea suya y no se hace ninguna llamada. Es v-if y no v-show a propósito.

            🔴 Lo que NO hace la guarda, y conviene que esté escrito para que nadie lo prometa de
            nuevo: el chunk igual se DESCARGA. Hasta el 24/9/2026 era porque Vue CLI registra el
            plugin `prefetch` por defecto y este repo no lo borraba: el navegador se bajaba todos los
            chunks async con <link rel="prefetch"> (medido: 861 en el dist del 12/8). Desde esa
            fecha `vue.config.js` lo borra, pero el chunk se sigue descargando igual: el service
            worker precachea todos los archivos del build (`precacheAndRoute`). Es descarga de baja
            prioridad, no ejecución — pero no es cero, y decir que sí lo era fue una afirmación
            falsa en la misión 51.

            El servidor debe confirmar que la sesión autenticada es una demo. El chat es ahora
            el único acceso a los videos, así que una recarga conserva su launcher compacto;
            sólo el ingreso por token lo presenta abierto. No se usa almacenamiento local
            para autorizar el panel. Ver store/demo.js y el estado inicial de PanelDemo.
        -->
        <panel-demo v-if="$store.getters['demo/panel_visible']"></panel-demo>

        <!--
            El v-if esconde la vista entera mientras hay bloqueo de app instalada: el login no se
            puede ver ni tocar por detrás de esa pantalla (ni con el teclado).
        -->
        <b-container
        v-if="!version_bloqueada"
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
import TiendaMensajesSidebarHost from '@/components/online/components/mensajes/SidebarHost'
import DescripcionDeControl from '@/common-vue/components/ayuda/DescripcionDeControl'
import AppInstaladaVieja from '@/components/common/AppInstaladaVieja'

import app from '@/common-vue/mixins/app'
import start_methods from '@/mixins/start_methods'
import broadcast from '@/mixins/broadcast'
import check_version from '@/mixins/check_version'
import offline from '@/offline/index'
import db from '@/offline/db'
import AvisoSinConexion from '@/components/common/AvisoSinConexion'
import { apply_dark_mode_class, store_dark_mode } from '@/utils/dark_mode'

/**
 * Ruta pública de ingreso a la demo, tal como está declarada en `router/index.js`.
 * El literal se deja también allá: acá se necesita el path y allá el nombre.
 */
const RUTA_INGRESO_DEMO = '/demo/ingreso'

/**
 * Prefijo de la ruta pública del informe compartido (`/informe/:token`), tal como está
 * declarada en `router/index.js` (misión asistente-por-whatsapp, 16/9/2026).
 *
 * El literal se deja también allá: acá se necesita el path y allá el nombre. Es un PREFIJO y no
 * un path exacto porque la ruta lleva el token adentro.
 */
const RUTA_INFORME_COMPARTIDO = '/informe/'

/**
 * Ruta pública del ingreso con acceso de soporte, tal como está declarada en `router/index.js`
 * (misión acceso-soporte-firmado, 30/10/2026).
 *
 * El literal se deja también allá: acá se necesita el path y allá el nombre. Es un path exacto
 * (el token viaja en el fragmento `#t=`, que nunca es parte del pathname), no un prefijo.
 */
const RUTA_ACCESO_SOPORTE = '/acceso-soporte'

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
        TiendaMensajesSidebarHost,
        DescripcionDeControl,
        AppInstaladaVieja,
        // Import estático: tiene que poder dibujarse sin conexión aunque su chunk no haya bajado.
        AvisoSinConexion,
        OfflineArticlesProgress: () => import('@/common-vue/components/offline-sync-articles/Progress'),
        PaymentExpire: () => import('@/components/nav/PaymentExpire'),
        AfipReenviarFacturas: () => import('@/components/common/afip-reenviar-facturas/Index'),
        ConfirmAfipTickets: () => import('@/components/ventas/modals/afip-ticket/ConfirmAfipTickets'),
        FacturarVentasOffline: () => import('@/components/common/facturar-ventas-offline/Index'),
        ArticlesStockMinimo: () => import('@/components/common/ArticlesStockMinimo'),
        SyncedVersionNotifications: () => import('@/components/common/SyncedVersionNotifications'),
        CotizacionDolarModal: () => import('@/components/common/cotizacion-dolar/Modal'),
        AvisoImagenesAutomaticas: () => import('@/components/common/AvisoImagenesAutomaticas'),
        AvisoDescripcionesAutomaticas: () => import('@/components/common/AvisoDescripcionesAutomaticas'),
        SesionCerradaOtroDispositivoModal: () => import('@/components/common/SesionCerradaOtroDispositivoModal'),
        MismaSesionOtraPestanaModal: () => import('@/components/common/MismaSesionOtraPestanaModal'),
        // Procesos en segundo plano: píldora y modal (ver el comentario en el template).
        ProcesosTarjeta: () => import('@/components/common/procesos-en-segundo-plano/Tarjeta'),
        ProcesosModal: () => import('@/components/common/procesos-en-segundo-plano/Modal'),
        // Carga diferida: sin demo, este chunk no se descarga nunca (misión 51).
        PanelDemo: () => import('@/components/demo/PanelDemo'),
    },
    computed: {
        uiSizeClass() {
            const slug = this.$store.state.auth.user?.inputs_size?.slug
            return slug ? `ui-${slug}` : ''
        },
        /**
         * Bloqueo de una app instalada (PWA) que quedó en una dirección vieja: `null` si no hay
         * ninguno, `{direccion, motivo}` si lo hay. Ver `store/auth.js` y `check_version.js`.
         */
        version_bloqueada() {
            return this.$store.state.auth.version_bloqueada
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
        //
        // El informe compartido (misión asistente-por-whatsapp) entra por el mismo portón y por
        // el mismo motivo: no tiene sesión y NO la va a tener nunca. Sin esta guarda, el
        // `auth/me` de arranque resuelve "no autenticado", `authenticated` pasa de null a false
        // y el watch de abajo hace `router.replace({name: 'login'})` — el dueño toca el link del
        // informe desde el teléfono y aterriza en la pantalla de login, con el informe que nunca
        // llegó a ver. Es exactamente lo que le pasaba al lead con el link de la demo.
        //
        // El ingreso con acceso de soporte (misión acceso-soporte-firmado) es el caso de la demo:
        // la vista canjea un token por una sesión, así que el `auth/me` de arranque —que salía
        // sin cookie, resolvía "no autenticado" y mandaba a login— le gana de mano al canje.
        if (this.es_ingreso_a_la_demo() || this.es_informe_compartido() || this.es_acceso_soporte()) {
            return
        }
        /**
         * "¿Esta es la dirección activa de este sistema?": la consulta sale YA, en paralelo con
         * `auth/me` y no detrás (misión redireccion-version-antes-del-login, 24/9/2026). Solo se
         * usa si `auth/me` dice que no hay sesión; para entonces la respuesta ya llegó y no suma
         * ni un pedido al camino. Es una propiedad común y no del `data`: no necesita ser
         * reactiva y es una promesa que nunca rechaza.
         */
        this.consulta_version_activa = this.iniciar_consulta_de_version_activa()
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
                // Una app instalada vieja ya quedó bloqueada (llegó con token): no se arranca
                // nada por detrás de esa pantalla, ni siquiera `auth/me`.
                if (self.$store.state.auth.version_bloqueada) {
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
        /**
         * ¿Este arranque es el informe del mostrador abierto por link (`/informe/<token>`)?
         *
         * Misma mecánica —y el mismo 🔴— que `es_ingreso_a_la_demo()`: en el `created()` de
         * App.vue la navegación inicial todavía no resolvió (todas las rutas son lazy), así que
         * `$route.name` es null y hay que mirar `window.location.pathname`.
         *
         * La diferencia con la demo es que acá NUNCA va a haber sesión: la demo canjea un token
         * por una sesión iniciada, y esta vista lee un informe de solo lectura contra una ruta
         * pública del API y se queda sin sesión para siempre. Por eso alcanza con no arrancar el
         * `auth/me`: sin ese dispatch, `authenticated` se queda en null, el watch no dispara y
         * nadie manda a login.
         *
         * Se busca el prefijo en cualquier parte del pathname, y no por sufijo como la demo,
         * porque el token va DESPUÉS del prefijo.
         *
         * @returns {Boolean}
         */
        es_informe_compartido() {
            if (this.$route.name === 'informeCompartido') {
                return true
            }

            return window.location.pathname.indexOf(RUTA_INFORME_COMPARTIDO) !== -1
        },
        /**
         * ¿Este arranque es el ingreso con acceso de soporte (`/acceso-soporte#t=...`)?
         *
         * Misma mecánica —y el mismo 🔴— que `es_ingreso_a_la_demo()`: se decide por
         * `window.location.pathname` y NO por `$route.name`, porque en el `created()` de App.vue
         * la navegación inicial todavía no resolvió (todas las rutas son lazy) y `$route.name` es
         * null. Ver el comentario largo de `es_ingreso_a_la_demo()` para las dos consecuencias
         * medidas de que la guarda no dispare (el toast "Unauthenticated." y el rebote a /login).
         *
         * Es el mismo caso que la demo y no el del informe: la vista canjea el token por una
         * sesión, y recién entonces hay `authenticated`. Por eso la guarda del `created()` solo
         * evita el `auth/me` de ARRANQUE (que le ganaría de mano al canje); el `auth/me` de después
         * del canje lo despacha la propia vista.
         *
         * Se compara por sufijo y no por igualdad, por el mismo motivo que la demo: un
         * `publicPath` distinto de '/' no rompe la guarda en silencio. La barra inicial de la
         * constante ancla la comparación: '/xxacceso-soporte' no coincide. El fragmento no cuenta:
         * `pathname` no lo incluye.
         *
         * @returns {Boolean}
         */
        es_acceso_soporte() {
            if (this.$route.name === 'accesoSoporte') {
                return true
            }

            const pathname = window.location.pathname.replace(/\/+$/, '')

            return pathname.slice(-RUTA_ACCESO_SOPORTE.length) === RUTA_ACCESO_SOPORTE
        },
        /**
         * Manda a la pantalla de login si todavía no se está en ella.
         *
         * Es lo que hacía el watch de `authenticated` en línea; se sacó a un método para poder
         * esperar la decisión previa al login (`resolver_version_antes_del_login`) antes de
         * navegar.
         *
         * No saca de `passwordReset` (recuperar contraseña): es una pantalla pública pensada
         * justo para quien no puede iniciar sesión. Sin esta excepción, abrir la dirección
         * `/recuperar-clave` directamente (un favorito, un link, recargar la página en el paso del
         * código) resolvía `auth/me` como "no autenticado" y lo devolvía al login.
         *
         * @returns {void}
         */
        ir_a_login() {
            if (this.$route.name !== 'login' && this.$route.name !== 'passwordReset') {
                this.$router.replace({name: 'login'}).catch(() => {})
            }
        },
        /**
         * Arranque de una sesión confirmada por el servidor: la cadena de pedidos del inicio, la
         * navegación a la pantalla que corresponde y los canales en vivo.
         *
         * Era el cuerpo del watch de `authenticated`; se sacó a un método (misión
         * ingreso-sin-internet, 23/10/2026) porque ahora lo corren dos momentos: el inicio de
         * sesión de siempre y la vuelta de la conexión cuando se había entrado sin internet con la
         * sesión guardada en el equipo (`salir_del_modo_sin_conexion()` del mixin offline).
         *
         * @param {Object} opciones `{desde_sin_conexion: true}` cuando viene de la vuelta de la
         *                          conexión: no se navega (el usuario sigue en la pantalla en la
         *                          que estaba, quizá a mitad de una venta).
         * @returns {void}
         */
        arrancar_sesion(opciones) {
            /** ¿Es la vuelta de la conexión de una sesión restaurada desde el equipo? */
            let desde_sin_conexion = Boolean(opciones && opciones.desde_sin_conexion)

            /*
                🔴 Encadenadas, una atras de otra, y no las ~15 juntas en paralelo contra la
                API recien autenticada: esa rafaga es la causa raiz del toast
                "Unauthenticated." apilado que reporto golonorte el 11/9/2026, al rebotar de
                sesion entre dos frentes del VPS (mismo mecanismo que debe_cambiar_de_version
                del watch de authenticated, pero para el caso en que NO hay que cambiar de
                frente). Cada eslabon atrapa su propio error para que uno que falle no le tape
                el turno al que sigue, y la promesa completa SIEMPRE resuelve -- nunca rechaza.

                Se guarda en auth/arranque_en_curso ANTES de checkPermissionForCurrentRoute():
                esa es la que puede navegar a /reportes en este mismo tick si esa pantalla es
                el aterrizaje por defecto, y los widgets de Reportes -- en su propio created()
                -- deciden si encadenan su fetch detras de esta señal o lo disparan ya mismo
                mirando si esto esta seteado (store/reportes/index.js).
            */
            let arranque = this.callMethods()
            .catch(err => console.log(err))
            .then(() => this.startMethods())
            .catch(err => console.log(err))
            .then(() => this.sincronizar_offline())
            .catch(err => console.log(err))
            .then(() => this.$store.dispatch('cheque/getModels'))
            .catch(err => console.log(err))
            .then(() => {
                // Uso normal del dia (fuera de un login): una navegacion posterior a
                // Reportes no tiene que encontrarse con la señal de un arranque que ya
                // termino hace rato. Se limpian las dos juntas: si solo se resetea
                // arranque_en_curso y se deja cadena_widgets colgada, un segundo arranque
                // en el mismo runtime (ej. checkUserAppUrl reautenticando antes del
                // location.replace) encuentra la cola vieja ya resuelta y dispara el
                // fetch de Reportes antes de tiempo -- la misma rafaga que esto vino a
                // evitar, solo que del lado de Reportes.
                if (this.$store.state.auth.arranque_en_curso === arranque) {
                    this.$store.commit('auth/set_arranque_en_curso', null)
                    this.$store.commit('reportes/setCadenaWidgets', null)
                }
            })
            .catch(err => console.log(err))

            this.$store.commit('auth/set_arranque_en_curso', arranque)

            // La navegacion es inmediata: el usuario no tiene que mirar una pantalla en
            // blanco mientras esperan las llamadas de arriba.
            if (!desde_sin_conexion) {
                this.checkPermissionForCurrentRoute()
            }

            // Setup de listeners, no son fetches: no bloquean ni forman parte de la cadena.
            // Sin conexion no se habian puesto (ver arrancar_sesion_sin_conexion), asi que
            // tambien corren a la vuelta.
            this.listenChannels()
            this.listenChannelsLocal()
        },
        /**
         * Arranque de una sesión restaurada desde el equipo porque se abrió el sistema sin
         * conexión (misión ingreso-sin-internet, 23/10/2026).
         *
         * No se pide nada al servidor: la cadena de `arrancar_sesion()` fallaría entera. Lo que
         * Vender necesita y no pide nada a la red se arranca igual:
         * - el empleado, el vendedor y la sucursal con los que arranca Vender (de `user` y de la
         *   cookie, como siempre);
         * - los catálogos los carga el panel de recursos desde la copia del equipo (ver
         *   `restaurar_catalogos_del_equipo()` en download-resources/Index.vue);
         * - los artículos ya están en IndexedDB y Vender los busca ahí porque `auth.online` quedó
         *   en false.
         *
         * Se aterriza en Vender (salvo que se hubiera pedido otra pantalla): es lo único que se
         * puede hacer de punta a punta sin servidor, y la pantalla de inicio de muchos usuarios
         * (Reportes, IA) quedaría vacía. Cuando vuelve la conexión, el mixin offline revalida la
         * sesión y corre `arrancar_sesion()`.
         *
         * @returns {void}
         */
        arrancar_sesion_sin_conexion() {
            this.setEmployeeVender()
            this.setSellerVender()
            this.init_vender_address_id()
            this.vigilar_la_sucursal_de_vender()

            this.ir_a_la_pantalla_sin_conexion()
            this.avisar_entrada_sin_conexion()
        },
        /**
         * A qué pantalla se entra sin conexión: la que se había pedido (el `?redirect=` que arma la
         * guarda del router), o Vender si el usuario puede vender, o la de siempre.
         *
         * @returns {void}
         */
        ir_a_la_pantalla_sin_conexion() {
            if (this.$route.path != '/' && this.$route.path != '/login') {
                this.checkPermissionForCurrentRoute()
                return
            }
            if (this.redirectToIntendedRoute()) {
                return
            }
            if (this.can('sale.store')) {
                this.$router.replace({name: 'vender', params: {view: 'remito'}}).catch(() => {})
                return
            }
            this.checkPermissionForCurrentRoute()
        },
        /**
         * Aviso de que se entró sin conexión: con qué sesión y con qué artículos se trabaja.
         *
         * @returns {Promise<void>}
         */
        avisar_entrada_sin_conexion() {
            return db.meta.get('last_articles_sync')
            .then(meta => {
                return db.articles.count()
                .then(cantidad => {
                    let mensaje = 'Entraste sin conexión con la sesión guardada en este equipo. Se usan los ' + cantidad + ' artículos descargados'
                    if (meta && meta.value) {
                        mensaje += ' el ' + this.date(meta.value) + ' a las ' + this.hour(meta.value)
                    }
                    mensaje += '. Las ventas quedan guardadas acá y se suben solas cuando vuelva internet.'
                    this.$toast.warning(mensaje, {
                        duration: 10000,
                        position: 'top',
                    })
                })
            })
            .catch(err => console.log('avisar_entrada_sin_conexion', err))
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
                 * Hay una pantalla de bloqueo de app instalada vieja: no se navega al login (el
                 * bloqueo es justamente no dejarla usar). Tiene que ir ANTES de todo lo demás.
                 */
                if (this.version_bloqueada) {
                    return
                }

                /**
                 * 🔴 Antes de mostrar el login por PRIMERA vez en este arranque se pregunta si esta
                 * es la dirección activa de su sistema (misión
                 * redireccion-version-antes-del-login, 24/9/2026): si no lo es, se lo manda a la
                 * que sí, o se bloquea la app instalada, ANTES de que escriba el documento y la
                 * clave en un frente en desuso. Hasta ahora eso pasaba recién después del login.
                 *
                 * Solo la primera vez: después de un logout o de una sesión caída ya no es un
                 * arranque. La promesa siempre resuelve (con un techo de tiempo adentro); si dice
                 * que se puede seguir, se navega al login como siempre.
                 */
                if (!this.version_previa_al_login_resuelta) {
                    this.version_previa_al_login_resuelta = true
                    this.resolver_version_antes_del_login(this.consulta_version_activa)
                        .then((puede_seguir) => {
                            if (puede_seguir) {
                                this.ir_a_login()
                            }
                        })
                    return
                }

                /**
                 * Redirección de seguridad: si se pierde la sesión, volver a `login`.
                 * Evita quedar en vistas privadas sin autorización o en rutas inexistentes.
                 */
                this.ir_a_login()
            } else {
                // Arrancó con sesión: la pregunta previa al login ya no aplica en esta carga.
                this.version_previa_al_login_resuelta = true

                /*
                    🔴 Sesión restaurada desde el equipo porque se abrió el sistema sin conexión
                    (misión ingreso-sin-internet, 23/10/2026). Va ANTES del cambio de versión y de
                    la cadena de arranque: los dos necesitan servidor. Ver
                    `arrancar_sesion_sin_conexion()`.
                */
                if (this.$store.state.auth.sesion_sin_conexion) {
                    this.arrancar_sesion_sin_conexion()
                    return
                }

                /**
                 * 🔴 Primero se corta, después se arranca. Si este frente no es el que le
                 * corresponde al usuario (`default_version` apunta a otro subdominio), lo
                 * único que se hace es transferir la sesión e irse: ni permisos, ni
                 * `callMethods`, ni `startMethods`, ni sincronización offline, ni cheques.
                 *
                 * El porqué está medido: esas ~15-18 llamadas salían en el MISMO tick que la
                 * redirección, contra la API del frente viejo. Los dos frentes de un cliente
                 * comparten la cookie de sesión (mismo nombre, mismo dominio) pero no el
                 * almacén, así que cada respuesta tardía del viejo le pisaba al frente nuevo
                 * la sesión recién iniciada — y el usuario aterrizaba con ~15 avisos de
                 * "Unauthenticated.".
                 *
                 * `debe_cambiar_de_version()` es sincrónico a propósito: para cuando
                 * `check_version()` decidía, las otras llamadas ya habían salido.
                 */
                if (this.debe_cambiar_de_version()) {
                    /*
                        🔴 Salvo que este equipo tenga ventas hechas sin conexión esperando subir
                        (misión ingreso-sin-internet). Las ventas viven en el IndexedDB de ESTE
                        frente (es por origen) y el frente nuevo no las ve: si se cambia de
                        versión antes de subirlas, quedan varadas acá para siempre. Se arranca
                        esta vez en este frente -que sube las ventas y ofrece facturarlas, igual
                        que siempre- y el cambio de versión queda para la próxima carga.

                        `ventas_sin_subir` lo cuenta el mixin offline en su created(), contra
                        IndexedDB local: resuelve en milisegundos, mucho antes que el ida y vuelta
                        de `auth/me` que trajo hasta acá. Se lee sincrónico a propósito, por lo
                        mismo que `debe_cambiar_de_version()`.
                    */
                    /*
                        Las que el servidor ya rechazó no cuentan: no van a subir solas y no hay
                        pantalla para resolverlas desde acá, así que frenarían el cambio de versión
                        para siempre. Quedan en el equipo (no se borran nunca).
                    */
                    if (this.$store.state.auth.ventas_sin_subir - this.$store.state.auth.ventas_rechazadas > 0) {
                        this.$toast.warning('Hay ventas guardadas en este equipo sin conexión: primero se suben. Cuando terminen, recargá la página para pasar a la versión nueva del sistema.', {
                            duration: 15000,
                            position: 'top',
                        })
                    } else {
                        this.ir_a_la_version_correcta()
                        return
                    }
                }
                // this.check_online()

                this.arrancar_sesion()
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
