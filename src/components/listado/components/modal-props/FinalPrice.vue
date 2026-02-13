<template>
	<div
	class="cont-final-price">
		<b-button
		class="m-r-10"
		@click="info"
		variant="outline-success"
		size="sm">
			?
		</b-button>
		<p
		class="text-success">
			{{ propertyText(article, prop, false, !prop.from_pre_view) }}
		</p>
	</div>
</template>
<script>
export default {
	computed: {
		article() {
			return this.$store.state.article.model 
		},
		prop() {
			return {
				key: 'final_price',
				check_simbolo_moneda: true,
				simbolo_moneda_function: 'article_simbolo_moneda',
				prop_to_check_in_simbolo_moneda: {
					key: 'cost_in_dollars',
					equal_to: 1
				},
				is_price: true,
			}
		}
	},
	methods: {
		info() {
			this.$api.get('article/final-price-description/'+this.article.id)
			.then(res => {
				console.log(res)

				this.$store.commit('article/set_final_price_description', res.data.description)
				this.$bvModal.show('final-price-description')
			})
		}
	}
}
</script>
<style lang="sass">
.cont-final-price
	display: flex  
	flex-direction: row  
	justify-content: flex-start
	align-items: center

	p
		font-size: 2.5em
		margin: 0
		font-weight: bold
</style>