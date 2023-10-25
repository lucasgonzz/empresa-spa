<template>
    <div id="app">
        <error-modal></error-modal>
        <logo-loading></logo-loading>
        <nav-component></nav-component>
        <btn-scroll-top></btn-scroll-top>
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

import app from '@/common-vue/mixins/app'
import start_methods from '@/mixins/start_methods'
import broadcast from '@/mixins/broadcast'
export default {
    mixins: [app, start_methods, broadcast],
    components: {
        ErrorModal,
        LogoLoading, 
        NavComponent,
        BtnScrollTop,
        PaymentExpire: () => import('@/components/nav/PaymentExpire'),
    },
    created() {
        this.$store.dispatch('auth/me')
        // .then(() => {
        //     setTimeout(() => {
        //         if (!this.authenticated) {
        //             console.log(12333333333)
        //             if (this.route_name != 'login' && !this.use_home_page) {
        //                 this.$router.replace({name: 'login'})
        //             } else if (this.route_name != 'login' && this.route_name != 'home') {
        //                 console.log('VA POR ACA')
        //                 this.$router.replace({name: 'home'})
        //             }
        //         }
        //     }, 500)
        // })
    },
    watch: {
        authenticated() {
            console.log('watch de authenticated')
            if (!this.authenticated) {
                this.$router.replace({name: 'home'})
            } else {
                this.checkPermissionForCurrentRoute()
                this.callMethods()
                this.listenChannels()
                this.listenChannelsLocal()
                this.startMethods()
            }
        }
    },
}
</script>
<style lang="sass">
@import "./sass/fonts/styles.css"
@import '@/common-vue/sass/app.sass'
@import '@/sass/_custom.scss'

</style>
