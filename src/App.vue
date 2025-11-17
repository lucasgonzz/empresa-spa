<template>
    <div id="app">

        <!-- Comentario de prueba Leonardo -->
        
        <error-modal></error-modal>
        <logo-loading></logo-loading>
        <nav-component></nav-component>
        <btn-scroll-top></btn-scroll-top>
        <afip-reenviar-facturas></afip-reenviar-facturas>
        <articles-stock-minimo></articles-stock-minimo>

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
import check_version from '@/mixins/check_version'
import offline from '@/offline/index'
export default {
    mixins: [app, start_methods, broadcast, check_version, offline],
    components: {
        ErrorModal,
        LogoLoading, 
        NavComponent,
        BtnScrollTop,
        PaymentExpire: () => import('@/components/nav/PaymentExpire'),
        AfipReenviarFacturas: () => import('@/components/common/afip-reenviar-facturas/Index'),
        ArticlesStockMinimo: () => import('@/components/common/ArticlesStockMinimo'),
    },
    created() {
        this.$store.dispatch('auth/me')
    },
    watch: {
        authenticated() {
            console.log('watch de authenticateds')
            if (!this.authenticated) {
                this.$router.replace({name: 'home'})
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
