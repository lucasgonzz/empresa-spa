<template>
	<div>
		<b-dropdown-item
		@click="ticketsA4">
			<i class="icon-barcode"></i>
			Codigos de barra (A4)
		</b-dropdown-item>
		<b-dropdown-item
		@click="ticketsEtiquetas">
			<i class="icon-barcode"></i>
			Codigos de barra (Etiquetas)
		</b-dropdown-item>
	</div>
</template>
<script>
import alert_filtrados from '@/mixins/listado/alert_filtrados'
export default {
	mixins: [alert_filtrados],
	computed: {
		selected() {
			return this.$store.state.article.selected 
		},
		// filtered() {
		// 	return this.$store.state.article.filtered 
		// },
		total_filter_results() {
			return this.$store.state.article.total_filter_results 
		},
	},
	methods: {
		ticketsA4() {
			let ids = []
			let articles
			if (this.selected.length) {
				articles = this.selected
			} else if (this.filtered.length) {
				this.alert_filtrados()
				articles = this.filtered
			}
			articles.forEach(article => {
				ids.push(article.id)
			})
			let link = process.env.VUE_APP_API_URL+'/article/bar-codes-pdf/'+ids.join('-') 
			window.open(link)
		},
		ticketsEtiquetas() {
			let ids = []
			let articles
			if (this.selected.length) {
				articles = this.selected
			} else if (this.filtered.length) {
				this.alert_filtrados()
				articles = this.filtered
			}
			articles.forEach(article => {
				ids.push(article.id)
			})
			let link = process.env.VUE_APP_API_URL+'/article/bar-codes-etiquetas-pdf/'+ids.join('-') 
			window.open(link)
		},
	}
}
</script>