<template>
	<div>
		<b-dropdown-divider></b-dropdown-divider>
		<b-dropdown-text>
			PDF ofertas (plantillas)
		</b-dropdown-text>
		<b-dropdown-item
		v-for="design in article_pdf_models"
		:key="design.id"
		@click="open_offer_pdf(design)">
			<i class="icon-tag"></i>
			{{ design.nombre }}
		</b-dropdown-item>
	</div>
</template>
<script>
import alert_filtrados from '@/mixins/listado/alert_filtrados'

/**
 * Lista plantillas `article_pdf` del usuario y abre el PDF de ofertas en otra pestaña.
 */
export default {
	mixins: [alert_filtrados],
	computed: {
		selected() {
			return this.$store.state.article.selected
		},
		total_filter_results() {
			return this.$store.state.article.total_filter_results
		},
		article_pdf_models() {
			return this.$store.state.article_pdf.models
		},
	},
	created() {
		this.$store.dispatch('article_pdf/getModels')
			.then(function () {})
			.catch(function () {})
	},
	methods: {
		/**
		 * Arma la lista de IDs (selección o filtrados) y abre el endpoint del PDF.
		 *
		 * @param {Object} design Registro `article_pdf` con `id` y `nombre`.
		 * @return {void}
		 */
		open_offer_pdf(design) {
			let ids = []
			let articles
			if (this.selected.length) {
				articles = this.selected
			} else if (this.filtered.length) {
				this.alert_filtrados()
				articles = this.filtered
			}
			if (!articles || !articles.length) {
				return
			}
			articles.forEach(function (article) {
				ids.push(article.id)
			})
			const link = process.env.VUE_APP_API_URL + '/article/article-offer-pdf/' + design.id + '/' + ids.join('-')
			window.open(link)
		},
	},
}
</script>
