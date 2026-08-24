
import dates from '@/common-vue/mixins/dates'
import generals from '@/common-vue/mixins/generals'
import images from '@/common-vue/mixins/images'
import update_app from '@/common-vue/mixins/update_app'
import permissions from '@/common-vue/mixins/permissions'
import display from '@/common-vue/mixins/display'
import model_functions from '@/common-vue/mixins/model_functions'
import broadcast from '@/common-vue/mixins/broadcast'
import _model_functions from '@/mixins/model_functions'
import route_functions from '@/mixins/route_functions'
export default {
    mixins: [
        generals,
        dates,
        images,
        update_app,
        permissions,
        display,
        model_functions,
        broadcast,
        _model_functions,
        route_functions,
    ],
    methods: {
        redirectIfWww() {
            if (location.href.indexOf("www.") > -1) {
                console.log('tiene www')
                location.replace(process.env.VUE_APP_APP_URL);
            }
        },
        async callMethods() {
            /*
                Aca se abria solo el panel lateral de recursos y se lo cerraba a los 4 segundos,
                en cada login. Se saco por tres motivos:

                - La puerta al panel es la tarjeta de progreso de arriba a la derecha: se clickea
                  y se despliega. El panel abriendose solo tapaba JUSTO esa tarjeta durante los
                  primeros 4 segundos, que es cuando la descarga esta en curso y el detalle es lo
                  unico que interesa mirar.
                - setVisibility es un toggle contra un temporizador: si el usuario cerraba el
                  panel a mano dentro de esos 4 segundos, el timer se lo volvia a abrir.
                - El aviso de que la descarga esta corriendo ya lo da la tarjeta, sin comerse
                  360px de pantalla apenas entras al sistema.
            */
            if (this.has_extra_config) {
                for (var i = this.extra_config.length - 1; i >= 0; i--) {
                    await this.$store.dispatch(this.extra_config[i]+'/getModels')
                }
            }
        },
        updateMessage(message) {
            if (!this.there_is_update) {
                this.$store.commit('auth/setMessage', message)
            }
        },
    }
}