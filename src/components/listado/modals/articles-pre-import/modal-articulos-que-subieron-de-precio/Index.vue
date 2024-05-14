<template>
<b-modal
title="Articulos que cambiaron su costo"
hide-footer
size="lg"
id="articulos-que-subieron-de-precio">
	
	<article-pre-import-ranges></article-pre-import-ranges>

	<b-table
	responsive
	:fields="properties"
	head-variant="dark"
	:items="items">
		<template #cell(actualizado)="data">
			<span
			v-if="articles[data.index].pivot.actualizado">
				<i 
				class="icon-check text-success"></i>
				Si
			</span>
			<span
			v-else>
				<i 
				class="icon-cancel text-danger"></i>
				No
			</span>
		</template>
	</b-table>
</b-modal>
</template>
<script>
import articles_pre_import from '@/mixins/articles_pre_import'
export default {
	mixins: [articles_pre_import],
	components: {
		ArticlePreImportRanges: () => import('@/components/listado/modals/articles-pre-import/modal-articulos-que-subieron-de-precio/ArticlePreImportRanges'),
		TableComponent: () => import('@/common-vue/components/display/table/Index'),
	},
	computed: {
		articles_pre_import() {
			return this.$store.state.articles_pre_import.model 
		},
		properties() {
			return [
				{
					key: 'codigo_proveedor'
				},
				{
					key: 'articulo'
				},
				{
					key: 'costo_actual'
				},
				{
					key: 'costo_nuevo'
				},
				{
					key: 'porcentaje'
				},
				{
					key: 'actualizado'
				},
			]		
		},
		articles() {
			if (this.articles_pre_import.id) {
				return this.articles_pre_import.articles.sort((a, b) => this.get_procentaje_de_aumento(a) - this.get_procentaje_de_aumento(b))
			}
			return []
		},
		items() {
			let items = []
			this.articles.forEach(article => {
				items.push({
					codigo_proveedor: article.provider_code,
					articulo: article.name,
					costo_actual: this.price(article.pivot.costo_actual),
					costo_nuevo: this.price(article.pivot.costo_nuevo),
					porcentaje: this.get_procentaje_de_aumento(article),
					_cellVariants: {porcentaje: this.color_del_rango(article)},
				})
			})
			return items
		},
		ranges() {
			return this.$store.state.article_pre_import_range.models
		},	
	},
	methods: {
		color_del_rango(article) {
			let procentaje = this.get_procentaje_de_aumento(article)

			let range = null
			this.ranges.forEach(_range => {
				if (this.esta_en_el_rango(procentaje, _range)) {
					range = _range
				}
			})
			if (range) {
				return range.color 
			}
			return ''
		}
	}
}
</script>