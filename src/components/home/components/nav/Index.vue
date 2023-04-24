<template>
    <div
    class="w-100">
        <mobile></mobile> 
        <div
        class="nav-home"> 
            <b-navbar 
            toggleable="md">
                <b-navbar-brand
                :to="{name: 'home'}">
                    <img src="@/assets/logo.png" alt="">
                </b-navbar-brand>

                <div
                class="d-lg-none">
                    <b-navbar-toggle target="nav-home-mobile">
                        <i class="icon-bars"></i>
                    </b-navbar-toggle>
                </div>

                <b-collapse id="nav-collapse" is-nav> 
                    <div></div>
        			<b-button
                    class="btn-login"
                    :to="{name: 'login'}"
                    variant="primary">
        				Iniciar sesion
        			</b-button>                
                </b-collapse>
            </b-navbar>
        </div>
    </div>
</template>
<script>
export default {
    components: {
        Mobile: () => import('@/components/home/components/nav/Mobile'),
    },
}
</script>
<style lang="sass">
.nav-home 
    display: flex
    flex-direction: row 
    background: #FFF
    height: 100px
    width: 100% 
    .navbar
        width: 100%
        padding: 0
    .navbar-brand
        padding: 0
        img 
            width: 150px

    .navbar-toggler 
        border: none

    .navbar-nav 
        @media screen and (min-width: 768px)
            align-items: center

    .navbar-collapse
        justify-content: space-between

    .btn-login
        padding: 15px
        width: 150px
        border-radius: 50px
        font-size: 1em
</style>