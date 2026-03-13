<template>

<b-input-group
v-if="paga_con_credito && cuotas.length"
class="cont-payment-methods m-t-5 m-b-15"
prepend="Cuotas">
	<b-form-select
	v-model="cuota_id" 
	:options="cuotas_options"></b-form-select> 
</b-input-group>

</template>
<script>
import cuotas from '@/mixins/cuotas'
import select_payment_methods from '@/mixins/vender/select_payment_methods'
export default {
	mixins: [select_payment_methods, cuotas],
	computed: {
		selected_payment_methods() {
			return this.$store.state.vender.selected_payment_methods
		},
		cuota_id: {
			get() {
				return this.$store.state.vender.cuota_id
			}, 
			set(_cuota_id) {


				let cuota_id = null
				let cantidad_cuotas = null
				let cuota_descuento = null
				let cuota_recargo = null

				if (_cuota_id) {

					let cuota = this.cuotas.find(_cuota => _cuota.id == _cuota_id)
					cuota_id = cuota.id
					cantidad_cuotas = cuota.cantidad_cuotas
					cuota_descuento = cuota.descuento
					cuota_recargo = cuota.recargo
				
				} else {

					cuota_id = 0
				}


				this.$store.commit('vender/set_cuota_id', cuota_id)
				this.$store.commit('vender/set_cantidad_cuotas', cantidad_cuotas)
				this.$store.commit('vender/set_cuota_descuento', cuota_descuento)
				this.$store.commit('vender/set_cuota_recargo', cuota_recargo)

				this.$store.commit('vender/set_cuota_monto_descuento', null)
				this.$store.commit('vender/set_cuota_monto_recargo', null)

				this.setTotal()
			}
		},
		paga_con_credito() {
			return this.es_credito(this.current_acount_payment_method_id)
		},
		addresses() {
			return this.$store.state.address.models
		}
	},
}
</script>
