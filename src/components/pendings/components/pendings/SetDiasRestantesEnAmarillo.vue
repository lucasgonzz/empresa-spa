<template>
	<div class="cont-dias-restantes">
		<span>
			Mostrar en amarillo cuando falten
		</span>
		<b-form-input
		type="number"
		v-model="dias_restantes_en_amarillo"></b-form-input>
		<span>
			dias
		</span>
	</div>
</template>
<script>
export default {
	computed: {
		dias_restantes_en_amarillo: {
			get() {
				return this.$store.state.pending.dias_restantes_en_amarillo
			},
			set(value) {
				this.$store.commit('pending/set_dias_restantes_en_amarillo', value)
			},
		},
	},
}
</script>
<style lang="sass">
.cont-dias-restantes
	display: flex 
	flex-direction: row 
	justify-content: center 
	align-items: center 
	margin-top: 15px 
	margin-left: 15px


	input 
		width: 70px
		margin: 0 5px
</style>