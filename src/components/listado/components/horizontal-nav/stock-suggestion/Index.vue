<template>
	<div
	v-if="addresses.length">
		
		<stock-suggestion-modal></stock-suggestion-modal>
		<stock-suggestion-article-modal></stock-suggestion-article-modal>

		<modal-button></modal-button>

	</div>
</template>
<script>
export default { 
	components: {
		StockSuggestionModal: () => import('@/components/listado/modals/stock-suggestion/Index'),
		StockSuggestionArticleModal: () => import('@/components/listado/modals/stock-suggestion-article/Index'),
		ModalButton: () => import('@/components/listado/components/horizontal-nav/stock-suggestion/ModalButton'),
	}, 
	computed: {
		addresses() {
			return this.$store.state.address.models
		}
	}
}
</script>