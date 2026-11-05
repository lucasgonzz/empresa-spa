<template>
<div>
	<div 
	class="mobile-nav-header d-md-none">
		<span 
		v-if="selected_route"
		class="route-name">
			{{ routeText(selected_route) }}
		</span>
		<aviso-de-implementacion v-if="!show_nav_mobile" mostrar_texto></aviso-de-implementacion>
		<button
		type="button"
		data-menu-implementacion-movil
		:aria-expanded="String(show_nav_mobile)"
		aria-label="Menú de navegación"
		@click="setShow"
		class="button-toggle">
			<i 
			v-if="!show_nav_mobile"
			class="icon-bars"></i>
			<i 
			v-else
			class="icon-cancel"></i>
		</button>
	</div>

	<div 
	:class="_class"
	class="nav-vertical s-1">

		<slot name="nav_top"></slot>

		<div 
		v-for="(route, i) in routes"
	    v-if="showRoute(route)"
	    :key="i"
	    :class="route_item_class(route)"
	    :data-nav-implementacion="route.name === 'implementacion' ? '' : null"
	    :role="route.name === 'implementacion' ? 'link' : null"
	    :aria-label="route.name === 'implementacion' ? 'Implementación' : null"
	    :tabindex="route.name === 'implementacion' ? tabindex_implementacion : null"
		class="route"
	    @click="callSetRoute(route)"
	    @keydown.enter.self="route.name === 'implementacion' && callSetRoute(route)">

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
						:class="[get_icon_class(route), { 'implementacion-con-aviso': route.name === 'implementacion' && aviso_implementacion }]"
				    	class="route-icon"></i>
				    	<img 
				    	v-else-if="route.image_url"
				    	class="route-nav-img"
				    	:src="image(route)">
						<aviso-de-implementacion
						v-if="route.name === 'implementacion'"
						class="aviso-implementacion-menu"></aviso-de-implementacion>

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
					:class="isActiveRoute(child_route)"
					class="route route--child"
		    		@click.stop="callSetRoute(child_route)">
						{{ routeText(child_route) }}
					</div>
				</div>

	    	</div>




		</div>
		
		<!--
			El ítem «Recursos» (la descarga de catálogos al arrancar) se sacó del menú (decisión de Lucas,
			3/11/2026, programa «Prueba gratuita de 7 días»). El panel <download-resources> de abajo queda
			montado: otras partes lo abren con v-b-toggle.download-resources.
		-->

		<slot name="nav_bottom"></slot>

		<user-info
		@abrir-ruta="callSetRoute"></user-info>

	</div>

	<download-resources></download-resources>

	<user-config v-if="is_admin"></user-config>

    <update-password></update-password>
