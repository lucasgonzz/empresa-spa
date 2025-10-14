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
    forceTLS: false
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
// Axios
import axios from 'axios'

// ✅ Creamos la instancia $api
const apiInstance = axios.create({
    baseURL: process.env.VUE_APP_API_URL + '/api',
    withCredentials: true
})

// ✅ Interceptor global para $api
apiInstance.interceptors.response.use(
    function(response) {
        return response
    },
    function(error) {
        console.log('ERROR GLOBAL ($api)')
        if (error.response) {
            document.dispatchEvent(
                new CustomEvent('errorEvent', { detail: error })
            )
        }
        return Promise.reject(error)
    }
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
