import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import router from './router'
import store from './store'

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
    key: process.env.VUE_APP_PUSHER_KEY,
    cluster: process.env.VUE_APP_PUSHER_CLUSTER,
    // Alineado con Pusher (TLS); si usás túnel/HTTP local, podés setear VUE_APP_PUSHER_USE_TLS=false en .env
    forceTLS: process.env.VUE_APP_PUSHER_USE_TLS === 'false' ? false : true,
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
 * Interceptor de respuesta: errores de validación Laravel (422) → toast detallado;
 * el resto mantiene el evento global `errorEvent` (logo loading, modal legacy, etc.).
 *
 * @param {import('axios').AxiosError} error Error devuelto por axios.
 * @returns {Promise<never>}
 */
function global_api_error_interceptor(error) {
    const response = error.response
    if (!response) {
        return Promise.reject(error)
    }
    const { status, data } = response
    const skip_validation_toast = Boolean(
        error.config && error.config.skip_global_validation_toast
    )
    const is_validation = is_laravel_validation_payload(status, data)

    if (is_validation && !skip_validation_toast) {
        show_laravel_validation_toast(data)
    } else if (response) {
        document.dispatchEvent(
            new CustomEvent('errorEvent', { detail: error })
        )
    }
    return Promise.reject(error)
}

// Instancia usada como Vue.prototype.$api (prefijo /api)
const apiInstance = axios.create({
    baseURL: process.env.VUE_APP_API_URL + '/api',
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
    baseURL: process.env.VUE_APP_API_URL,
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
//       baseURL: process.env.VUE_APP_API_URL,
//       withCredentials: true
//     })
//   }
// })
// Vue.use({
//   install (Vue) {
//     Vue.prototype.$api = axios.create({
//       baseURL: process.env.VUE_APP_API_URL+'/api',
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

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
