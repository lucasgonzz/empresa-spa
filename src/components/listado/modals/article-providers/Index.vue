<template>
<b-modal
:title="'Proveedores de '+article.name"
hide-footer
size="lg"
id="article-providers"
@hidden="al_cerrar_modal">
	<!--
		Orquestador: sólo layout y registro de sub-componentes. La pestaña "Historial de precios" sólo
		se ofrece con el permiso de costos (article.cost): muestra a qué costo tuvo cada proveedor el
		artículo. Es "lazy": se pide al servidor recién cuando se abre la pestaña.
	-->
	<b-tabs
	v-model="tab_index"
	content-class="m-t-15">
		<b-tab
		title="Proveedores">
			<current-references></current-references>
		</b-tab>
		<b-tab
		v-if="can('article.cost')"
		lazy
		title="Historial de precios">
			<offer-history
			:initial_highlight_id="highlight_offer_id"></offer-history>
		</b-tab>
	</b-tabs>
</b-modal>
</template>
<script>
import CurrentReferences from '@/components/listado/modals/article-providers/CurrentReferences'
import OfferHistory from '@/components/listado/modals/article-providers/OfferHistory'

/**
 * Modal "Proveedores del artículo" con dos pestañas: la tabla de hoy (CurrentReferences) y el
 * historial de precios por proveedor (OfferHistory). También atiende el vínculo de vuelta desde
 * "Cambios de precios": el evento 'provider-offers:highlight' abre la pestaña del historial con esa
 * oferta destacada.
 */
export default {
	components: {
		CurrentReferences,
		OfferHistory,
	},
	data() {
		return {
			// Pestaña activa (0 = Proveedores, 1 = Historial de precios).
			tab_index: 0,
			// Oferta a destacar cuando se llega desde "Cambios de precios" (null = ninguna).
			highlight_offer_id: null,
		}
	},
	computed: {
		// Artículo abierto en el modal.
		article() {
			return this.$store.state.article.model 
		},
	},
	created() {
		this.$root.$on('provider-offers:highlight', this.al_pedir_destacar_oferta)
	},
	beforeDestroy() {
		this.$root.$off('provider-offers:highlight', this.al_pedir_destacar_oferta)
	},
	methods: {
		/**
		 * Alguien (el modal de cambios de precios) pide ver una oferta en el historial: se deja
		 * anotada para la pestaña (que todavía puede no existir) y se pasa a esa pestaña.
		 * @param {Number} offer_id Id de la oferta de proveedor a destacar.
		 * @return {void}
		 */
		al_pedir_destacar_oferta(offer_id) {
			this.highlight_offer_id = offer_id
			if (this.can('article.cost')) {
				this.tab_index = 1
			}
		},
		/**
		 * Al cerrar el modal vuelve a la primera pestaña y se olvida el destacado, para que la próxima
		 * apertura desde el botón del listado sea la de siempre.
		 * @return {void}
		 */
		al_cerrar_modal() {
			this.tab_index = 0
			this.highlight_offer_id = null
		},
	},
}
</script>
<style lang="sass">
#article-providers
	.table > tbody > tr,
	.table th,
	.table td
		white-space: normal
		overflow-wrap: anywhere

@media (max-width: 575.98px)
	#article-providers .table.b-table.b-table-stacked-sm > tbody > tr > [data-label]
		// El reparto 40/60 de Bootstrap hereda el nowrap global y superpone etiquetas largas.
		// En teléfono cada etiqueta ocupa su propia línea y el valor usa el ancho completo.
		&::before
			display: block
			float: none
			width: 100%
			padding: 0
			margin-bottom: 4px
			text-align: left
			white-space: normal
			overflow-wrap: anywhere
			color: var(--color-text-secondary)
			font-size: 0.75rem

		> div
			display: block
			width: 100%
			padding: 0
			white-space: normal
			overflow-wrap: anywhere

	// Historial de precios: en teléfono los botones de vínculo ocupan el ancho y son tocables.
	#article-providers .offer-history-link
		display: block
		width: 100%
		min-height: 40px
		margin-top: 6px

// Oferta destacada al llegar desde "Cambios de precios": marco del color primario, sirve en tema claro y oscuro.
#article-providers .table > tbody > tr.offer-history-row--highlight
	outline: 2px solid var(--color-primary)
	outline-offset: -2px

// En pantallas anchas el botón de vínculo va a su tamaño natural.
@media (min-width: 576px)
	#article-providers .offer-history-link
		display: inline-block
		width: auto
		min-height: 0
		margin-top: 4px
</style>
