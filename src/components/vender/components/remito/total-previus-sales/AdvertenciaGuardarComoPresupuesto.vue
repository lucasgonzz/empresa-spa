<template>
	<b-col
	v-if="guardar_como_presupuesto"
	cols="12"
	class="check-sale">
		<h2>
			Presupuesto
		</h2>
	</b-col>
</template>
<script>
export default {
	computed: {
		guardar_como_presupuesto() {
			return this.$store.state.vender.guardar_como_presupuesto
		},
	},
}
</script>