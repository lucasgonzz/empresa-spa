<template>
	<div>
		<b-dropdown-divider></b-dropdown-divider>

		<dropdown-section-title
		title="PDF ofertas (plantillas)"
		icon="icon-pdf"></dropdown-section-title>

		<template v-if="!owner_uses_listas_de_precio">
			<dropdown-option-item
			v-for="design in article_pdf_models"
			:key="design.id"
			icon="icon-pdf"
			@click="open_offer_pdf(design, null)">
				{{ design.nombre }}
			</dropdown-option-item>
		</template>
		<template v-else>
			<template v-for="design in article_pdf_models">
				<dropdown-option-item
				v-for="price_type in price_types"
				:key="design.id + '-' + price_type.id"
				icon="icon-pdf"
				@click="open_offer_pdf(design, price_type.id)">
					{{ design.nombre }} — {{ price_type.name }}
				</dropdown-option-item>
			</template>
		</template>
	</div>
</template>
<script>
import listado_articles_source from '@/mixins/listado/listado_articles_source'
import generals from '@/mixins/generals'

/**
 * Lista plantillas `article_pdf` del usuario y abre el PDF de ofertas en otra pestaña.
 */
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
		 * @returns {boolean}
		 */
		owner_uses_listas_de_precio() {
			return this.ownerUsesListasDePrecio()
		},
		article_pdf_models() {
			return this.$store.state.article_pdf.models
		},
		/**
		 * Listas de precios cargadas en store.
		 *
		 * @returns {Array}
		 */
		price_types() {
			return this.$store.state.price_type ? this.$store.state.price_type.models : []
		},
	},
	created() {
		const self = this
		self.$store.dispatch('article_pdf/getModels')
			.then(function () {})
			.catch(function () {})
		if (self.owner_uses_listas_de_precio && !self.price_types.length) {
			self.$store.dispatch('price_type/getModels')
				.then(function () {})
				.catch(function () {})
		}
	},
	methods: {
		/**
		 * Arma la lista de IDs según el dropdown activo y abre el endpoint del PDF.
		 *
		 * @param {Object}      design
		 * @param {number|null} price_type_id
		 * @return {void}
		 */
		open_offer_pdf(design, price_type_id) {
			let ids = this.resolve_article_ids()
			if (!ids.length) {
				return
			}

			let link = process.env.VUE_APP_API_URL + '/article/article-offer-pdf/' + design.id + '/' + ids.join('-')
			if (price_type_id) {
				link += '?price_type_id=' + price_type_id
			}
			window.open(link)
		},
	},
}
</script>
