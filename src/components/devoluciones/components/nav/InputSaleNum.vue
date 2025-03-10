<template>
	<b-input-group
	prepend="N° venta">
		<b-form-input
		id="sale-num"
		:disabled="venta_seleccionada"
		placeholder="N° de Venta"
		@keyup.enter="search_sale"
		v-model="num_sale"></b-form-input>
	</b-input-group>
</template>
<script>
export default {
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
		search_sale() {

			this.$store.dispatch('devoluciones/search_sale')
			.then(() => {
				if (!this.sale) {
					this.$toast.error('No se encontro venta')
				}
			})
		},
	}
}
</script>