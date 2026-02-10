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
					group_title: 'Datos Generales',
				},
				{
					text: 'Numero',
					can_not_ignore: true,
				},
				{
					text: 'Codigo de barras',
					can_not_ignore: true,
				},
				{
					text: 'Sku',
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
					text: 'Proveedor',
				},


				{
					group_title: 'Categoria',
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
					group_title: 'Stock',
				},
				{
					text: 'Stock actual',
				},
				{
					text: 'Stock minimo',
				},


				{
					group_title: 'Precio',
				},
				{
					text: 'Costo',
					description: 'Costo que pago a su proveedor al comprar este articulo. Coloque el valor literal, sin descuentos ni IVA, esos datos se colocan por fuera del costo para tener mejor articulado el calculo del "Precio Final"',
				},
				{
					text: 'Descuentos',
					description: 'Los Descuentos se aplican al costo inmediatamente antes de aplicar IVA, se esa forma se obtiene el "Costo Real". Separe los diferentes descuentos con un guion bajo ( _ )',
				},
				{
					text: 'Recargos',
					description: 'Los Recargos se aplican al costo inmediatamente antes de aplicar IVA, se esa forma se obtiene el "Costo Real". Separe los diferentes recargos con un guion bajo ( _ ). Si quiere que se aplique al final del precio (luego de haber calculado el "Costo real" y aplicado el "Margen de ganancia"), coloque una F al final, ej: para aplicar un 10% y un 5% al final coloque: 10_5F',
				},
				{
					text: 'Descuentos montos',
					description: 'Los Descuentos se aplican al costo inmediatamente antes de aplicar IVA, se esa forma se obtiene el "Costo Real". Separe los diferentes descuentos con un guion bajo ( _ )',
				},
				{
					text: 'Recargos montos',
					description: 'Los Recargos se aplican al costo inmediatamente antes de aplicar IVA, se esa forma se obtiene el "Costo Real". Separe los diferentes recargos con un guion bajo ( _ ). Si quiere que se aplique al final del precio (luego de haber calculado el "Costo real" y aplicado el "Margen de ganancia"), coloque una F al final, ej: para aplicar un monto de 10 y un monto de 5 al final coloque: 10_5F',
				},
				{
					text: 'Iva',
					description: 'Alicuota de IVA que tiene este articulo, coloque el VALOR REAL ya que este dato sera usado en caso de hacer una FACTURA por la venta de este articulo',
				},
				{
					text: 'Aplicar IVA',
					description: 'Indique si quiere el el IVA del articulo se sume a su costo para obtener el "Costo Real". Valores posibles: "Si" y "No". Valor por defecto: "Si"',
				},
				{
					text: 'Margen de ganancia',
					description: 'Porcentaje de rentabilidad que quiere aplicar el "Costo Real"'
				},
				{
					text: 'Precio',
					description: 'Utilice este campo si quere saltearse el proceso de calcular el "Precio Final" de forma automatica (costo + iva + margen de ganancia), y en su lugar quiere fijar manualmente el "Precio Final". Lo que coloque aqui se utilizara como "Precio final/Precio de venta"',
				},
				{
					text: 'Moneda',
					description: 'USD para Dolares, ARS para pesos (ARS por defecto)',
				},
				{
					text: 'Descripcion',
					description: 'Utilice este campo como informacion complementaria del articulo, para de esa forma no tener un "Nombre tan extenso". Esta descripcion esta incluida como criterio de busqueda en el modulo de VENDER'
				},
				{
					text: 'Unidad medida',
					description: 'Por defecto es UNIDAD. Tambien puede ser "Gramo", "Kilo", "Litro", "Centimetro", "Metro", "Rollo", "Par"',
					// saltear_posiciones: 1,
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
						group_title: 'Autopartes',
					},
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

			// if (this.addresses.length) {
			// 	columns.splice(7, 1)
			// }

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

				let index_precio = columns.findIndex(col => col.text == 'Precio')
				columns.splice(index_precio, 1)

				let index_margen_de_ganancia = columns.findIndex(col => col.text == 'Margen de ganancia')
				columns.splice(index_margen_de_ganancia, 1)


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
				
			} else {


				let index_unidad_medida = columns.findIndex(col => col.text == 'Unidad medida')
				columns[index_unidad_medida].saltear_posiciones = 1
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