<template>
	<div
	class="j-center">
			
		<!--
			align-center: en edición los botones Cancelar y Guardar stock van apilados, y sin esto el
			botón azul del stock se estiraba al alto de los dos.

			En edición la celda pasa a columna (botón azul arriba, Cancelar y Guardar stock abajo): la
			columna Stock mide 200px y su contenedor (`.cont-tr`, 170px útiles) recorta lo que sobra;
			al lado del botón azul, "Guardar stock" quedaba cortado (medido en el slot el 14/10/2026).
		-->
		<div
		class="j-center align-center"
		:class="{'stock-btn-celda--editando': se_esta_editando_stock}"
		v-if="can('article.edit_stock')">
			
			<stock-btn
			:article="article"></stock-btn>

			<edit-addresses-stock-btn
			:article="article"></edit-addresses-stock-btn>
		</div> 

		<span
		v-else>
			{{ numero_es(article.stock) }}
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
	computed: {
		// Mismo criterio que EditAddressesStockBtn.vue y StockBtn.vue: la fila en edición se
		// compara por id.
		se_esta_editando_stock() {
			let article = this.$store.state.article.edit_addresses_stock.article
			return article && article.id == this.article.id
		},
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
<style lang="sass">
// En edición: botón azul arriba y Cancelar / Guardar stock abajo (ver el comentario del template).
.stock-btn-celda--editando
	flex-direction: column

	.edit-addresses-stock-btn__acciones
		margin-left: 0
		margin-top: 8px
</style>
