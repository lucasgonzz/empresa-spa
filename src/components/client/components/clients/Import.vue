<template>
	<import-component
	model_name="client"
	file_name="clientes-base"
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
					text: 'Numero',
					can_not_ignore: true,
				},
				{
					text: 'Nombre',
					can_not_ignore: true,
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
					text: 'Vendedor',
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
				'seller/getModels',
			]
		},
 	},
}
</script>