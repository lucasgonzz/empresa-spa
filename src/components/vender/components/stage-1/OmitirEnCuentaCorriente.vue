<template>
	<!-- El `v-if` sobre `client` es el que manda: sin cliente elegido este toggle no existe, asi
	que el paso del tour que lo senala va SIEMPRE despues del paso del cliente. -->
	<div
	v-if="client && !guardar_como_presupuesto"
	data-tour="vender.toggle_omitir_cuenta_corriente"
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
						Sin force_reset, a proposito. La mision 56 pedia pasarlo en true para que
						el checkbox siguiera funcionando en edicion, pero el propio control esta
						deshabilitado cuando se edita una venta guardada (ver `disabled` mas
						abajo): ese caso no existe. Y con force_reset en true se saltearia tambien
						el guard viejo, el que conserva el metodo que el usuario ya habia elegido
						en una venta NUEVA — o sea que el unico efecto real seria pisar una
						seleccion del usuario.
					*/
					this.setDefaultPaymentMethod()
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
