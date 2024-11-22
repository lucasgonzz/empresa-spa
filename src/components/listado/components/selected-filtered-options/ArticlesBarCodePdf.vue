<template>
	<div>
		<b-dropdown-item
		@click="tickets">
			<i class="icon-barcode"></i>
			Codigos de barra
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
		tickets() {
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
		}
	}
}
</script>