export default {
	computed: {
		items() {
			return this.$store.state.vender.items
		},
		articulos_con_depositos() {

			return this.items.filter(item => {
				if (item.is_article) {
					if (item.addresses.length) {
						return true 
					}  
					if (item.article_variants.length) {

						let has_addresses = false
						item.article_variants.forEach(variant => {

							if (variant.addresses.length) {
								has_addresses = true 
							}
						})

						return has_addresses
					}
				}
				return false
			})
		},
	},
	methods: {
		check_sucursal() {

			if (this.address_id == 0 && this.articulos_con_depositos.length) {
				this.$toast.error('Hay '+this.articulos_con_depositos.length+' articulos con stock en diferentes depositos')
				this.$toast.error('Indique la DIRECCION de la venta para restar el stock en los depositos que correspondan')
				return false
			}

			return true
		}
	}
}