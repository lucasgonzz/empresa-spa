
import dates from '@/common-vue/mixins/dates'
import generals from '@/common-vue/mixins/generals'
import images from '@/common-vue/mixins/images'
import update_app from '@/common-vue/mixins/update_app'
import permissions from '@/common-vue/mixins/permissions'
import display from '@/common-vue/mixins/display'
import model_functions from '@/common-vue/mixins/model_functions'
import broadcast from '@/common-vue/mixins/broadcast'
import _model_functions from '@/mixins/model_functions'
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
    ],
    methods: {
        redirectIfWww() {
            if (location.href.indexOf("www.") > -1) {
                console.log('tiene www')
                location.replace(process.env.VUE_APP_APP_URL);
            }
        },
        async callMethods() {
            this.$store.commit('download_resources/setVisibility')
            setTimeout(() => {
                this.$store.commit('download_resources/setVisibility')
            }, 4000)
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