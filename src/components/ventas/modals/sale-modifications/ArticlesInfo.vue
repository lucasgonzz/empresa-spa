<template>
<b-modal
hide-footer
size="lg"
:title="title"
id="sale-modification-articles-info">
	<p>
		Articulos antes de actualizar
	</p>
	<b-table
	head-variant="dark"
	responsive
	:fields="fields"
	:items="articulos_antes_de_actualizar"></b-table>
	<p>
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
	// Se agregaron las propiedades _rowVariant para colorear las filas según los cambios en los artículos (agregados, eliminados o cantidad modificada).
	computed: {
		fields() {
			return [
				{
					key: 'nombre',
				},
				{
					key: 'cantidad',
				},
				{
					label: 'U. chequeadas',
					key: 'unidades_chequeadas',
				},
			]
		},
		articulos_antes_de_actualizar() {
			let items = []
			if (this.sale_modification) {
				this.sale_modification.articulos_antes_de_actualizar.forEach(article_antes => {
					let item = {
						nombre : article_antes.name,
						cantidad : article_antes.pivot.amount,
						unidades_chequeadas : article_antes.pivot.checked_amount,
					}
					let article_despues = this.sale_modification.articulos_despues_de_actualizar.find(article => article.id == article_antes.id)
					if (article_despues) {
						if (article_despues.pivot.amount != article_antes.pivot.amount) {
							item._rowVariant = 'warning'
						}
					} else {
						item._rowVariant = 'danger'
					}
					items.push(item)
				})
			} 
			return items
		},
		articulos_despues_de_actualizar() {
			let items = []
			if (this.sale_modification) {
				this.sale_modification.articulos_despues_de_actualizar.forEach(article_despues => {
					let item = {
						nombre : article_despues.name,
						cantidad : article_despues.pivot.amount,
						unidades_chequeadas : article_despues.pivot.checked_amount,
					}
					let article_antes = this.sale_modification.articulos_antes_de_actualizar.find(article => article.id == article_despues.id)
					if (article_antes) {
						if (article_antes.pivot.amount != article_despues.pivot.amount) {
							item._rowVariant = 'warning'
						}
					} else {
						item._rowVariant = 'success'
					}
					items.push(item)
				})
			} 
			return items
		},
		title() {
			if (this.sale_modification) {
				return 'Modificaciones al pasar de "'+this.sale_modification.estado_antes_de_actualizar+'" hacia "'+this.sale_modification.estado_despues_de_actualizar+'"'
			}
			return ''
		}
	},
}
</script>