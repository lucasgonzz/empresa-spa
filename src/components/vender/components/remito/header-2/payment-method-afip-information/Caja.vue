<template>
		
	<b-input-group
	v-if="cajas.length && !selected_payment_methods.length"
	prepend="Caja">
		<b-form-select 
		:disabled="!pagado_al_contado"
		v-model="caja_id" 
		:options="get_caja_options(vender_payment_method_id)"></b-form-select> 
	</b-input-group>
</template>
<script>
import cajas from '@/mixins/vender/cajas'
export default {
	mixins: [cajas],
	watch: {
		payment_method_id() {
			let address_id = this.$cookies.get('address_id')
			
			let caja_id = this.get_caja_por_defecto(this.payment_method_id, address_id)
			if (caja_id) {
				this.caja_id = caja_id
			}
		},
		address_id() {
			let address_id = this.$cookies.get('address_id')
			
			let caja_id = this.get_caja_por_defecto(this.payment_method_id, address_id)
			if (caja_id) {
				this.caja_id = caja_id
			}
		},
	},
	computed: {
		address_id() {
			return this.$store.state.vender.address_id
		},
		payment_method_id() {
			return this.$store.state.vender.current_acount_payment_method_id
		},
		cajas() {
			return this.$store.state.caja.models
		},
		pagado_al_contado() {
			return !this.client || this.omitir_en_cuenta_corriente
		},
		selected_payment_methods() {
			return this.$store.state.vender.selected_payment_methods
		},
		vender_payment_method_id() {
			return this.$store.state.vender.current_acount_payment_method_id
		},
		client() {
			return this.$store.state.vender.client 
		},
		omitir_en_cuenta_corriente() {
			return this.$store.state.vender.omitir_en_cuenta_corriente 
		},
		caja_id: {
			get() {
				return this.$store.state.vender.caja_id
			}, 
			set(value) {
				this.$store.commit('vender/set_caja_id', value)
			}
		},
	},
}
</script>
