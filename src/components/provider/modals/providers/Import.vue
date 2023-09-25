<template>
	<import-component
	model_name="provider"
	file_name="proveedores-base"
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
					text: 'Condicion frente al IVA',
				},
				{
					text: 'Razon social',
				},
				{
					text: 'Cuit',
				},
				{
					text: 'Observaciones',
				},
				{
					text: 'Saldo actual',
				},
			]
			return columns
		},
		actions() {
			return [
				'provider/getModels',
				'location/getModels',
			]
		},
 	},
}
</script>