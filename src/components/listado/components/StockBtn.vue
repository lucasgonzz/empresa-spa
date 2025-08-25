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
	</div>
</template>
<script>
export default {
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