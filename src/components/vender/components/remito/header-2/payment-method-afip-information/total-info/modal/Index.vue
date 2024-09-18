<template>
	<b-modal
	title="Resumen"
	hide-footer
	id="total-info">

		<div 
		v-for="payment_method in selected_payment_methods"
		class="">
			<h5>
				{{ payment_method.name }}
			</h5>
			<p>
				Monto: {{ price(payment_method.amount) }}
			</p>
			<p
			v-if="payment_method.monto_descuento">
				Descuento: {{ price(payment_method.monto_descuento) }}
			</p>

			<div
			v-if="payment_method.id == 5">
				
				<cuota-info></cuota-info>
				
			</div>


			<hr>
		</div>

		<div
		v-if="payment_method_id == 5">
			
			<cuota-info></cuota-info>
		</div>

	</b-modal>
</template>
<script>
export default {
	components: {
		CuotaInfo: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/total-info/modal/CuotasInfo'),
	},
	computed: {
		payment_method_id() {
			return this.$store.state.vender.current_acount_payment_method_id
		},
		selected_payment_methods() {
			return this.$store.state.vender.selected_payment_methods
		},
		cuota_monto_descuento() {
			return this.$store.state.vender.cuota_monto_descuento
		},
		cuota_monto_recargo() {
			return this.$store.state.vender.cuota_monto_recargo
		},
		cantidad_cuotas() {
			return this.$store.state.vender.cantidad_cuotas
		},
		monto_credito() {
			return this.$store.state.vender.monto_credito
		},
		valor_cuota() {
			if (!this.monto_credito || !this.cantidad_cuotas) {
				return null
			}
			return this.monto_credito / this.cantidad_cuotas
		}
	}
}
</script>