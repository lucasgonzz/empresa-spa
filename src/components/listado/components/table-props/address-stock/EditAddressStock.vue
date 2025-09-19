<template>
	<div
	class="cont-inputs-stock">

		<b-input-group
		prepend="Stock">
			<b-form-input
			class="input-address-stock"
			:id="'input-address-stock-'+address.id"
			:dusk="article.name+'-'+address.id"
			type="number"
			@click.stop
			v-if="article_address"
			v-model="article_address.pivot.amount"></b-form-input>
		</b-input-group>

		<b-input-group
		prepend="Min">
			
			<b-form-input
			class="input-address-stock"
			:id="'input-address-stock-stock-min-'+address.id"
			type="number"
			@click.stop
			v-if="article_address"
			v-model="article_address.pivot.stock_min"></b-form-input>
		</b-input-group>

		<b-input-group
		prepend="Max">
			
			<b-form-input
			class="input-address-stock"
			:id="'input-address-stock-stock-min-'+address.id"
			type="number"
			@click.stop
			v-if="article_address"
			v-model="article_address.pivot.stock_max"></b-form-input>
		</b-input-group>
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
.cont-inputs-stock
	width: 150px
	display: flex
	flex-direction: column 
	justify-content: space-between
	align-items: center

	.input-group
		width: 140px
		margin-bottom: 10px
		
		.input-address-stock
			font-size: 13px !important
			padding: 5px

		.input-group-text
			font-size: 13px !important
			padding: 5px

</style>