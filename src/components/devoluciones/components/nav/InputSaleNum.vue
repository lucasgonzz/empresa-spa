<template>
	<b-input-group
	prepend="N° venta">
		<b-form-input
		id="sale-num"
		:disabled="venta_seleccionada"
		placeholder="N° de Venta"
		@keyup.enter="call_search_sale"
		v-model="num_sale"></b-form-input>
	</b-input-group>
</template>
<script>
import set_from_sale from '@/mixins/devoluciones/set_from_sale'
export default {
	mixins: [set_from_sale],
	computed: {
		num_sale: {
			get() {
				return this.$store.state.devoluciones.num_sale
			},
			set(value) {
				this.$store.commit('devoluciones/set_num_sale', value)
			}
		},
		venta_seleccionada() {
			if (this.sale) {
				return true 
			}
			if (this.client) {
				return true
			}
			return false
		},
		sale() {
			return this.$store.state.devoluciones.sale
		},
		client() {
			return this.$store.state.devoluciones.client
		},
	},
	methods: {
		call_search_sale() {

			this.search_sale()
		},
	}
}
</script>