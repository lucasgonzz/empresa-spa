<template>
	<div
	class="vuelto-efectivo card m-b-10"
	v-if="monto_efectivo > 0">
		
		<h5>
			Calcular vuelto ({{ price(monto_efectivo) }})
		</h5>

		<b-input-group
		prepend="Pago del cliente">
			<b-form-input
			@keyup.enter="calcular_vuelto"
			v-model="pago_del_cliente"
			type="number"
			placeholder="Pago del cliente"></b-form-input>
		</b-input-group>

		<p 
		v-if="vuelto > 0"
		class="vuelto">
			Vuelto: <span class="text-success">{{ price(vuelto) }}</span>
		</p>
	</div>
</template>
<script>
export default {
	computed: {
		total() {
			return this.$store.state.vender.total 
		},
		client() {
			return this.$store.state.vender.client 
		},
		omitir_en_cuenta_corriente() {
			return this.$store.state.vender.omitir_en_cuenta_corriente 
		},
		paga_con_efectivo() {

			if (this.total <= 0) {
				return false
			}

		},
		monto_efectivo() {

			if (this.client && !this.omitir_en_cuenta_corriente) {
				return 0
			}

			if (this.payment_method_id != 0) {

				if (this.payment_method_id == 3) {

					return this.total  
				}
			}

			let efectivo = this.selected_payment_methods.find(payment_method => {
				return payment_method.id == 3 
			})
 
			if (typeof efectivo != 'undefined') {

				return efectivo.amount
			}

			return 0
		},
		payment_method_id() {
			return this.$store.state.vender.current_acount_payment_method_id
		},
		selected_payment_methods() {
			return this.$store.state.vender.selected_payment_methods
		},
	},
	watch: {
		total() {

			this.pago_del_cliente = ''
			this.vuelto = ''
		},
	},
	data() {
		return {
			pago_del_cliente: '',
			vuelto: '',
		}
	},
	methods: {
		calcular_vuelto() {
			let vuelto = Number(this.pago_del_cliente) - Number(this.monto_efectivo)

			if (vuelto > 0) {
				this.vuelto = vuelto
			} else {
				this.$toast.error('Dinero insuficiente')
			}
		}
	}
}
</script>
<style lang="sass">
.vuelto-efectivo
	width: 300px
	// margin: auto
	margin-right: 15px 
	padding: 15px

	.vuelto
		font-weight: bold 
		font-size: 20px
		margin: 15px 0 0
</style>