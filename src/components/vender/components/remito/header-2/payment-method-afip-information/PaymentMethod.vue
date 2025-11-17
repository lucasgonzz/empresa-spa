<template>
	<b-input-group
	class="cont-payment-methods">
		
		<b-form-select
		:disabled="disabled"
		id="vender_payment_method_id"
		v-model="current_acount_payment_method_id"
		@change="set_payment_methods_null"
		:options="getOptions({key: 'current_acount_payment_method_id', text: 'Metodo de pago'})">
		</b-form-select>

		<template #append>

			<!-- Boton para metodoS de pago -->
			<b-button
			:disabled="disabled" 
			variant="success"
			id="btn_set_payment_methods"
			@click="set_payment_methods">
				<b-badge
				variant="primary"
				v-if="selected_payment_methods.length">
					{{ selected_payment_methods.length }}
				</b-badge>
				<i 
				v-else
				class="icon-plus"></i>
			</b-button>


			<total-info></total-info>

		</template>
	</b-input-group>
</template>
<script>
// import vender from '@/mixins/vender'
import select_payment_methods from '@/mixins/vender/select_payment_methods'
export default {
	mixins: [select_payment_methods],
	components: {
		TotalInfo: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/total-info/Index'),
	},
	computed: {
		current_acount_payment_method_id: {
			get(){
				return this.$store.state.vender.current_acount_payment_method_id
			},
			set(value) {
				this.$store.commit('vender/setCurrentAcountPaymentMethodId', value)
			},
		},
		disabled() {
			if (this.client && !this.omitir_en_cuenta_corriente) {
				return true 
			}
			return false
		},
		selected_payment_methods() {
			return this.$store.state.vender.selected_payment_methods
		},
		payment_methods_seteados() {

			let seteados = false 

			this.selected_payment_methods.forEach(payment_method => {

				if (payment_method.amount) {

					seteados = true 
				}
			})

			return seteados
		},
	},
	methods: {
		set_payment_methods() {

			if (this.sobrante_a_repartir != 0) {

				this.$store.commit('vender/setCurrentAcountPaymentMethodId', 0)

				this.$store.commit('vender/current_acount_payment_methods/set_payment_methods', [])

				this.$store.commit('vender/current_acount_payment_methods_with_discounts/set_payment_methods', [])

				this.$store.commit('vender/setSelectedPaymentMethods', [])

				this.$store.commit('vender/set_caja_id', 0)

				this.limpiar_cuotas()

				this.init_modal_payment_metohds()
				
				this.setTotal()
			} 

			
			this.$bvModal.show('payment-method-modal')
		},
		set_payment_methods_null() {
			this.$store.commit('vender/setSelectedPaymentMethods', [])
			this.$store.commit('vender/current_acount_payment_methods/set_payment_methods', [])

			this.limpiar_cuotas()

			this.setTotal()
		},
		limpiar_cuotas() {

			this.$store.commit('vender/set_cuota_id', 0)
			this.$store.commit('vender/set_monto_credito', 0)
			this.$store.commit('vender/set_cantidad_cuotas', 0)

			this.$store.commit('vender/set_cuota_descuento', null)
			this.$store.commit('vender/set_cuota_recargo', null)
			this.$store.commit('vender/set_cuota_monto_descuento', null)
			this.$store.commit('vender/set_cuota_monto_recargo', null)
		},

	}
}
</script>
<style lang="sass">
.cont-payment-methods
	
	.input-group-append

		button
			border-radius: 0 5px 5px 0 !important
</style>