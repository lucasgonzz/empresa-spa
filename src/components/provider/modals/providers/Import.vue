<template>
	<import-component
	model_name="provider"
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
					text: 'Condicion de IVA',
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