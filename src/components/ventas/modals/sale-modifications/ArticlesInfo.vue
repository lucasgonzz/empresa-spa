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
				this.sale_modification.articulos_antes_de_actualizar.forEach(article => {
					items.push({

						nombre : article.name,
						cantidad : article.pivot.amount,
						unidades_chequeadas : article.pivot.checked_amount,
					
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
						unidades_chequeadas : article.pivot.checked_amount,
					
					})
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