<template>
	<b-col
	v-if="guardar_cuenta_corriente"
	cols="12"
	class="check-sale">
		<h2>
			A Cuenta Corriente
		</h2>
	</b-col>
</template>
<script>
export default {
	computed: {
		guardar_cuenta_corriente() {
			if (
				this.$store.state.vender.client
				&& this.$store.state.vender.omitir_en_cuenta_corriente == 0
				&& this.$store.state.vender.budget === null
				&& !this.$store.state.vender.guardar_como_presupuesto
			) {
				return true
			}
			return false
		},
	},
}
</script>