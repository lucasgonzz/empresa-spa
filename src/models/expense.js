import moment from 'moment'
export default {
	properties: [
		{
			text: 'N°',
			key: 'num',
			type: 'text',
			not_show_on_form: true,
			filter_type: 'number',
		},
		{
			text: 'Concepto',
			key: 'expense_concept_id',
			type: 'select',
			use_store_models: true,
		},
		{
			text: 'Moneda',
			key: 'moneda_id',
			type: 'select',
			use_store_models: true,
			if_has_extencion: 'ventas_en_dolares',
		},
		{
			text: 'Monto',
			key: 'amount',
			type: 'number',
			is_price: true,
			only_show: true,
		},
		{
			text: 'Importe IVA',
			key: 'importe_iva',
			type: 'number',
			is_price: true,
			descriptions: [
				'Si completa este campo, el valor impactara en el valor de IVA CREDITO en el modulo de REPORTES',
				'Debe estar SIEMPRE EN PESOS',
			],
		},
    	{
			text: 'Fecha',
			key: 'created_at',
			type: 'date',
			value: moment().format('YYYY-MM-DD'),
			not_show: true,
		},
    	{
			group_title: 'Metodos de Pago',
		},
		{
      		text: 'Seleccionar Metodos de Pago',
			key: 'payment_methods',
			not_show: true,
		},
		{
      		text: 'Metodos de Pago',
			key: 'current_acount_payment_methods',
			store: 'current_acount_payment_method',
			belongs_to_many: {
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',	
					},
				],
				pivot_props_to_show: [
					{
						text: 'Monto',
						key: 'amount',
						is_price: true,
					},
					{
						text: 'Moneda',
						key: 'moneda_id',
						use_store_models: true,
					},
					{
						text: 'Caja',
						key: 'caja_id',
						use_store_models: true,
					},
				],
			},
		},
	    {
			text: 'Observaciones',
			key: 'observations',
			type: 'textarea',
		},
	],
	singular_model_name_spanish: 'Gasto',
	plural_model_name_spanish: 'Gastos',
	create_model_name_spanish: 'Nuevo Gasto',
	text_delete: 'el',
	full_reactivity: true,
	// full_reactivity: true,
}