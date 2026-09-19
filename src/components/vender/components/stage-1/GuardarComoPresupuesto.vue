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
import omitir_en_cuenta_corriente from '@/mixins/vender/omitir_en_cuenta_corriente'
import default_payment_method from '@/mixins/vender/default_payment_method'
export default {
	mixins: [omitir_en_cuenta_corriente, default_payment_method],
	computed: {
		guardar_como_presupuesto: {
			set(value) {
				this.$store.commit('vender/setGuardarComoPresupuesto', value)

				/*
					🔴 Un presupuesto va SIEMPRE a la cuenta corriente del cliente (decision de Lucas,
					18/9/2026; el back lo fija igual: BudgetController guarda 0 y saveSale() escribe
					0). Al prender el toggle, "omitir en cuenta corriente" se apaga y el cobro queda
					bloqueado como en cualquier venta a cuenta corriente (metodo de pago y caja en
					0), que es lo que hace el propio toggle de omitir al apagarse. Antes el toggle de
					omitir se escondia y el 1 que tuviera viajaba igual en el presupuesto.

					Al apagarlo vuelve a ser una venta: se re-aplica el default del comercio
					(siempre_omitir_en_cuenta_corriente) y, si el default es omitir, el metodo de
					pago por defecto, igual que al entrar a Vender.
				*/
				if (value == 1) {
					if (this.$store.state.vender.omitir_en_cuenta_corriente == 1) {
						this.$store.commit('vender/set_omitir_en_cuenta_corriente', 0)
						this.bloquear_metodo_de_pago()
						this.bloquear_caja()
					}
				} else {
					this.set_omitir_en_cuenta_corriente(true)

					if (this.$store.state.vender.omitir_en_cuenta_corriente == 1) {
						this.setDefaultPaymentMethod()
					}
				}
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
