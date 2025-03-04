<template>
	<div
	class="j-center">
			
		<b-button
		size="sm"
		class="m-l-10"
		id="btn_asignar_stock"
		@click.stop="stockMovement"
		variant="outline-primary">
			<span
			v-if="article.stock !== null">
				{{ article.stock }}
			</span> 
			<span
			v-else>
				Asignar Stock
			</span> 
		</b-button>

		<edit-addresses-stock-btn
		:article="article"></edit-addresses-stock-btn>
	</div>
</template>
<script>
export default {
	components: {
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