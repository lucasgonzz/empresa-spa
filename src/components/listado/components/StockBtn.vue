<template>
	<div
	class="j-center">
			
		<b-button
		size="sm"
		class="m-l-10"
		id="btn_asignar_stock"
		data-testid="btn-asignar-stock"
		:disabled="se_esta_editando_stock"
		:title="se_esta_editando_stock ? 'Terminá la edición de depósitos para asignar stock' : ''"
		@click.stop="stockMovement"
		variant="outline-primary">
			<span
			v-if="article.stock !== null">
				{{ numero_es(article.stock) }}
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
	computed: {
		selected_article() {
			return this.$store.state.article.edit_addresses_stock.article
		},
		se_esta_editando_stock() {
			return this.selected_article && this.selected_article.id == this.article.id
		}
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