<template>
	<div class="cont-dias-restantes align-center j-start">
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
	// display: flex 
	// flex-direction: row 

	input 
		width: 70px
		margin: 0 5px
</style>