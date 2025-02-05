<template>
	<div>
		<b-form-input
		class="input-address-stock"
		:dusk="article.name+'-'+address.id"
		type="number"
		@click.stop
		v-if="article_address"
		v-model="article_address.pivot.amount"></b-form-input>
	</div>
</template>
<script>
export default {
	props: {
		article: Object,
		address: Object
	},
	computed: {
		article_address() {
			let article_address = this.article.addresses.find(address => address.id == this.address.id)

			if (typeof article_address != 'undefined') {

				return article_address
			}

			return null
		}
	}
}
</script>
<style lang="sass">
.input-address-stock
	width: 200px
</style>