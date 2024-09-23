<template>

	<b-form-select
	v-if="pagado_al_contado"
	v-model="caja_id" 
	:options="get_caja_options(vender_payment_method_id)"></b-form-select> 

</template>
<script>
import cajas from '@/mixins/vender/cajas'
export default {
	mixins: [cajas],
	computed: {
		pagado_al_contado() {
			return !this.client || this.omitir_en_cuenta_corriente
		},
		vender_payment_method_id() {
			return this.$store.state.vender.current_acount_payment_method_id
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
