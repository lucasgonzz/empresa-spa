export default {
	properties: [
		{
			text: 'Alicuota',
			key: 'iva_id',
			type: 'select',
			show: true,
			relation_prop_name: 'percentage',
			use_store_models: true,
		},
		{
			text: 'Neto',
			key: 'neto',
			type: 'number',
			is_price: true,
			value: '',
			show: true,
			description: 'Base imponible de esta alicuota: el importe sin IVA. Se guarda en la base.',
		},
		{
			text: 'Importe IVA',
			key: 'iva_importe',
			type: 'number',
			is_price: true,
			value: '',
			show: true,
			description: 'El IVA de esta alicuota. Se guarda en la base y es lo que suma al Total IVA de la factura.',
		},
		{
			/*
				Mision `compras-factura-manual-alicuotas` (17/9/2026): la tercera columna.

				🔴 `bruto` NO ES UNA COLUMNA DE LA BASE Y NO VIAJA EN EL REQUEST. Es exactamente
				`neto + iva_importe`, o sea que guardarlo seria un tercer numero que se puede
				desincronizar de los otros dos, y despues hay que decidir cual de los tres tiene
				razon. Es un campo de pantalla.

				Como no se le escribe nunca al modelo, la clave ni siquiera existe en el objeto que
				se manda a la API: `getModelToSend()` (model/Index.vue:803) hace un spread del
				modelo, y lo que no esta no viaja. Ver AlicuotaCampo.vue: cuando la persona tipea
				en Bruto, lo que se escribe son `neto` e `iva_importe`, nunca `bruto`.

				`function` es lo que hace que la TABLA pueda mostrar la columna igual:
				`propertyText()` (common-vue/mixins/generals.js:955) delega en el metodo declarado
				aca y le aplica el formato de precio. Sin esto la columna saldria vacia en toda
				fila ya guardada, porque el modelo que devuelve la API no trae `bruto`.

				En el FORMULARIO no se usa `function` (que renderiza texto plano): ahi el input lo
				pone AlicuotaCampo.vue por el slot de la prop.
			*/
			text: 'Bruto',
			key: 'bruto',
			type: 'number',
			is_price: true,
			show: true,
			function: 'bruto_de_alicuota_de_factura',
			description: 'Neto + IVA: el importe con IVA de esta alicuota. No se guarda, se calcula.',
		},
	],
	plural_model_name_spanish: 'Alicuotas IVA',
	singular_model_name_spanish: 'Alicuota IVA',
	create_model_name_spanish: 'Nueva alicuota',
	text_delete: 'esta',
}
