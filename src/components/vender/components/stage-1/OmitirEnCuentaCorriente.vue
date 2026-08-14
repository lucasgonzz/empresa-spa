<template>
	<div
	v-if="client && !guardar_como_presupuesto"
	class="vender-toggle-row">

		<!-- Toggle estilo iPhone enlazado al computed con setter -->
		<label
		class="vender-toggle"
		:class="{ 'vender-toggle--disabled': disabled }"
		for="toggle-omitir-cc">
			<input
			type="checkbox"
			id="toggle-omitir-cc"
			:disabled="disabled"
			:checked="omitir_en_cuenta_corriente == 1"
			@change="omitir_en_cuenta_corriente = $event.target.checked ? 1 : 0">
			<span class="vender-toggle__track">
				<span class="vender-toggle__thumb"></span>
			</span>
		</label>

		<span
		class="vender-toggle__label"
		id="omitir_en_cuenta_corriente">
			{{ text }}
		</span>

	</div>
</template>
<script>
import default_payment_method from '@/mixins/vender/default_payment_method'
export default {
	mixins: [default_payment_method],
	computed: {
		text() {
			if (this.owner.text_omitir_cc) {
				return this.owner.text_omitir_cc
			}
			return 'Omitir cuenta corriente'
		},
		omitir_en_cuenta_corriente: {
			set(value) {
				this.$store.commit('vender/set_omitir_en_cuenta_corriente', value)
				if (value == 1) {
					/*
						force_reset en true porque esto es el usuario tocando el checkbox, no un
						default del comercio: tiene que asignar el metodo de pago tambien cuando
						se esta editando una venta guardada, donde los defaults automaticos estan
						frenados a proposito.
					*/
					this.setDefaultPaymentMethod(true)
				} else {

					this.bloquear_metodo_de_pago()
					this.bloquear_caja()
					
				}
			},
			get() {
				return this.$store.state.vender.omitir_en_cuenta_corriente
			}
		},
		previus_sale() {
			return this.$store.state.vender.previus_sales.previus_sale
		},
		budget() {
			return this.$store.state.vender.budget
		},
		guardar_como_presupuesto() {
			return this.$store.state.vender.guardar_como_presupuesto
		},
		client() {
			return this.$store.state.vender.client
		},
		editando_venta_previa() {
			return this.$store.getters['vender/previus_sales/editando_venta_previa']
		},
		disabled() {
			// if (this.budget !== null) {
			// // if (this.previus_sale.id || this.budget !== null) {
			// 	return true
			// }
			if (this.editando_venta_previa) {
			// if (this.previus_sale.id || this.budget !== null) {
				return true
			}
			return false
		}
	},
}
</script>
