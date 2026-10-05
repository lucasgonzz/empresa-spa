<template>
	<!--
		Cliente de una nota de crédito SIN venta (la venta, si se busca, ya trae el suyo). Mismo
		buscador y mismo id que antes (`select_client_devoluciones`).
	-->
	<search-component
	id="select_client_devoluciones"
	placeholder="Buscar cliente por nombre, N° o teléfono"
	@setSelected="setSelected"
	@clearSelected="clearSelected"
	:prop="{text: 'Cliente', key: 'client_id'}"
	:model="client"
	model_name="client"
	set_selected_model_with_model_prop
	search_from_api
	:props_to_filter="['num', 'name', 'phone']"></search-component>
</template>
<script>
export default {
	components: {
		SearchComponent: () => import('@/common-vue/components/search/Index'),
	},
	computed: {
		/**
		 * @returns {Object|null} Cliente elegido en el store de devoluciones.
		 */
		client() {
			return this.$store.state.devoluciones.client
		},
	},
	methods: {
		/**
		 * @param {Object} result Resultado del buscador; el cliente viene en `result.model`.
		 */
		setSelected(result) {
			this.$store.commit('devoluciones/set_client', result.model)
		},
		/**
		 * El usuario borró el cliente elegido.
		 */
		clearSelected() {
			this.$store.commit('devoluciones/set_client', null)
		},
	},
}
</script>
