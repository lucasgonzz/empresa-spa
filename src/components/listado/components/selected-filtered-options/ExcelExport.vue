<template>
	<div>
		<b-dropdown-divider></b-dropdown-divider>
		
		<b-dropdown-text>
			Documentos Excel 
		</b-dropdown-text>

		<b-dropdown-item
		@click="export_excel">
			<i class="icon-share"></i>
			Exportar Excel
		</b-dropdown-item>
	</div>
</template>
<script>
export default {
	computed: {
		selected() {
			return this.$store.state.article.selected 
		},
		filtered() {
			return this.$store.state.article.filtered 
		},
		filters() {
			return this.$store.state.article.filters 
		},
	},
	methods: {
		getIds() {
			let ids = []
			let articles
			if (this.selected.length) {
				articles = this.selected
			} 
			articles.forEach(article => {
				ids.push(article.id)
			})
			return ids.join('-')
		},
		export_excel() {

			let link = process.env.VUE_APP_API_URL+'/article/excel/export'
			
			if (this.selected.length) {
				let ids = this.getIds() 
				link += '?articles_id='+ids
			} else {

				let jsonData = JSON.stringify(this.filters)

				link += '?filters='+jsonData
			}

			console.log(link)
			
			window.open(link)
		},
	}
}
</script>