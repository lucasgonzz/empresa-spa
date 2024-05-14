<template>
	<b-card
	v-if="hasExtencion('budgets') && client"
	class="m-b-25 m-t-25 b-r-1 shadow">

		<b-form-checkbox
		:value="1"
		size="lg"
		:disabled="disabled"
		:unchecked-value="0"
		v-model="guardar_como_presupuesto">
			Guardar como PRESUPUESTO
		</b-form-checkbox>

	</b-card>
</template>
<script>
export default {
	computed: {
		guardar_como_presupuesto: {
			set(value) {
				this.$store.commit('vender/setGuardarComoPresupuesto', value)
			},
			get() {
				return this.$store.state.vender.guardar_como_presupuesto
			}
		},
		previus_sale() {
			return this.$store.state.vender.previus_sales.previus_sale
		},
		budget() {
			return this.$store.state.vender.budget
		},
		client() {
			return this.$store.state.vender.client
		},
		disabled() {
			if (this.previus_sale.id || this.budget !== null) {
				return true
			}
			return false
		}
	},
}
</script>