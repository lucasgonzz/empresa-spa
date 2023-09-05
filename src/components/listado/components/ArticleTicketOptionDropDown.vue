<template>
	<b-dropdown-item
	@click="tickets">
		<i class="icon-tag"></i>
		Tickets
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
		tickets() {
			let ids = []
			let articles
			if (this.selected.length) {
				articles = this.selected
				console.log('nonon')
			} else if (this.filtered.length) {
				articles = this.filtered
				console.log('asdasdad')
				console.log(articles)
			}
			articles.forEach(article => {
				ids.push(article.id)
			})
			let link = process.env.VUE_APP_API_URL+'/article/tickets-pdf/'+ids.join('-') 
			window.open(link)
		}
	}
}
</script>