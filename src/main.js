import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import router from './router'
import store from './store'
import { apply_dark_mode_class, read_stored_dark_mode } from '@/utils/dark_mode'
import { env } from '@/runtime_config'

// Vue Scrool
Vue.prototype.$scrollToTop = (() => {
  setTimeout(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }, 100)
}) 


// Vue Scroll To
var VueScrollTo = require('vue-scrollto');
Vue.use(VueScrollTo, {
  container: "body",
  duration: 1000,
  easing: "ease",
  offset: -50,
  force: true,
  cancelable: true,
  onStart: false,
  onDone: false,
  onCancel: false,
  x: false,
  y: true
 })

// Laravel-echo
window.Pusher = require('pusher-js');
import Echo from "laravel-echo"

Vue.prototype.Echo = new Echo({
    broadcaster: 'pusher',
    key: env('VUE_APP_PUSHER_KEY'),
    cluster: env('VUE_APP_PUSHER_CLUSTER'),
    // Alineado con Pusher (TLS); si usás túnel/HTTP local, podés setear VUE_APP_PUSHER_USE_TLS=false en .env
    forceTLS: env('VUE_APP_PUSHER_USE_TLS') === 'false' ? false : true,
    /**
     * Autorizador custom para canales PRIVADOS (ej: `whatsapp.{owner_id}`, grupo 137).
     * El fetch relativo por defecto de Echo pegaría a `/broadcasting/auth` en el dominio
     * del SPA (no de la API); acá se pega directo al dominio de la API con `axios`, que ya
     * manda las cookies de sesión de Sanctum (`withCredentials`) igual que el resto de los
     * requests autenticados de la app.
     */
    authorizer: (channel) => {
        return {
            authorize: (socket_id, callback) => {
                axios.post(env('VUE_APP_API_URL') + '/broadcasting/auth', {
                    socket_id: socket_id,
                    channel_name: channel.name,
                }, {
                    withCredentials: true,
                })
                .then(res => {
                    callback(false, res.data)
                })
                .catch(err => {
                    callback(true, err)
                })
            }
        }
    },
});

// Notifications
import VueToast from 'vue-toast-notification';
import 'vue-toast-notification/dist/theme-sugar.css';
Vue.use(VueToast, {
  position: 'bottom'
});

// Bootstrap
import { BootstrapVue } from 'bootstrap-vue'
import '@/sass/_custom.scss'
import 'bootstrap-icons/font/bootstrap-icons.css'
Vue.use(BootstrapVue)

// Axios
import axios from 'axios'
import {
    is_laravel_validation_payload,
    show_laravel_validation_toast,
} from '@/utils/laravel_validation_toast'

/**
 * Interceptor de respuesta: muestra toasts devueltas por backend en `notifications`.
 *
 * Se usa para feedback inmediato cuando ciertas tareas (ej: recálculo de precios) se encolan
 * y continúan en segundo plano.
 *
 * Formato esperado:
 * - `response.data.notifications`: array de strings o de objetos { message, type }.
 *
 * @param {import('axios').AxiosResponse} response Respuesta exitosa de axios.
 * @returns {import('axios').AxiosResponse}
 */
function global_api_notifications_interceptor(response) {
    /** @type {any} data Payload devuelto por backend (puede variar por endpoint). */
    const data = response && response.data ? response.data : null

    /** @type {any[]} notifications Lista de notificaciones devueltas por backend. */
    const notifications = data && Array.isArray(data.notifications) ? data.notifications : []

    if (notifications.length) {
        notifications.forEach((notification) => {
            /** @type {string} message Texto principal a mostrar. */
            let message = ''
            /** @type {string} type Tipo de toast (success|error|warning|info). */
            let type = 'info'

            if (typeof notification === 'string') {
                message = notification
            } else if (notification && typeof notification === 'object') {
                message = notification.message ? String(notification.message) : ''
                type = notification.type ? String(notification.type) : 'info'
            }

            if (!message) {
                return
            }

            // Usamos el API del plugin (Vue.$toast) para poder llamar desde acá sin `this`.
            if (Vue && Vue.$toast && typeof Vue.$toast.open === 'function') {
                Vue.$toast.open({
                    message: message,
                    type: type,
                    duration: 8000,
                })
            } else if (Vue && Vue.$toast && typeof Vue.$toast[type] === 'function') {
                Vue.$toast[type](message, { duration: 8000 })
            }
        })
    }

    return response
}

