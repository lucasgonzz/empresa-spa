<template>
	<b-dropdown-item
	@click="pdf">
		<i class="icon-tag"></i>
		Generar PDF
	</b-dropdown-item>
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
	},
	methods: {
		pdf() {
			let ids = []
			let articles
			if (this.selected.length) {
				articles = this.selected
			} else if (this.filtered.length) {
				articles = this.filtered
			}
			articles.forEach(article => {
				ids.push(article.id)
			})
			let link = process.env.VUE_APP_API_URL+'/article/pdf/'+ids.join('-') 
			window.open(link)
		}
	}
}
</script>