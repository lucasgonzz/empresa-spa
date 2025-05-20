<template>
<div>
	<div 
	class="mobile-nav-header d-md-none">
		<span class="route-name">
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
	    	<span>
	    		{{ routeText(route) }}
	    	</span>
	    	<img 
	    	v-if="route.image_url"
	    	:src="image(route)">

	    	<b-badge
	    	variant="danger"
	    	v-if="route.budget_function && get_function_value(route) > 0">
	    		{{ get_function_value(route) }}
	    	</b-badge>
		</div>

		<slot name="nav_bottom"></slot>

		<div 
	    v-b-toggle.download-resources
		class="route apretable">
	    	Recursos
	        <img src="@/assets/nuevos-nav-icons/recursos.png" alt="">
		</div>

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
		get_function_value(route) {
			return this[route.budget_function]()
		},
		callSetRoute(route) {
			this.setRoute(route)
			if (this.show_nav_mobile) {
				setTimeout(() => {
					this.show_nav_mobile = false 
				}, 2000)
			}
		},
		image(route) {
			return require('@/assets/'+route.image_url) 
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
		font-size: 17px
		display: flex 
		flex-direction: row 
		justify-content: space-between
		align-items: center 
		padding: 8px 10px 8px 20px
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
				transform: scale(1.7) translateX(-2px)
		&:active 
			transform: translateX(20px)
		img 
			width: 25px


		.badge 
			width: 35px
			height: 35px
			margin-right: 1.5px
			display: flex 
			align-items: center 
			justify-content: center
			font-size: 17px


	.active-item
		background: $blue 
		color: #FFF

</style>
