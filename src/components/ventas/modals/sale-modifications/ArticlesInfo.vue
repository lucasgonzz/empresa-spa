<template>
<b-modal
hide-footer
size="lg"
title="Modificaciones"
id="sale-modification-articles-info">
	<p class="title">
		Articulos antes de actualizar
	</p>
	<b-table
	head-variant="dark"
	responsive
	:fields="fields"
	:items="articulos_antes_de_actualizar"></b-table>
	<p class="title">
		Articulos despues de actualizar
	</p>
	<b-table
	head-variant="dark"
	responsive
	:fields="fields"
	:items="articulos_despues_de_actualizar"></b-table>
</b-modal>
</template>
<script>
export default {
	props: {
		sale_modification: Object,
	},
	computed: {
		fields() {
			return [
				{
					key: 'nombre',
				},
				{
					key: 'cantidad',
				},
			]
		},
		articulos_antes_de_actualizar() {
			let items = []
			if (this.sale_modification) {
				this.sale_modification.articulos_antes_de_actualizar.forEach(article => {
					items.push({

						nombre : article.name,
						cantidad : article.pivot.amount,
					
					})
				})
			} 
			return items
		},
		articulos_despues_de_actualizar() {
			let items = []
			if (this.sale_modification) {
				this.sale_modification.articulos_despues_de_actualizar.forEach(article => {
					items.push({

						nombre : article.name,
						cantidad : article.pivot.amount,
					
					})
				})
			}
			return items
		},
	},
}
</script>