</div>
</template>
<script>
import nav from '@/common-vue/mixins/nav'
import routes from '@/router/routes'
import nav_functions from '@/mixins/nav_functions'
import { puede_ver_implementacion } from '@/store/implementacion'
export default {
	mixins: [nav, nav_functions],
	components: {
		AvisoDeImplementacion: () => import('@/components/implementacion/BotonAviso'),
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
			const tiene_implementacion = puede_ver_implementacion(this.$store.state.auth)
				&& this.$store.state.implementacion.disponible === true
			return routes.filter(route => route.name !== 'implementacion' || tiene_implementacion)
		},
		aviso_implementacion() {
			return this.$store.getters['implementacion/aviso_pendiente'] && !this.$store.state.implementacion.apertura
		},
		tabindex_implementacion() {
			return this.is_mobile && !this.show_nav_mobile ? -1 : 0
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
		/**
		 * Clases visuales del ítem de menú según ruta activa (incluye hijos).
		 *
		 * @param {Object} route Ruta del menú.
		 * @returns {string}
		 */
		route_item_class(route) {
			if (this.getRouteName(route) == this.route_name) {
				return 'active-item'
			}
			if (route.childrens) {
				let has_active_child = false
				route.childrens.forEach(child_route => {
					if (this.showRoute(child_route) && this.getRouteName(child_route) == this.route_name) {
						has_active_child = true
					}
				})
				if (has_active_child) {
					return 'active-item active-item--parent'
				}
			}
			return ''
		},
		setShow() {
			this.show_nav_mobile = !this.show_nav_mobile
		}
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'

// Tokens visuales del menú lateral
$nav_width: 220px
$nav_collapsed_visible: 56px
$nav_collapsed_offset: $nav_width - $nav_collapsed_visible
$nav_bg: #16181d
$nav_border: rgba(255, 255, 255, 0.06)
$nav_text: rgba(255, 255, 255, 0.72)
$nav_text_muted: rgba(255, 255, 255, 0.5)
$nav_hover_bg: rgba(255, 255, 255, 0.06)
$nav_active_bg: rgba($blue, 0.14)
$nav_item_radius: 8px

.container-fluid
	@media screen and (min-width: 768px)
		padding-left: $nav_collapsed_visible + 15 !important
		padding-right: 15px !important

.active-mobile-nav
	transform: translateX(0px) !important

.mobile-nav-header
	background: $nav_bg
	border-bottom: 1px solid $nav_border
	display: flex
	flex-direction: row
	justify-content: space-between
	align-items: center
	padding: 12px 16px
	color: #ffffff
	.route-name
		font-weight: 600
		font-size: 0.9375rem
		letter-spacing: -0.01em
	i
		font-size: 1.125rem
	.button-toggle
		border: 0
		background: transparent
		color: inherit

.implementacion-con-aviso
	display: none !important

@media (max-width: 767px)
	.nav-vertical:not(.active-mobile-nav) .aviso-implementacion-menu
		display: none

.nav-vertical
	display: flex
	flex-direction: column
	justify-content: flex-start
	position: fixed
	width: $nav_width
	height: 100vh
	top: 0
	left: 0
	transition: transform 0.22s ease, box-shadow 0.22s ease
	z-index: 1000
	background: $nav_bg
	border-right: 1px solid $nav_border
	overflow-y: auto
	overflow-x: hidden
	-ms-overflow-style: none !important
	scrollbar-width: none !important
	font-family: $font-family-sans-serif
	&::-webkit-scrollbar
		display: none !important

	@media screen and (max-width: 768px)
		transform: translateX(-$nav_width)
		box-shadow: none

	@media screen and (min-width: 768px)
		transform: translateX(-$nav_collapsed_offset)
		&:hover
			transform: translateX(0px)
			box-shadow: 4px 0 24px rgba(15, 23, 42, 0.18)
			& .user-info .item, & .user-info hr
				opacity: 1

	.route
		width: calc(100% - 16px)
		margin: 2px 8px
		color: $nav_text
		font-size: 1rem
		font-weight: 500
		line-height: 1.35
		cursor: pointer
		border-radius: $nav_item_radius
		transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease
		&[data-nav-implementacion]
			flex-shrink: 0
			position: sticky
			bottom: 0
			z-index: 1
			background-color: $nav_bg
			&.active-item, &:hover, &:focus-visible
				background-color: $nav_active_bg
		&:hover
			background: $nav_hover_bg
			color: #ffffff
			img
				transform: none
			.route-icon
				transform: none
				color: #ffffff
		&:active
			transform: none
		img
			width: 20px
			height: 20px
			object-fit: contain
			opacity: 0.92

		.route-icon-badge-wrap
			position: relative
			flex-shrink: 0
			display: flex
			align-items: center
			justify-content: center
			width: 22px
			min-height: 22px

		.route-nav-img
			display: block

		.route-icon
			font-size: 1.1rem
			width: 20px
			text-align: center
			color: $nav_text_muted
			transition: color 0.15s ease

		.route-alert-badge
			position: absolute
			top: -6px
			right: -8px
			min-width: 16px
			height: 16px
			padding: 0 4px
			margin: 0
			display: inline-flex
			align-items: center
			justify-content: center
			font-size: 0.625rem
			font-weight: 700
			line-height: 1
			border-radius: 999px
			box-shadow: 0 0 0 2px $nav_bg

	.active-item
		background: $nav_active_bg
		color: #ffffff
		font-weight: 600
		box-shadow: inset 3px 0 0 0 $blue
		.route-icon
			color: $blue

	.active-item--parent
		background: rgba($blue, 0.08)
		box-shadow: inset 3px 0 0 0 rgba($blue, 0.55)

.route
	.menu-trigger
		width: 100%
		display: flex
		flex-direction: column

		.ruta-principal
			display: flex
			flex-direction: row
			justify-content: space-between
			align-items: center
			padding: 10px 12px 10px 14px
			cursor: pointer
			gap: 10px

			> div:first-child
				flex: 1
				display: flex
				align-items: center
				min-width: 0

			.route-text
				flex: 1
				text-align: left
				white-space: nowrap
				overflow: hidden
				text-overflow: ellipsis

	.submenu
		background: transparent
		padding: 2px 0 6px 0
		margin: 0 8px 4px 22px
		border-left: 1px solid rgba(255, 255, 255, 0.08)

		.route--child
			width: 100%
			margin: 2px 0
			padding: 8px 12px 8px 14px
			font-size: 0.8125rem
			font-weight: 500
			color: $nav_text_muted
			text-align: left
			box-shadow: none
			&:hover
				background: $nav_hover_bg
				color: #ffffff
			&.active-item
				background: $nav_active_bg
				color: #ffffff
				font-weight: 600
				box-shadow: inset 2px 0 0 0 $blue

.desplegable
	display: inline-flex
	align-items: center
	justify-content: center
	width: 20px
	height: 20px
	margin-right: 2px
	margin-left: -4px
	border-radius: 4px
	color: $nav_text_muted
	transition: background 0.15s ease, color 0.15s ease
	&:hover
		background: rgba(255, 255, 255, 0.08)
		color: #ffffff
	i
		font-size: 0.6875rem

</style>
