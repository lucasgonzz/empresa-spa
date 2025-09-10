<template>
	<import
	:props_to_send="props_to_send"
	model_name="provider_order"
	model_name_spanish="articulos"
	:pedir_operacion_a_realizar="false"
	:columns="columns"></import>	
</template>
<script>
export default {
	components: {
		Import: () => import('@/common-vue/components/import/Index'),
	},
	computed: {
		model() {
			return this.$store.state.provider_order.model
		},
		props_to_send() {
			return {
				provider_order_id: this.model.id,
			}
		},
		columns() {
			let columns = [
				{
					text: 'Codigo de barras',
				},
				{
					text: 'Codigo de proveedor',
				},
				{
					text: 'Nombre',
				},
				{
					text: 'Cantidad',
				},
				{
					text: 'Costo',
				},
				// {
				// 	text: 'Costo Recibido',
				// },
				{
					text: 'Notas',
				},
				// {
				// 	text: 'Recibidas',
				// },
			]
			let index = 1
			columns.forEach(column => {
				column.column = index
				index++
			})
			return columns
		},
		actions() {
			return [
				'provider/getModels',
				'iva/getModels',
				'categories/getCategories',
				'sub_categories/getSubCategories',
			]
		},
	}
}
</script>