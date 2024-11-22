export default {
	computed: {
		filtered() {
			return this.$store.state.article.filtered 
		},
		total_filter_results() {
			return this.$store.state.article.total_filter_results 
		},
	},
	methods: {
		alert_filtrados() {
			if (this.filtered.length < this.total_filter_results) {
				alert('Solo se tienen en cuenta los '+this.filtered.length+' articulos descargados. No de los '+this.total_filter_results+' filtrados')
			}
		}
	}
}