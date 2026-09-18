<template>
	<div
	v-if="!puede_entrar_al_mostrador && addresses.length">

		<stock-suggestion-modal></stock-suggestion-modal>
		<stock-suggestion-article-modal></stock-suggestion-article-modal>

		<!-- <modal-button></modal-button> -->

	</div>
</template>
<script>
import mostrador_acceso from '@/mixins/mostrador_acceso'

export default {
	mixins: [mostrador_acceso],
	components: {
		StockSuggestionModal: () => import('@/components/listado/modals/stock-suggestion/Index'),
		StockSuggestionArticleModal: () => import('@/components/listado/modals/stock-suggestion-article/Index'),
		// ModalButton: () => import('@/components/listado/components/horizontal-nav/stock-suggestion/ModalButton'),
	},
	/*
		Los modales apilados de sugerencias de stock se montan para quien NO puede entrar
		al mostrador (mixin mostrador_acceso: extension asistente_ia + dueño o acceso
		maestro). Para esa persona son el unico camino a las sugerencias desde que la
		vista propia /sugerencias-de-stock se retiro (mision "modulo-ia-mostrador",
		14/9/2026): DepositButtons -> Sugerencias los abre. Quien SI puede entrar va al
		mostrador y no los necesita.

		Hasta el chequeo del 14/9 el gate era la extension sugerencias_inteligentes: eso
		dejaba sin modales al empleado de una cuenta con la extension (a el /ia le dice
		"solo para el dueño") y al dueño sin asistente_ia. Aunque la cuenta tenga la
		extension, si la persona no puede entrar al mostrador, los modales van.
	*/
	computed: {
		addresses() {
			return this.$store.state.address.models
		}
	}
}
</script>
