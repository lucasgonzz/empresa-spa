<template>
<div>
	<div 
	class="mobile-nav-header d-md-none">
		<span 
		v-if="selected_route"
		class="route-name">
			{{ routeText(selected_route) }}
		</span>
		<div 
		@click="setShow"
		class="button-toggle">
			<i 
			v-if="!show_nav_mobile"
			class="icon-bars"></i>
			<i 
			v-else
			class="icon-cancel"></i>
		</div>
	</div>

	<div 
	:class="_class"
	class="nav-vertical s-1">

		<slot name="nav_top"></slot>

		<div 
		v-for="(route, i) in routes"
	    v-if="showRoute(route)"
	    :key="i"
	    :class="isActiveRoute(route)"
		class="route apretable"
	    @click="callSetRoute(route)">

	    	<div 
	    	class="menu-trigger">
	    		
	    		<div
	    		class="ruta-principal">

			    	<div>
				    	<span 
				    	class="desplegable"
				    	@click.stop="toggleSubmenu(route)"
				    	v-if="route.childrens">
				    		<i class="icon-down"></i>
				    	</span>
				    	<span
				    	class="route-text">
				    		{{ routeText(route) }}
				    	</span>
			    	</div>

			    	<!-- Contenedor para icono/imagen + badge: el badge va en esquina sin ocupar hueco en el flex -->
			    	<div class="route-icon-badge-wrap">
				    	<i
				    	v-if="route.icon"
				    	:class="get_icon_class(route)"
				    	class="route-icon"></i>
				    	<img 
				    	v-else-if="route.image_url"
				    	class="route-nav-img"
				    	:src="image(route)">

				    	<b-badge
				    	class="route-alert-badge"
				    	variant="danger"
				    	v-if="route.budget_function && get_function_value(route) > 0">
				    		{{ get_function_value(route) }}
				    	</b-badge>
			    	</div>
	    		</div>
				
				<div 
				v-if="route.childrens && openItem === route.name" 
				@mouseenter="cancelHideSubmenu"
				@mouseleave="hideChildrenOnHover(route)"
				class="submenu">
					<div
					v-for="child_route in route.childrens"
	    			v-if="showRoute(child_route)"
					:key="child_route.name"
					class="route apretable"
		    		@click.stop="callSetRoute(child_route)">
						{{ routeText(child_route) }}
					</div>
				</div>

	    	</div>




		</div>
		
		<div 
	    v-b-toggle.download-resources
		class="route apretable">
			<div class="menu-trigger">
				<div class="ruta-principal">
			    	Recursos
			        <img src="@/assets/nuevos-nav-icons/recursos.png" alt="">
				</div>
			</div>
		</div>

		<slot name="nav_bottom"></slot>

		<user-info></user-info>

	</div>

	<download-resources></download-resources>

	<user-config></user-config>

    <update-password></update-password>
