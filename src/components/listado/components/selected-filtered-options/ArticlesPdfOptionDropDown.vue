<template>
	<div>
		<b-dropdown-divider></b-dropdown-divider>
		<b-dropdown-text>
			Documentos PDF
		</b-dropdown-text>
		<b-dropdown-item
		@click="pdf">
			<i class="icon-tag"></i>
			PDF con imagenes
		</b-dropdown-item>
		<b-dropdown-item
		@click="listaPdf">
			<i class="icon-tag"></i>
			Lista PDF
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
	},
	methods: {
		getIds() {
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
			return ids
		},
		pdf() {
			let ids = this.getIds()
			let link = process.env.VUE_APP_API_URL+'/article/pdf/'+ids.join('-') 
			window.open(link)
		},
		listaPdf() {
			let ids = this.getIds()
			let link = process.env.VUE_APP_API_URL+'/article/list-pdf/'+ids.join('-') 
			window.open(link)
		}
	}
}
</script>