/**
 * Muestra un toast desde afuera de un componente (los interceptores no tienen `this`).
 *
 * @param {string} tipo    'error' | 'warning' | 'info' | 'success'
 * @param {string} mensaje Texto a mostrar.
 * @returns {void}
 */
function mostrar_toast_global(tipo, mensaje) {
    if (!mensaje) {
        return
    }

    if (Vue && Vue.$toast && typeof Vue.$toast.open === 'function') {
        Vue.$toast.open({ message: mensaje, type: tipo, duration: 8000 })
    } else if (Vue && Vue.$toast && typeof Vue.$toast[tipo] === 'function') {
        Vue.$toast[tipo](mensaje, { duration: 8000 })
    }
}

/**
 * Ventana en la que un 401 tapa a los que vienen atrás.
 *
 * Cinco segundos. Cuando una sesión se cae, no se cae para un request: se cae para la ráfaga
 * entera del arranque (~15-18 llamadas que salen en el mismo tick y resuelven en menos de un
 * segundo, o en dos o tres si el servidor está cargado). Cinco segundos cubren la ráfaga con
 * margen. Y es corto a propósito: si el usuario vuelve a intentar algo unos segundos después y
 * también le da 401, se lo tiene que enterar de nuevo.
 */
const VENTANA_AVISO_401_MS = 5000

/**
 * Momento del último 401 que sí se avisó (epoch en ms). 0 = todavía no se avisó ninguno.
 */
let ultimo_aviso_401_en = 0

/**
 * ¿A este 401 le toca aviso, o llegó pegado a uno que ya se avisó?
 *
 * Marca el momento cuando devuelve `true`, así que se llama UNA sola vez por error.
 *
 * @returns {boolean}
 */
function debe_avisar_este_401() {
    const ahora = Date.now()

    if (ahora - ultimo_aviso_401_en < VENTANA_AVISO_401_MS) {
        return false
    }

    ultimo_aviso_401_en = ahora
    return true
}

/**
 * Interceptor de respuesta: errores de validación Laravel (422) → toast detallado;
 * el resto mantiene el evento global `errorEvent` (logo loading, modal legacy, etc.).
 *
 * @param {import('axios').AxiosError} error Error devuelto por axios.
 * @returns {Promise<never>}
 */