</div>
</template>
<script>
import nav from '@/common-vue/mixins/nav'
import routes from '@/router/routes'
import nav_functions from '@/mixins/nav_functions'
export default {
	mixins: [nav, nav_functions],
	components: {
        DownloadResources: () => import('@/common-vue/components/download-resources/Index'),
        UserInfo: () => import('@/common-vue/components/nav-vertical/UserInfo'),
        UserConfig: () => import('@/common-vue/components/nav/UserConfig'),
        UpdatePassword: () => import('@/common-vue/components/nav/UpdatePassword'),
	},
	data() {
		return {
			show_nav_mobile: false,
			openItem: null,
			hideTimeout: null,
		}
	},
	watch: {
		route_name() {
			this.show_nav_mobile = false
		},
	},
	computed: {
		routes() {
			return routes
		},
		_class() {
			let _class = ''
			if (this.show_nav) {
				_class = 'set-container '
			}
			if (this.show_nav_mobile) {
				_class += 'active-mobile-nav'
			}
			return _class
		},
	},
	methods: {
		toggleSubmenu(route) {
			if (this.openItem === route.name) {
				this.openItem = null;
			} else {
				this.openItem = route.name;
			}
		},
		showChildrenOnHover(route) {
			if (!this.is_mobile && route.childrens) {
				this.openItem = route.name;
				clearTimeout(this.hideTimeout); // Limpiar si hay algún timeout esperando cerrar
			}
		},
		hideChildrenOnHover(route) {
			if (!this.is_mobile && route.childrens) {
				this.hideTimeout = setTimeout(() => {
					this.openItem = null;
				}, 100); // un pequeño delay por si el usuario mueve el mouse rápido
			}
		},
		cancelHideSubmenu() {
			clearTimeout(this.hideTimeout);
		},
		get_function_value(route) {
			return this[route.budget_function]()
		},
		callSetRoute(route) {
			if (this.tiene_permiso_para_la_ruta(route)) {
				this.setRoute(route)
				if (this.show_nav_mobile) {
					setTimeout(() => {
						this.show_nav_mobile = false 
					}, 2000)
				}
			} else {
				this.$toast.error('No tiene permiso')
			}
		},
		image(route) {
			return require('@/assets/'+route.image_url) 
		},
		/**
		 * Devuelve la clase de Bootstrap Icons configurada para la ruta.
		 *
		 * @param {Object} route Ruta definida en router/routes.js.
		 * @returns {String}
		 */
		get_icon_class(route) {
			// Fallback preventivo para evitar render vacío si falta icon.
			const icon_name = route && route.icon ? route.icon : 'circle'
			return 'bi bi-' + icon_name
		},
		setShow() {
			console.log('setShow')
			this.show_nav_mobile = !this.show_nav_mobile
		}
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom'
.container-fluid
	@media screen and (min-width: 768px)
		padding-left: 65px !important

.active-mobile-nav
	transform: translateX(0px) !important

.mobile-nav-header
	background: #444 
	display: flex
	flex-direction: row 
	justify-content: space-between
	align-items: center
	padding: 10px 15px
	color: #FFF
	.route-name 
		font-weight: bold
		font-size: 16px

	i 
		font-size: 20px

.toggle-right
	transform: translateX(200px)

.nav-vertical
	display: flex 
	flex-direction: column
	justify-content: flex-start 
	position: fixed
	width: 200px
	height: 100vh
	top: 0
	left: 0
	transition: all .2s
	z-index: 1000
	background: #444
	overflow-y: auto
	-ms-overflow-style: none !important
	scrollbar-width: none !important
	&::-webkit-scrollbar 
		display: none !important

	@media screen and (max-width: 768px)
		transform: translateX(-200px)

	@media screen and (min-width: 768px)
		transform: translateX(-155px)
		&:hover
			transform: translateX(0px)
			& .user-info .item, & .user-info hr  
				opacity: 1

	.route 
		width: 100%
		color: #FFF
		margin: 5px 0
		font-weight: bold
		cursor: pointer
		transition: all .2s
		&:hover 
			background: $blue 
			// border-radius: 0 5px 5px 0
			// span
			// 	transition: all .2s 
			// 	transform: scale(1.2)
			
			img
				transition: all .2s 
				transform: scale(1.5) translateX(-2px)
			.route-icon
				transition: all .2s 
				transform: scale(1.18) translateX(-1px)
		&:active 
			transform: translateX(20px)
		img 
			width: 25px

		/* Área fija del icono para que el badge absoluto no desplace el layout */
		.route-icon-badge-wrap
			position: relative
			flex-shrink: 0
			display: flex
			align-items: center
			justify-content: center
			width: 25px
			min-height: 25px

		.route-nav-img
			display: block

		.route-icon
			font-size: 19px
			width: 25px
			text-align: center

		/* Badge compacto superpuesto en la esquina del icono (no consume espacio en la fila) */
		.route-alert-badge
			position: absolute
			top: -5px
			right: -8px
			min-width: 16px
			height: 16px
			padding: 0 4px
			margin: 0
			display: inline-flex
			align-items: center
			justify-content: center
			font-size: 10px
			font-weight: bold
			line-height: 1
			border-radius: 8px
			box-shadow: 0 0 0 1px rgba(68, 68, 68, 0.9)


	.active-item
		background: $blue 
		color: #FFF





.route 
	.menu-trigger 
		width: 100%
		font-size: 17px
		display: flex 
		flex-direction: column

		.ruta-principal
			display: flex 
			flex-direction: row 
			justify-content: space-between
			align-items: center 
			padding: 8px 10px 8px 20px
			cursor: pointer




	.submenu 
		background: #333
		div 
			padding: 8px 0 8px 40px
			cursor: pointer
			text-align: left
			&:hover 
				background: $blue
        
    
.desplegable
	@media screen and (max-width: 576px)
		padding: 10px 10px 10px 0px
	@media screen and (min-width: 576px)
		padding: 10px 0px 10px 10px
		margin-left: -20px
		margin-right: 15px
	
	// background: red 

</style>
