<template>
<b-modal
hide-footer
size="lg"
title="Modificaciones"
id="sale-modifications">
	<b-table
	head-variant="dark"
	responsive
	:fields="fields"
	:items="items"></b-table>
</b-modal>
</template>
<script>
export default {
	data() {
		return {
			sale_modifications: [],
		}
	},
	computed: {
		fields() {
			return [
				{
					key: 'articulos_antes_de_actualizar',
				},
				{
					key: 'articulos_despues_de_actualizar',
				},
				{
					key: 'estado_antes_de_actualizar',
				},
				{
					key: 'estado_despues_de_actualizar',
				},
				{
					key: 'fecha',
				},
			]
		},
		items() {
			let items = []
			this.sale_modifications.forEach(sale_modification => {
				items.push({

					articulos_antes_de_actualizar : sale_modification.articulos_antes_de_actualizar.length,
					
					articulos_despues_de_actualizar : sale_modification.articulos_despues_de_actualizar.length,
					
					estado_antes_de_actualizar : sale_modification.estado_antes_de_actualizar,
					
					estado_despues_de_actualizar : sale_modification.estado_despues_de_actualizar,
					
					fecha : this.date(sale_modification.created_at, true)
				
				})
			})
			return items
		},
		sale() {
			return this.$store.state.sale.model 
		},
	},
	created() {
		this.$root.$on('bv::modal::show', (bvEvent, modalId) => {
			if (modalId == 'sale-modifications') {
				this.getSaleModifications()
			}
		})
	},
	methods: {
		getSaleModifications() {
			console.log('llamando getSaleModifications')
			this.$api.get('sale-modifications/'+this.sale.id)
			.then(res => {
				console.log(res.data.models)
				this.sale_modifications = res.data.models 
			})
			.catch(err => {
				console.log(err)
			})
		}
	},
}
</script>