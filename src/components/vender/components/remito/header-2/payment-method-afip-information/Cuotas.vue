<template>

	<b-form-select
	v-if="paga_con_credito && cuotas.length"
	v-model="cuota_id" 
	:options="cuotas_options"></b-form-select> 

</template>
<script>
import vender from '@/mixins/vender'
export default {
	mixins: [vender],
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
		cuotas() {
			return this.$store.state.cuota.models 
		},
		cuotas_options() {
			let options = [{
				value: 0,
				text: 'Seleccione cuotas'
			}]

			this.cuotas.forEach(cuota => {

				options.push({
					value: cuota.id,
					text: this.cuota_text(cuota),
				})
			})

			return options
		},
		paga_con_credito() {
			return this.monto_credito
		},
		addresses() {
			return this.$store.state.address.models
		}
	},
	methods: {
		cuota_text(cuota) {
			let text = cuota.cantidad_cuotas

			if (cuota.descuento) {
				text += '  (- '+cuota.descuento+'%)'
			}

			if (cuota.recargo) {
				text += '  (+ '+cuota.recargo+'%)'
			}

			return text 
		}
	}
}
</script>
