<template>
	<div
	v-if="!tiene_extension_sugerencias && addresses.length">

		<stock-suggestion-modal></stock-suggestion-modal>
		<stock-suggestion-article-modal></stock-suggestion-article-modal>

		<!-- <modal-button></modal-button> -->

	</div>
</template>
<script>
export default {
	components: {
		StockSuggestionModal: () => import('@/components/listado/modals/stock-suggestion/Index'),
		StockSuggestionArticleModal: () => import('@/components/listado/modals/stock-suggestion-article/Index'),
		// ModalButton: () => import('@/components/listado/components/horizontal-nav/stock-suggestion/ModalButton'),
	},
	computed: {
		/**
		 * Con la extension de sugerencias inteligentes activa, los modales apilados
		 * no se montan: la funcionalidad vive en la vista propia /sugerencias-de-stock
		 * (DepositButtons navega ahi). Sin la extension, todo queda como siempre.
		 */
		tiene_extension_sugerencias() {
			return !!this.hasExtencion('sugerencias_inteligentes')
		},
		addresses() {
			return this.$store.state.address.models
		}
	}
}
</script>