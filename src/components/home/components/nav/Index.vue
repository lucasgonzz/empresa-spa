<template>
    <div
    class="w-100">
        <mobile></mobile> 
        <div
        :class="scroll_bottom ? 'nav-scroll' : ''"
        class="nav-home"> 
            <b-navbar 
            toggleable="md">
                <b-navbar-brand
                :to="{name: 'home'}">
                    <img src="@/assets/logo.png" alt="">
                </b-navbar-brand>

                <scroll-buttons
                class="d-none d-lg-flex"></scroll-buttons>

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
        ScrollButtons: () => import('@/components/home/components/nav/ScrollButtons'),
        Mobile: () => import('@/components/home/components/nav/Mobile'),
    },
    data() {
        return {
            scroll: 0,
            scroll_bottom: false,
        }
    },
    created() {
        window.addEventListener('scroll', () => {
            if (this.scroll < window.scrollY) {
                if (window.scrollY >= 100) {
                    this.scroll_bottom = true
                }
            } else {
                if (window.scrollY <= 400) {
                    this.scroll_bottom = false
                }
            } 
            this.scroll = window.scrollY
        })
    },
}
</script>
<style lang="sass">
@import "@/sass/_custom"
.nav-scroll 
    background: darken($blue, 10) 
    height: 80px !important
    // .scroll-button
    //     color: #000 !important
    // i 
    //     color: #000 !important
    .navbar-brand
        background: #fefefe
        border-radius: 5px
        padding: 5px 0

    .btn-login
        background: none
        border: 2px solid #FFF
        &:hover 
            background: #FFF
            color: $blue

.nav-home 
    transition: all .4s
    display: flex
    flex-direction: row 
    height: 100px
    width: 100% 
    position: fixed 
    left: 0
    top: 0
    z-index: 500
    @media screen and (max-width: 768px) 
        padding: 0 30px
    @media screen and (min-width: 768px) 
        padding: 0 100px
    
    .navbar
        width: 100%
        padding: 0

    .navbar-brand
        padding: 0
        img 
            width: 150px

    .navbar-toggler 
        border: none
        i 
            color: #FFF
            font-size: 25px

    .navbar-nav 
        @media screen and (min-width: 768px)
            align-items: center

    .navbar-collapse
        justify-content: space-between

    .btn-login
        padding: 10px 15px
        width: 150px
        border-radius: 7px
        font-size: 1em
</style>