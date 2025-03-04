<template>
	<search-component
	v-if="!sale"
	class="m-t-15"
	disabled
	:show_selected="false"
	@setSelected="setSelected"
	model_name="article"
	search_from_api
	:props_to_filter="['name', 'bar_code', 'provider_code']"></search-component>
</template>
<script>
export default {
	components: {
		SearchComponent: () => import('@/common-vue/components/search/Index'),
	}, 
	computed: {
		sale() {
			return this.$store.state.devoluciones.sale
		},
		client() {
			return this.$store.state.devoluciones.client
		},
	},
	methods: {
		setSelected(result) {
			let article = {
				...result.model,
				is_article: true,
				price_vender: result.model.final_price,
				amount: '',
				discount: '',
				returned_amount: '',
				ya_devueltas: null,
				pivot: {},
			}
			this.$store.commit('devoluciones/add_article', article)
			console.log('articles:')
			console.log(this.$store.state.devoluciones.articles)
		}
	}
}
</script>