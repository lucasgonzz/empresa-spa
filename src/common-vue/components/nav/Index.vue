<template>
    <div
    v-if="show"
    class="nav-component">
        <b-navbar 
        toggleable="md">
            <b-navbar-brand
            :to="{name: route_index}">
                <img src="@/assets/logo.png" alt="">
            </b-navbar-brand>

            <div
            class="d-lg-none">
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
                        <b-dropdown-item 
                        v-if="is_owner"
                        @click="toConfiguration">
                            <i class="icon-configuration"></i>
                            Configuracion
                        </b-dropdown-item>
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

        <update-models></update-models>

    </div>
</template>
<script>
import nav from '@/common-vue/mixins/nav'
export default {
    mixins: [nav],
    components: {
        Mobile: () => import('@/common-vue/components/nav/Mobile'),
        NavItems: () => import('@/common-vue/components/nav/NavItems'),
        UpdateModels: () => import('@/common-vue/components/UpdateModels'),
        HelpDropdown: () => import('@/common-vue/components/nav/HelpDropdown'),
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
                    font-size: 1.2em
                    font-weight: bold
        .dropdown 
            a 
                color: rgba(0,0,0,.7)
</style>