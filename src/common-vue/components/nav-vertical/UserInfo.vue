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
	    v-if="is_owner">
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
export default {
	mixins: [nav],
	methods: {
		general() {
			this.$bvModal.show('user')
		}
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom'
.user-info
	color: #FFF
	hr 
		background: #FFF
		opacity: 0
	.item 
		display: flex 
		flex-direction: row 
		align-items: center 
		justify-content: flex-start 
		opacity: 0
		padding: 7px 0
		font-size: 13px
		cursor: pointer
		&:hover 
			background: $blue 
		i 
			padding: 0 10px 0 20px
	
	.item-title 
		text-align: left
		font-size: 13px
		padding: 10px 20px
		margin: 0
		font-weight: bold
</style>