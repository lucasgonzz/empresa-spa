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
			console.log('Calculando columnas para importar:')
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
					saltear_posiciones: 1,
				},
			]


			if (this.hasExtencion('articulos_unidades_individuales')) {

				columns.push({
					text: 'U individuales',
				})
			}


			if (this.hasExtencion('articulos_con_propiedades_de_distribuidora')) {

				columns.push({
					text: 'Tipo de envase',
				})
				columns.push({
					text: 'Contenido',
				})
				columns.push({
					text: 'U x Bulto',
				})
			}

			this.addresses.forEach(address => {
				columns.push({
					text: address.street,
				})
			})


			if (this.hasExtencion('articulo_margen_de_ganancia_segun_lista_de_precios')) {

				this.price_types.forEach(price_type => {
					columns.push({
						text: '% '+price_type.name,
						saltear_posiciones: 2,
					})
				})
				
			}

			// let index = 1
			// columns.forEach(column => {
			// 	column.column = index
			// 	if (column.saltear_posiciones) {
			// 		index += column.saltear_posiciones
			// 	} else {
			// 		index++
			// 	}
			// })
			console.log(columns)
			return columns
		},
		addresses() {
			return this.$store.state.address.models
		},
		price_types() {
			return this.$store.state.price_type.models
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