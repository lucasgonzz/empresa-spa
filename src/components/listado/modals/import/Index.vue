<template>
	<import-component
	model_name="article"
	:props_to_send="props_to_send"
	file_name="articulos-base"
	:advises="advises"
	:identifications="identifications"
	:columns="columns"
	:actions="actions">
		<select-provider
		:props_to_send="props_to_send"></select-provider>
	</import-component>
</template>
<script>
export default {
	components: {
		ImportComponent: () => import('@/common-vue/components/import/Index'),
		SelectProvider: () => import('@/components/listado/modals/import/SelectProvider') 
	},
	data() {
		return {
			props_to_send: {
				provider_id: 0,
			}
		}
	},
	computed: {
		columns() {
			let columns = [
				{
					text: 'Numero',
					can_not_ignore: true,
				},
				{
					text: 'Codigo de barras',
					can_not_ignore: true,
				},
				{
					text: 'Codigo de proveedor',
					can_not_ignore: true,
				},
				{
					text: 'Nombre',
					can_not_ignore: true,
				},
				{
					text: 'Categoria',
				},
				{
					text: 'Sub categoria',
				},
				{
					text: 'Stock actual',
				},
				{
					text: 'Stock minimo',
				},
				{
					text: 'Iva',
				},
				{
					text: 'Proveedor',
				},
				{
					text: 'Costo',
				},
				{
					text: 'Margen de ganancia',
				},
				{
					text: 'Descuentos',
					description: 'Separe los diferentes descuentos con un guion bajo ( _ )',
				},
				{
					text: 'Recargos',
					description: 'Separe los diferentes recargos con un guion bajo ( _ )',
				},
				{
					text: 'Precio',
				},
				{
					text: 'Moneda',
					description: 'USD para Dolares, ARS para pesos (ARS por defecto)',
				},
				{
					text: 'Unidad medida',
					description: 'Por defecto es UNIDAD',
				},
			]


			// if (this.hasExtencion('articulos_con_propiedades_de_distribuidora')) {

			// 	columns.push({
			// 		text: 'Tipo de envase',
			// 	})
			// 	columns.push({
			// 		text: 'Contenido',
			// 	})
			// 	columns.push({
			// 		text: 'U x Bulto',
			// 	})
			// }

			let index = 1
			columns.forEach(column => {
				column.column = index
				index++
			})
			return columns
		},
		identifications() {
			return [
				'Código de Barras',
				'Código de Proveedor',
			]
		},
		actions() {
			return [
				'provider/getModels',
				'iva/getModels',
				'category/getModels',
				'sub_category/getModels',
			]
		},
		advises() {
			return [
				'No modificar la columna PRECIO FINAL ya que esta propiedad se calcula luego de definir los costos y marguenes de ganancia.'
			]
		}
 	},
}
</script>