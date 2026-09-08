<template>
<b-sidebar
id="nav-mobile" 
shadow>

	<nav-items
	:routes="routes"></nav-items>

    <div
	v-if="is_owner"
    class="nav-item apretable"
    @click="toConfiguration">
    	<a
    	class="nav-link">
    		Configuracion
    	</a>
    </div>
    <div
    v-if="authenticated"
    class="nav-item apretable"
    @click="logout">
    	<a
    	class="nav-link">
    		Cerrar sesion
    	</a>
    </div>
    <div
    v-else
    class="nav-item apretable"
    @click="setRoute({name: 'login'})">
    	<a
    	class="nav-link">
        	Iniciar Sesion
    	</a>
    </div>
    
</b-sidebar>
</template>
<script>
import NavItems from '@/common-vue/components/nav/NavItems'
import routes from '@/router/routes'

import nav from '@/common-vue/mixins/nav'
export default {
	mixins: [nav],
	computed: {
		routes() {
			return routes
		},
	},
	components: {
		NavItems,
	},
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'
#nav-mobile
	// 7/9/2026: aca habia un `@if ($theme == 'dark') { background: #333 !important }`. Se BORRO.
	//
	// Nunca compilo ($theme es una variable de COMPILACION fijada en 'light' en _custom.scss), y
	// tampoco hace falta reponerlo: el menu de telefono es un b-sidebar, y _dark_theme.sass ya
	// declara `.b-sidebar { background-color: var(--bg-card); color: var(--color-text-primary) }`.
	// Al no quedar ningun background propio en este id, el tema es el que manda y no hay dos
	// arreglos para lo mismo.
	img 
		width: 50px
	button
		box-shadow: none
	a 
		text-align: left
		padding-left: 2em
	.active-item
		.nav-link 
			color: #FFF !important
			background: $blue !important
</style>