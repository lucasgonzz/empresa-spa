<template>
	<div>
		{{ article.stock }}
		<b-button
		size="sm"
		class="m-l-10"
		@click.stop="stockMovement"
		variant="primary">
			<i class="icon-edit"></i>
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
		} 
	}
}
</script>