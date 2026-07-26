export default {
	properties: [
		{
			text: 'Caja',
			key: 'caja_id',
			type: 'select',
			use_store_models: true,
		},
		{
			text: 'Método de pago',
			key: 'current_acount_payment_method_id',
			store: 'current_acount_payment_method',
			type: 'select',
			use_store_models: true,
		},
		{
			text: 'Días de liquidación',
			key: 'dias_liquidacion',
			type: 'number',
			value: null,
			descriptions: [
				'Vacío = hereda el valor configurado en la caja. Un valor cargado acá pisa el de la caja solo para este método de pago.',
			],
		},
		{
			text: '% de comisión',
			key: 'comision_porcentaje',
			type: 'number',
			value: null,
			descriptions: [
				'Vacío = hereda el % de comisión de la caja. Un valor cargado acá pisa el de la caja solo para este método de pago.',
			],
		},
		{
			text: 'Concepto de gasto de la comisión',
			key: 'expense_concept_id',
			type: 'select',
			use_store_models: true,
			value: null,
			descriptions: [
				'Vacío = hereda el concepto configurado en la caja.',
			],
		},
		{
			text: 'Alícuota de IVA de la comisión',
			key: 'comision_iva_alicuota',
			type: 'number',
			value: null,
			descriptions: [
				'Vacío = hereda la alícuota configurada en la caja.',
			],
		},
		{
			text: 'El % de comisión ya incluye IVA',
			key: 'comision_iva_incluido',
			type: 'checkbox',
			value: null,
			descriptions: [
				'Vacío = hereda de la caja. No confundir "vacío" con "no" (false es un override explícito).',
			],
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Override de la configuración de liquidación y comisión de una caja, particular para un método de pago (ej. Mercado Pago liquida distinto QR, débito y cuotas).',
		implicancias: 'Cuando existe un override para la combinación caja + método de pago, sus valores ganan por sobre los de la caja para los cobros hechos con ese método. Los campos vacíos siguen heredando de la caja.',
		como_se_utiliza: 'Se administra desde el botón de configuración de liquidez dentro de la caja, listando los métodos de pago y permitiendo cargar overrides puntuales.',
		palabras_clave: ['override', 'comisión', 'liquidación', 'método de pago'],
	},
	singular_model_name_spanish: 'Override de liquidación',
	plural_model_name_spanish: 'Overrides de liquidación',
	create_model_name_spanish: 'Nuevo override de liquidación',
	text_delete: 'el',
}
