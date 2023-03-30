<template>
	<import-component
	model_name="client"
	:columns="columns"
	:actions="actions">
	</import-component>
</template>
<script>
export default {
	components: {
		ImportComponent: () => import('@/common-vue/components/import/Index'),
	},
	computed: {
		columns() {
			let columns = [
				{
					text: 'Codigo',
				},
				{
					text: 'Nombre',
				},
				{
					text: 'Telefono',
				},
				{
					text: 'Direccion',
				},
				{
					text: 'Localidad',
				},
				{
					text: 'Email',
				},
				{
					text: 'Condicion frente al iva',
				},
				{
					text: 'Razon social',
				},
				{
					text: 'Cuit',
				},
				{
					text: 'Saldo actual',
				},
				{
					text: 'Descripcion',
				},
				{
					text: 'Tipo de precio',
				},
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
				'price_type/getModels',
				'location/getModels',
			]
		},
 	},
}
</script>