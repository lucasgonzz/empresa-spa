<template>
	<div
	class="j-center">
			
		<div
		class="j-center"
		v-if="can('article.edit_stock')">
			
			<stock-btn
			:article="article"></stock-btn>

			<edit-addresses-stock-btn
			:article="article"></edit-addresses-stock-btn>
		</div> 

		<span
		v-else>
			{{ article.stock }}
		</span>

	</div>
</template>
<script>
export default {
	components: {
		StockBtn: () => import('@/components/listado/components/StockBtn'),
		EditAddressesStockBtn: () => import('@/components/listado/components/table-props/stock-btn/EditAddressesStockBtn'),
	},
	props: {
		article: Object,
	},
	methods: {
		stockMovement() {
			this.$store.commit('article/setModel', {
				model: this.article,
				properties: [],
			})
			this.$bvModal.show('stock-movement')
			setTimeout(() => {
				document.getElementById('stock-movement-amount').focus()
			}, 500)	
		},
	}
}
</script>