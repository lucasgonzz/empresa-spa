export default {
	methods: {
		update_articles_after_import() {
			this.$store.dispatch('article/getModels')
			this.$store.dispatch('category/getModels')
			this.$store.dispatch('sub_category/getModels')
			this.$store.dispatch('provider/getModels')
		}
	}
}