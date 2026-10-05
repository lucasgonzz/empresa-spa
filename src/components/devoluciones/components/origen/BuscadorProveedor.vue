<template>
	<!--
		Proveedor de una nota de crédito SIN compra de origen (la compra, si se busca, ya trae el
		suyo). Gemelo de BuscadorCliente.vue.
	-->
	<search-component
	id="devolucion-compra-proveedor"
	placeholder="Buscar proveedor por nombre"
	@setSelected="setSelected"
	@clearSelected="clearSelected"
	:prop="{text: 'Proveedor', key: 'provider_id'}"
	:model="provider"
	model_name="provider"
	set_selected_model_with_model_prop
	search_from_api
	:props_to_filter="['name']"></search-component>
</template>
<script>
export default {
	components: {
		SearchComponent: () => import('@/common-vue/components/search/Index'),
	},
	computed: {
		/**
		 * @returns {Object|null} Proveedor elegido en el store de devoluciones.
		 */
		provider() {
			return this.$store.state.devoluciones.provider
		},
	},
	methods: {
		/**
		 * Elige el proveedor. La cuenta corriente se prende por defecto: una nota de crédito a un
		 * proveedor casi siempre es para bajar lo que se le debe, y el toggle queda a la vista
		 * para apagarlo.
		 *
		 * @param {Object} result Resultado del buscador; el proveedor viene en `result.model`.
		 */
		setSelected(result) {
			this.$store.commit('devoluciones/set_provider', result.model)
			this.$store.commit('devoluciones/set_generar_current_acount', 1)
		},
		/**
		 * El usuario borró el proveedor elegido.
		 */
		clearSelected() {
			this.$store.commit('devoluciones/set_provider', null)
		},
	},
}
</script>