function global_api_error_interceptor(error) {
    const response = error.response
    if (!response) {
        /*
         * 🔴 Esta es la grieta de fondo de casi todos los "spinner infinito" del sistema.
         *
         * Un error de red (wifi cortado, servidor caído, DNS, CORS) y un timeout de axios NO
         * TIENEN `response`. Hasta acá este `if` devolvía el reject pelado: no disparaba
         * `errorEvent`, o sea que no se mostraba ningún toast Y —lo que de verdad duele— nadie
         * apagaba el loading global, porque el único lugar que hace `auth/setLoading = false`
         * ante un error es el handler de `errorEvent` (common-vue/components/error/Index.vue).
         * Resultado: el overlay tapando la aplicación entera hasta un F5.
         *
         * No se puede resolver despachando `errorEvent`: ese handler arranca con
         * `error.response.status`, así que con un error sin `response` tira TypeError adentro
         * del handler de errores y el problema queda igual. Por eso se atiende acá.
         *
         * El loading se apaga SIEMPRE (es el arreglo), y el mensaje se puede saltear con la
         * misma bandera `skip_global_error_event` que ya usa el resto del interceptor, para las
         * llamadas que manejan su propio error.
         */
        store.commit('auth/setLoading', false)
        store.commit('auth/setMessage', '')

        /* Un request cancelado a propósito no es un error que el usuario tenga que ver. */
        const fue_cancelado = typeof axios.isCancel === 'function' && axios.isCancel(error)

        const silenciar = Boolean(
            error.config && error.config.skip_global_error_event
        )

        if (!fue_cancelado && !silenciar) {
            /*
             * axios marca el timeout con code ECONNABORTED. Se distingue del corte de red
             * porque la acción del usuario es distinta: ante un timeout el pedido puede haber
             * llegado igual y conviene esperar, ante un corte de red hay que revisar la
             * conexión.
             */
            const es_timeout = Boolean(
                error.code === 'ECONNABORTED'
                || (error.message && String(error.message).indexOf('timeout') !== -1)
            )

            mostrar_toast_global(
                'error',
                es_timeout
                    ? 'El servidor tardó demasiado en responder. Lo que pediste puede haber quedado en curso: esperá un minuto antes de volver a intentar.'
                    : 'No pudimos conectarnos con el servidor. Revisá tu conexión a internet y volvé a intentar.'
            )
        }

        return Promise.reject(error)
    }
    /**
     * Estado actual de autenticación en Vuex.
     * Se usa para evitar notificaciones globales mientras la sesión todavía no existe.
     */
    const is_authenticated = store.state.auth && store.state.auth.authenticated === true

    const { status, data } = response
    const skip_validation_toast = Boolean(
        error.config && error.config.skip_global_validation_toast
    )
    /* Permite que llamadas puntuales (p. ej. batch de imágenes) manejen el error localmente. */
    const skip_global_error_event = Boolean(
        error.config && error.config.skip_global_error_event
    )
    const is_validation = is_laravel_validation_payload(status, data)

    if (is_validation && !skip_validation_toast) {
        show_laravel_validation_toast(data)
    } else if (response && is_authenticated && !skip_global_error_event) {
        if (status === 401 && !debe_avisar_este_401()) {
            /*
             * 🔴 Camino deduplicado: este 401 llegó pegado a otro que ya se avisó, así que NO
             * se despacha `errorEvent` y el usuario ve un solo aviso en vez de quince toasts
             * de 10 segundos apilados (lo que pasa cuando se cae la sesión y falla la ráfaga
             * entera del arranque).
             *
             * Pero el loading se apaga IGUAL, y acá está la trampa: el handler de `errorEvent`
             * (common-vue/components/error/Index.vue) es el ÚNICO lugar de toda la aplicación
             * que hace `auth/setLoading = false` ante un error. Si simplemente no se
             * despachara el evento, el overlay quedaría tapando la aplicación entera hasta un
             * F5. Es el mismo cuelgue que ya pasó con los errores sin `response`, atendido
             * arriba de la misma manera.
             */
            store.commit('auth/setLoading', false)
            store.commit('auth/setMessage', '')
        } else {
            // Solo emitimos el error global cuando ya hay sesión iniciada.
            // Esto evita alerts/toasts automáticos durante el arranque o antes del login.
            document.dispatchEvent(
                new CustomEvent('errorEvent', { detail: error })
            )
        }
    }
    return Promise.reject(error)
}

// Instancia usada como Vue.prototype.$api (prefijo /api)
const apiInstance = axios.create({
    baseURL: env('VUE_APP_API_URL') + '/api',
    withCredentials: true
})

apiInstance.interceptors.response.use(
    global_api_notifications_interceptor,
    global_api_error_interceptor
)

// ✅ Registramos $api como plugin (como hacías vos)
Vue.use({
  install(Vue) {
    Vue.prototype.$api = apiInstance
  }
})


const axiosInstance = axios.create({
    baseURL: env('VUE_APP_API_URL'),
    withCredentials: true
})

axiosInstance.interceptors.response.use(
    global_api_notifications_interceptor,
    global_api_error_interceptor
)

// Misma lógica para el axios por defecto (stores que importan `axios` sin `create`)
axios.interceptors.response.use(
    global_api_notifications_interceptor,
    global_api_error_interceptor
)

Vue.use({
  install(Vue) {
    Vue.prototype.$axios = axiosInstance
  }
})
// import axios from 'axios'
// Vue.use({
//   install (Vue) {
//     Vue.prototype.$axios = axios.create({
//       baseURL: env('VUE_APP_API_URL'),
//       withCredentials: true
//     })
//   }
// })
// Vue.use({
//   install (Vue) {
//     Vue.prototype.$api = axios.create({
//       baseURL: env('VUE_APP_API_URL')+'/api',
//       withCredentials: true
//     })
//   }
// })

// VueCookies
import VueCookies from 'vue-cookies'
Vue.use(VueCookies)

// Mixins
import app from './common-vue/mixins/app'
Vue.mixin(app)
import generals from './mixins/generals'
Vue.mixin(generals)



Vue.config.productionTip = false

// Modo oscuro: aplicar el recuerdo de localStorage ANTES de montar, no en el created() de
// App.vue. El usuario recién se conoce cuando resuelve auth/me (csrf-cookie + GET api/user); sin
// esto, alguien con el modo oscuro prendido vería la aplicación en blanco durante todo ese ida y
// vuelta y después un salto a oscuro. App.vue corrige este recuerdo apenas llega el usuario real.
apply_dark_mode_class(read_stored_dark_mode())

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
