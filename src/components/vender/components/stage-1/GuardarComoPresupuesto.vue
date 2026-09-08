<template>
	<!-- Igual que el de omitir cuenta corriente: sin extension `budgets` y sin cliente elegido
	este toggle no se dibuja, y el tour saltea el paso solo. -->
	<div
	v-if="hasExtencion('budgets') && client"
	data-tour="vender.toggle_presupuesto"
	class="vender-toggle-row">

		<!-- Toggle estilo iPhone enlazado al computed con setter -->
		<label
		class="vender-toggle"
		:class="{ 'vender-toggle--disabled': disabled }"
		for="toggle-presupuesto">
			<input
			type="checkbox"
			data-testid="venta-guardar-presupuesto"
			id="toggle-presupuesto"
			:disabled="disabled"
			:checked="guardar_como_presupuesto == 1"
			@change="guardar_como_presupuesto = $event.target.checked ? 1 : 0">
			<span class="vender-toggle__track">
				<span class="vender-toggle__thumb"></span>
			</span>
		</label>

		<span
		class="vender-toggle__label"
		id="guardar_como_presupuesto">
			Guardar como presupuesto
		</span>

	</div>
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
