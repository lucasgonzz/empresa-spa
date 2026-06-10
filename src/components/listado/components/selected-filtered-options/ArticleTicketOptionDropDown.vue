<template>
	<div>
		<b-dropdown-divider></b-dropdown-divider>
		<dropdown-section-title
		title="Documentos PDF"
		icon="icon-pdf"></dropdown-section-title>
		
		<dropdown-option-item
		v-if="!owner_uses_listas_de_precio"
		icon="icon-print"
		@click="tickets(null)">
			Etiquetas gondolas
		</dropdown-option-item>

		<dropdown-option-item
		v-else
		v-for="price_type in price_types"
		:key="price_type.id"
		icon="icon-tag"
		@click="tickets(price_type.id)">
			{{ price_type.name }}
		</dropdown-option-item>
	</div>
</template>
<script>
import listado_articles_source from '@/mixins/listado/listado_articles_source'
import generals from '@/mixins/generals'

export default {
	mixins: [listado_articles_source, generals],
	components: {
		DropdownSectionTitle: () => import('@/components/listado/components/selected-filtered-options/DropdownSectionTitle'),
		DropdownOptionItem: () => import('@/components/listado/components/selected-filtered-options/DropdownOptionItem'),
	},
	computed: {
		/**
		 * Indica si el dueño trabaja con listas de precios.
		 *
		 * @return {boolean}
		 */
		owner_uses_listas_de_precio() {
			return this.ownerUsesListasDePrecio()
		},
		/**
		 * Listas de precios disponibles en store.
		 *
		 * @return {Array}
		 */
		price_types() {
			return this.$store.state.price_type ? this.$store.state.price_type.models : []
		},
	},
	methods: {
		/**
		 * Abre el PDF de etiquetas para seleccionados o filtrados según el dropdown activo.
		 *
		 * @param {number|null} price_type_id
		 * @return {void}
		 */
		tickets(price_type_id) {
			let ids = this.resolve_article_ids()
			if (!ids.length) {
				return
			}

			let link = process.env.VUE_APP_API_URL + '/article/tickets-pdf/' + ids.join('-')
			if (price_type_id) {
				link += '?price_type_id=' + price_type_id
			}
			window.open(link)
		}
	}
}
</script>
