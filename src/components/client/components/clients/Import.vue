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
					key: 'numero',
					can_not_ignore: true,
				},
				{
					text: 'Nombre',
					key: 'nombre',
					can_not_ignore: true,
				},
				{
					text: 'Telefono',
					key: 'telefono',
				},
				{
					text: 'Direccion',
					key: 'direccion',
				},
				{
					text: 'Provincia',
					key: 'provincia',
					description: 'Si no existe, se crea automaticamente al importar.',
					relation_options: {
						store_module: 'provincia',
					},
				},
				{
					text: 'Localidad',
					key: 'localidad',
					description: 'Indicar junto con la provincia. Si no existe, se crea en la provincia indicada.',
				},
				{
					text: 'Email',
					key: 'email',
				},
				{
					text: 'Condicion frente al iva',
					key: 'condicion_frente_al_iva',
					description: 'Debe coincidir exactamente con uno de los siguientes valores.',
					relation_options: {
						store_module: 'iva_condition',
					},
				},
				{
					text: 'Razon social',
					key: 'razon_social',
				},
				{
					text: 'Cuit',
					key: 'cuit',
				},
				{
					text: 'Dni',
					key: 'dni',
				},
				{
					text: 'Cuil',
					key: 'cuil',
				},
				{
					text: 'Saldo actual',
					key: 'saldo_actual',
				},
				{
					text: 'Descripcion',
					key: 'descripcion',
				},
				{
					text: 'Vendedor',
					key: 'vendedor',
					description: 'Si no existe, se crea automaticamente al importar.',
					relation_options: {
						store_module: 'seller',
						prefix: 'Valores existentes:',
					},
				},
				{
					text: 'Tipo de precio',
					key: 'tipo_de_precio',
					description: 'Si no existe, se crea automaticamente al importar.',
					relation_options: {
						store_module: 'price_type',
						prefix: 'Valores existentes:',
					},
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
				'iva_condition/getModels',
				'price_type/getModels',
				'provincia/getModels',
				'location/getModels',
				'seller/getModels',
			]
		},
 	},
}
</script>
