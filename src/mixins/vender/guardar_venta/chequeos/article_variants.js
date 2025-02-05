export default {
	computed: {
		items() {
			return this.$store.state.vender.items
		},
	},
	methods: {
		check_article_variants() {
			let ok = true
			this.items.forEach(item => {
				if (item.is_article && item.article_variants.length && item.article_variant_id == 0) {
					ok = false 
					this.$toast.error('Indique la variante de '+item.name)
				}
			})
			return ok
		},
	}
}