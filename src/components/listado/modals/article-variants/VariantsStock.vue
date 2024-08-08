<template>
	<b-table
	head-variant="dark"
	responsive
	striped
	:fields="fields"
	:items="items"></b-table>
</template>
<script>
export default {
	computed: {
		article() {
			return this.$store.state.article.model 
		},
		addresses() {
			return this.$store.state.address.models
		},
		fields() {
			let fields = [
				{
					label: 'Variante',
					key: 'variant_description',
				},
			]

			this.addresses.forEach(address => {
				fields.push({
					label: address.street,
					key: 'address_'+address.id 
				})
			})

			return fields
		},
		items() {
			let items = []

			this.article.article_variants.forEach(variant => {

				let item = {
					variant_description: variant.variant_description
				}

				variant.addresses.forEach(variant_address => {

					item['address_'+variant_address.id] = variant_address.pivot.amount
				})

				items.push(item)
			})

			return items
		}
	}
}
</script>