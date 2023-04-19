<template>
    <div
    class="nav-home al-borde">
        <b-navbar 
        toggleable="md">
            <b-navbar-brand
            :to="{name: 'home'}">
                <img src="@/assets/logo.png" alt="">
            </b-navbar-brand>

            <div
            class="d-lg-none">
                <b-navbar-toggle target="nav-mobile">
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
</template>
<style lang="sass">
.nav-home 
    display: flex
    flex-direction: row 
    // width: 100%
    // justify-content: space-between
    background: #FFF
    height: 100px
    // padding: 0 1em !important
    // box-shadow: rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px
    .navbar
        width: 100%
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