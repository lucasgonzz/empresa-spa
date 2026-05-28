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
					description: 'Si no existe, se crea automaticamente al importar.',
					relation_options: {
						store_module: 'location',
						prefix: 'Valores existentes:',
					},
				},
				{
					text: 'Email',
				},
				{
					text: 'Condicion frente al IVA',
					description: 'Debe coincidir exactamente con uno de los siguientes valores.',
					relation_options: {
						store_module: 'iva_condition',
					},
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
				'iva_condition/getModels',
				'location/getModels',
			]
		},
 	},
}
</script>