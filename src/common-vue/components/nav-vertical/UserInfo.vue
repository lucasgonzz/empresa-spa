<template>
	<div
	class="user-info">
		<hr>
		<div 
		class="item">
			<i class="icon-user"></i>
			{{ user.name }}
		</div>

		<div 
		@click="logout"
		class="item">
			<i class="icon-logout"></i>
			Cerrar sesion
		</div>
		
	    <div
	    v-if="is_owner || user.admin_access">
			<p 
			class="item-title">
				<i class="icon-down"></i>
				Configuración	
			</p>
	        <div
	        class="item"
	        @click="general">
	            <i class="icon-configuration"></i>
	            General
	        </div>
	        <div
	        v-if="has_extra_config">
	            <div
	            class="item"
	            v-for="config_model_name in extra_config"
	            @click="setConfig(config_model_name)">
	                <i class="icon-configuration"></i>
	                {{ singular(config_model_name) }}
	            </div>
	        </div>
	        <div
	        class="item"
	        v-b-modal="'update-password'">
	            <i class="icon-redo"></i>
	            Cambiar contraseña
	        </div>
	    </div>
	</div>
</template>
<script>
import nav from '@/common-vue/mixins/nav'

/**
 * Bloque inferior del menú lateral: usuario, logout y accesos de configuración.
 */
export default {
	mixins: [nav],
	methods: {
		/**
		 * Abre el modal de configuración general del usuario.
		 *
		 * @returns {void}
		 */
		general() {
			this.$bvModal.show('user')
		},
	},
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'

$nav_border: rgba(255, 255, 255, 0.06)
$nav_text: rgba(255, 255, 255, 0.72)
$nav_text_muted: rgba(255, 255, 255, 0.5)
$nav_hover_bg: rgba(255, 255, 255, 0.06)
$nav_item_radius: 8px

.user-info
	color: $nav_text
	padding: 8px 8px 16px
	font-family: $font-family-sans-serif
	hr
		background: $nav_border
		opacity: 1
		margin: 8px 12px 10px
	.item
		display: flex
		flex-direction: row
		align-items: center
		justify-content: flex-start
		margin: 2px 0
		padding: 9px 12px 9px 14px
		font-size: 0.8125rem
		font-weight: 500
		line-height: 1.35
		border-radius: $nav_item_radius
		cursor: pointer
		transition: background 0.15s ease, color 0.15s ease
		&:hover
			background: $nav_hover_bg
			color: #ffffff
		i
			width: 22px
			padding: 0
			margin-right: 10px
			text-align: center
			font-size: 0.9375rem
			color: $nav_text_muted
		@media screen and (min-width: 768px)
			opacity: 0
	.item-title
		text-align: left
		font-size: 0.6875rem
		font-weight: 600
		letter-spacing: 0.06em
		text-transform: uppercase
		color: $nav_text_muted
		padding: 12px 14px 6px
		margin: 0
		i
			display: none
</style>
