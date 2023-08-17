<template>
    <div
    v-if="show"
    class="nav-component">
        <btn-scroll-top></btn-scroll-top>
        <b-navbar 
        toggleable="lg">
            <div>
                <b-navbar-brand
                :to="{name: route_index}">
                    <img src="@/assets/logo.png" alt="">
                </b-navbar-brand>

                <b-button
                class="m-r-10"
                size="sm"
                variant="outline-primary"
                v-b-toggle.download-resources>
                    <i class="icon-download"></i>
                </b-button>
            </div>

            <div
            v-if="is_mobile"
            class="cont-bars d-lg-none">
                <help-dropdown></help-dropdown>
                <slot name="right_dropdown"></slot>

                <b-navbar-toggle target="nav-mobile">
                    <i class="icon-bars"></i>
                </b-navbar-toggle>
            </div>

            <b-collapse id="nav-collapse" is-nav> 

                <slot name="nav_items">
                    <nav-items></nav-items>
                </slot>

                <b-navbar-nav 
                class="ml-auto">

                    <slot name="right_dropdown"></slot>
                    <help-dropdown></help-dropdown>

                    <b-nav-item-dropdown 
                    v-if="authenticated"
                    right>
                        <template #button-content>
                            {{ user.name }}
                        </template>
                        <configuration-dropdown></configuration-dropdown>
                        <!-- <b-dropdown-item 
                        v-if="is_owner"
                        v-b-modal="'user'">
                            <i class="icon-configuration"></i>
                            Configuracion
                        </b-dropdown-item> -->

                        <b-dropdown-divider
                        v-if="is_owner"></b-dropdown-divider>

                        <slot name="nav_dropdown"></slot>

                        <b-dropdown-item 
                        @click="logout">
                            <i class="icon-logout"></i>
                            Cerrar sesion
                        </b-dropdown-item>
                    </b-nav-item-dropdown>
                    <b-button
                    :to="{name: 'login'}"
                    variant="link"
                    v-else>
                        Iniciar Sesion
                    </b-button>

                </b-navbar-nav>
            </b-collapse>
        </b-navbar>
        <mobile></mobile>

        <download-resources></download-resources>

        <update-models></update-models>

        <user-config></user-config>

        <update-password></update-password>

    </div>
</template>
<script>
import nav from '@/common-vue/mixins/nav'
export default {
    mixins: [nav],
    components: {
        Mobile: () => import('@/common-vue/components/nav/Mobile'),
        DownloadResources: () => import('@/common-vue/components/download-resources/Index'),
        NavItems: () => import('@/common-vue/components/nav/NavItems'),
        UpdateModels: () => import('@/common-vue/components/UpdateModels'),
        HelpDropdown: () => import('@/common-vue/components/nav/HelpDropdown'),
        UserConfig: () => import('@/common-vue/components/nav/UserConfig'),
        ConfigurationDropdown: () => import('@/common-vue/components/nav/ConfigurationDropdown'),
        UpdatePassword: () => import('@/common-vue/components/nav/UpdatePassword'),
        BtnScrollTop: () => import('@/common-vue/components/nav/BtnScrollTop'),
    },
    computed: {
        show() {
            return this.authenticated && this.route_name != 'login' && this.route_name != 'passwordReset'
        }
    }
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'
$background: ''
$color: ''
@if ($nav_theme == dark) 
    $background: #343a40
    $color: #FFF
@else if ($nav_theme == ligth) 
    $background: #FFF
    $color: #000

.nav-component
    .cont-bars
        display: flex
        .help-dropdown 
            // margin-top: -23px
            list-style: none
    .navbar 
        background: #FFF
        height: 60px
        padding: 0 1em !important
        background: $background
        box-shadow: rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px

        .navbar-brand
            padding: 0
            img 
                width: 50px

        .navbar-toggler 
            border: none
            color: $color !important

        .navbar-nav 
            @media screen and (min-width: 768px)
                align-items: center

        .navbar-collapse
            justify-content: space-between

        .nav-item 
            .nav-link
                background: none
                color: lighten($color, 50) !important
                @media screen and (max-width: 768px)
                    text-align: left !important
                    padding: .5em 1.5em
                @media screen and (max-width: 1200px)
                    font-size: 12px
                @media screen and (min-width: 1200px)
                    font-size: 14px
            &:hover
                .nav-link 
                    font-weight: bold
        .active-item
            .nav-link 
                @media screen and (max-width: 768px)
                    color: $color !important
                    background: $blue !important
                @media screen and (min-width: 768px)
                    color: $blue !important
                    // font-size: 1.2em
                    font-weight: bold
        .dropdown 
            a 
                color: rgba(0,0,0,.7)
</style>