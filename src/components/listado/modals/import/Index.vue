<template>
	<import-component
	model_name="article"
	:props_to_send="props_to_send"
	file_name="articulos-base"
	:advises="advises"
	:columns="columns"
	:actions="actions">
		<select-provider
		:props_to_send="props_to_send"></select-provider>

		<!--
			Mision costo-bruto-por-condicion-fiscal (20/8/2026): declaracion de si los costos de
			ESTA planilla vienen brutos (con IVA adentro) o netos. Es el equivalente, para el
			import, del flag "precios_incluyen_iva" de la compra a proveedor: quien carga el costo
			declara que es ese numero, y el sistema guarda siempre el neto.

			Va adentro de "props_to_send" y no como data suelta porque ese objeto es el unico
			carril por el que el importador generico (common-vue/components/import/Index.vue)
			mete claves extra en el FormData: recorre sus keys y hace form_data.append(key, valor).
			Mismo carril que usa "provider_id".
		-->
		<b-form-group>
			<b-form-checkbox
			id="import-precios_incluyen_iva"
			data-testid="import-precios_incluyen_iva"
			v-model="props_to_send.precios_incluyen_iva"
			:value="1"
			:unchecked-value="0">
				Los costos de esta planilla son BRUTOS (ya tienen el IVA adentro)
			</b-form-checkbox>
			<small class="text-muted d-block m-t-5">
				El costo del artículo se guarda siempre NETO, sin IVA.
				<span v-if="costos_de_la_planilla_son_brutos">
					Como está activada, el costo de cada fila del Excel se toma como BRUTO: ya tiene el IVA adentro y el sistema se lo saca con la alícuota de ese artículo para guardar el neto. Un artículo Exento, No Gravado o al 0% no tiene IVA para sacarle: su costo se importa tal cual.
				</span>
				<span v-else>
					Como está desactivada, el costo de cada fila del Excel se toma como NETO y se importa tal cual, sin tocarlo. Es como venía funcionando la importación hasta ahora.
				</span>
			</small>
		</b-form-group>
		<hr>

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
				/*
					Arranca en 0 (= los costos del Excel son netos) porque ese es el comportamiento
					historico del import: una planilla que hoy importa bien tiene que seguir dando
					el mismo resultado si nadie toca el control.

					Viaja como 1/0 y NO como true/false a proposito: el FormData serializa todo a
					string, y del otro lado `(bool) 'false'` en PHP da TRUE, o sea que mandar la
					palabra "false" activaria el desglose de IVA justo en el caso en que el usuario
					NO lo pidio. Con 1/0, `(bool) '0'` da false y no hay forma de que se de vuelta.
					Es el mismo formato en el que ya viajan los blank_flags ("blank_<columna>" en
					common-vue/components/import/Index.vue) y el resto de los checks de esta pantalla.
				*/
				precios_incluyen_iva: 0,
			}
		}
	},
	computed: {
		/**
		 * Estado del control "Los costos de esta planilla son BRUTOS", normalizado a booleano.
		 * Solo se usa para elegir cual de los dos textos de ayuda mostrar.
		 *
		 * @return {Boolean}
		 */
		costos_de_la_planilla_son_brutos() {
			return Number(this.props_to_send.precios_incluyen_iva) === 1
		},
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
					description: 'Si no existe, se crea automaticamente al importar.',
					relation_options: {
						store_module: 'provider',
						prefix: 'Valores existentes:',
					},
				},



				{
					group_title: 'Precio',
				},
				{
					text: 'Moneda',
					description: 'USD para Dolares, ARS para pesos (ARS por defecto)',
				},
				{
					text: 'Costo',
					// La aclaracion sobre el IVA dejo de ser fija: ahora depende del check
					// "Los costos de esta planilla son BRUTOS" que esta mas abajo en el mismo modal.
					// Si esta descripcion sigue diciendo "sin IVA" a secas, contradice al control y
					// el usuario no sabe cual de los dos le esta hablando.
					description: 'Costo que pago a su proveedor al comprar este articulo. Coloquelo sin descuentos: esos datos se colocan por fuera del costo para tener mejor articulado el calculo del "Precio Final". Que el costo lleve o no el IVA adentro lo define el check "Los costos de esta planilla son BRUTOS (ya tienen el IVA adentro)", mas abajo en este mismo modal: desactivado, el costo va NETO (sin IVA) y se importa tal cual; activado, va BRUTO (con IVA) y el sistema se lo saca antes de guardarlo.',
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
					description: 'Valor por defecto: 21%. Coloque el porcentaje o texto tal como figura en el sistema.',
					relation_options: {
						store_module: 'iva',
						value_prop: 'percentage',
					},
				},
				{
					text: 'Aplicar IVA',
					description: 'Valor por defecto: "Si". Indique si quiere el el IVA del articulo se sume a su costo para obtener el "Costo Real". Valores posibles: "Si" y "No".',
				},
				{
					text: 'Margen de ganancia',
					description: 'Porcentaje de rentabilidad que quiere aplicar el "Costo Real"'
				},
				{
					text: 'Precio',
					description: 'Utilice este campo si quere saltearse el proceso de calcular el "Precio Final" de forma automatica (costo + iva + margen de ganancia), y en su lugar quiere fijar manualmente el "Precio Final". Lo que coloque aqui se utilizara como "Precio final/Precio de venta"',
					saltear_posiciones: 1,
				},

				

				{
					group_title: 'Categoria',
				},
				{
					text: 'Categoria',
					description: 'Si no existe, se crea automaticamente al importar.',
					relation_options: {
						store_module: 'category',
						prefix: 'Valores existentes:',
					},
				},
				{
					text: 'Sub categoria',
					description: 'Debe corresponder a la categoria indicada. Si no existe, se crea.',
					relation_options: {
						store_module: 'sub_category',
						prefix: 'Valores existentes:',
					},
				},
				{
					text: 'Marca',
					description: 'Si no existe, se crea automaticamente al importar.',
					relation_options: {
						store_module: 'brand',
						prefix: 'Valores existentes:',
					},
				},
				{
					text: 'Descripcion',
					description: 'Utilice este campo como informacion complementaria del articulo, para de esa forma no tener un "Nombre tan extenso". Esta descripcion esta incluida como criterio de busqueda en el modulo de VENDER'
				},
				{
					text: 'Unidad medida',
					description: 'Por defecto es UNIDAD. Debe coincidir con uno de los siguientes valores.',
					relation_options: {
						store_module: 'unidad_medida',
					},
					// saltear_posiciones: 1,
				},
				{
					text: 'U individuales',
					description: 'Indica por cuantas unidades individuales esta compuesto este articulo, solo si planeas vender las unidades individuales de este articulo en lugar de el articulo completo.',
					// saltear_posiciones: 1,
				},
			]





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

			columns.push({
				group_title: 'Stock',
			})

			if (this.addresses.length) {

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
			} else {
				
				columns.push({
					text: 'Stock actual',
				})
				columns.push({
					text: 'Stock minimo',
				})
			}


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


				let index_aplicar_iva = columns.findIndex(col => col.text == 'Aplicar IVA')

				// Lo aumento para que se inserten luego del indice
				index_aplicar_iva++


				this.price_types.forEach(price_type => {
					columns.splice(
						index_aplicar_iva,
						0,
						{text: '$ Final '+price_type.name,}
					)
					columns.splice(
						index_aplicar_iva,
						0,
						{text: '% '+price_type.name,}
					)
					columns.splice(
						index_aplicar_iva,
						0,
						{text: 'Setear precio final '+price_type.name,}
					)
				})
				
			} else {


				// let index_unidad_medida = columns.findIndex(col => col.text == 'Unidad medida')
				// columns[index_unidad_medida].saltear_posiciones = 1
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
		actions() {
			return [
				'provider/getModels',
				'iva/getModels',
				'category/getModels',
				'sub_category/getModels',
				'brand/getModels',
				'unidad_medida/getModels',
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