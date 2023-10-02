<template>
<div
v-if="show_nav">
	<div 
	:class="_class"
	class="nav-vertical s-1">
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
		<div 
		v-for="(route, i) in routes"
	    v-if="showRoute(route)"
	    :key="i"
	    :class="isActiveRoute(route)"
		class="route apretable"
	    @click="setRoute(route)">
	    	{{ routeText(route) }}
	    	<img 
	    	v-if="route.image_url"
	    	:src="image(route)">
		</div>

		<div 
	    v-b-toggle.download-resources
		class="route apretable">
	    	Recursos
	        <img src="@/assets/nav-icons/download.png" alt="">
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
export default {
	mixins: [nav],
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
		image(route) {
			return require('@/assets/'+route.image_url) 
		},
		setShow() {
			this.show_nav_mobile = !this.show_nav_mobile
		}
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom'
.container-fluid
	@media screen and (max-width: 768px)
		padding-top: 30px !important
	@media screen and (min-width: 768px)
		padding-left: 65px !important

.active-mobile-nav
	transform: translateX(0px) !important

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
	// overflow-y: auto
	&::-webkit-scrollbar 
		display: none

	@media screen and (max-width: 768px)
		transform: translateX(-200px)

	@media screen and (min-width: 768px)
		transform: translateX(-150px)
		&:hover
			transform: translateX(0px)
			& .user-info .item, & .user-info hr  
				opacity: 1

	.button-toggle
		@media screen and (max-width: 768px)
			position: absolute
			right: -44px
			border-radius: 0 0 5px 0
			padding: 0 7px
			top: 0
			color: #FFF
			font-size: 25px
			background: #444
		@media screen and (min-width: 768px)
			display: none 

	.route 
		width: 100%
		font-size: 17px
		display: flex 
		flex-direction: row 
		justify-content: space-between
		align-items: center 
		padding: 8px 5px 8px 20px
		color: #FFF
		margin: 0
		font-weight: bold
		cursor: pointer
		transition: all .2s
		&:hover 
			background: $blue 
			// color: #444
			transform: scale(1.1, 1)
			border-radius: 0 5px 5px 0
		&:active 
			transform: translateX(20px)
		img 
			width: 40px

	.active-item
		background: $blue 
		color: #FFF

</style>
