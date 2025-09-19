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
					text: 'Marca',
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
					text: 'Aplicar IVA',
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
					text: 'Descuentos montos',
					description: 'Separe los diferentes descuentos con un guion bajo ( _ )',
				},
				{
					text: 'Recargos montos',
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
					text: 'descripcion'
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



			if (this.hasExtencion('autopartes')) {
				let props = [
					{
						text: 'espesor',
					},
					{
						text: 'modelo'
					},
					{
						text: 'pastilla'
					},
					{
						text: 'diametro'
					},
					{
						text: 'litros'
					},
					// {
					// 	text: 'descripcion'
					// },
					{
						text: 'contenido'
					},
					{
						text: 'cm3'
					},
					{
						text: 'calipers'
					},
					{
						text: 'juego'
					},
				]

				columns.push(...props)
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
				columns.push({
					text: 'Min '+address.street,
				})
				columns.push({
					text: 'Max '+address.street,
				})
			})


			if (this.hasExtencion('article_variants')) {

				this.article_property_types.forEach(model => {
					columns.push({
						text: model.name,
					})
				})
				
			}


			if (this.hasExtencion('articulo_margen_de_ganancia_segun_lista_de_precios')) {

				this.price_types.forEach(price_type => {
					columns.push({
						text: 'Setear precio final '+price_type.name,
						// saltear_posiciones: 1,
					})
					columns.push({
						text: '% '+price_type.name,
						// saltear_posiciones: 1,
					})
					columns.push({
						text: '$ Final '+price_type.name,
						// saltear_posiciones: 2,
					})
				})
				
			}



			if (this.hasExtencion('articulos_en_exhibicion')) {

				this.addresses.forEach(address => {
					columns.push({
						text: 'Exhibicion '+address.street,
					})
				})
			}



			console.log(columns)
			return columns
		},
		addresses() {
			return this.$store.state.address.models
		},
		article_property_types() {
			return this.$store.state.article_property_type.models
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
				'brand/getModels',
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