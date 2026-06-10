<template>
	<div>
		<b-dropdown-divider></b-dropdown-divider>

		<dropdown-section-title
		title="Documentos PDF"
		icon="icon-pdf"></dropdown-section-title>

		<div
		v-if="hasExtencion('ventas_en_dolares')">
			<dropdown-option-item
			v-for="moneda in monedas"
			:key="moneda.id"
			icon="icon-pdf"
			@click="pdf(moneda)">
				PDF con imagenes ({{ moneda.name }})
			</dropdown-option-item>
		</div>
		<div
		v-else>
			<dropdown-option-item
			icon="icon-pdf"
			@click="pdf">
				Catalogo con imagenes
			</dropdown-option-item>
		</div>

	</div>
</template>
<script>
import listado_articles_source from '@/mixins/listado/listado_articles_source'

export default {
	mixins: [listado_articles_source],
	components: {
		DropdownSectionTitle: () => import('@/components/listado/components/selected-filtered-options/DropdownSectionTitle'),
		DropdownOptionItem: () => import('@/components/listado/components/selected-filtered-options/DropdownOptionItem'),
	},
	computed: {
		monedas() {
			return this.$store.state.moneda.models 
		},
	},
	methods: {
		/**
		 * Abre PDF con imágenes para seleccionados o filtrados según el dropdown activo.
		 *
		 * @param {Object|null} moneda
		 * @return {void}
		 */
		pdf(moneda = null) {
			let ids = this.resolve_article_ids()
			if (!ids.length) {
				return
			}

			let link = process.env.VUE_APP_API_URL + '/article/pdf/' + ids.join('-') 
			
			if (moneda) {
				link += '/' + moneda.id
			}
			
			window.open(link)
		},
	}
}
</script>
