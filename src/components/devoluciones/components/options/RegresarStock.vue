<template>
	<div
	v-if="articles.length">

		<b-form-checkbox
		:value="1"
		:unchecked-value="0"
		v-model="regresar_stock">
			Regresar Stock
		</b-form-checkbox>
		<b-form-select
		class="m-t-10"
		v-if="regresar_stock"
		v-model="address_id"
		:options="getOptions({text: 'Deposito', store: 'address', select_prop_name: 'street'})"></b-form-select>

	</div>
</template>
<script>
export default {
	computed: {
		articles() {
			return this.$store.state.devoluciones.articles
		},
		regresar_stock: {
			get() {
				return this.$store.state.devoluciones.regresar_stock
			},
			set(value) {
				this.$store.commit('devoluciones/set_regresar_stock', value)
			}
		},
		address_id: {
			get() {
				return this.$store.state.devoluciones.address_id
			},
			set(value) {
				this.$store.commit('devoluciones/set_address_id', value)
			}
		},
	}
}
</script>