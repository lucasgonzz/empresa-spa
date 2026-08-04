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
			text: 'Categoria',
			key: 'expense_category_id',
			type: 'select',
			use_store_models: true,
			on_change: 'limpiar_expense_concept_de_otra_categoria',
			descriptions: [
				'La categoria no se guarda a mano: sale del concepto que elijas.',
				'Si la elegis primero, el listado de conceptos se acota a los de esa categoria.',
			],
		},
		{
			text: 'Concepto',
			key: 'expense_concept_id',
			type: 'select',
			use_store_models: true,
			use_to_update: true,
			dynamic_options_function: 'expense_concept_options_de_la_categoria',
			on_change: 'set_expense_category_del_concepto',
		},
		{
			text: 'Moneda',
			key: 'moneda_id',
			type: 'select',
			use_store_models: true,
			use_to_update: true,
			if_has_extencion: 'ventas_en_dolares',
		},
		{
			text: 'Monto',
			key: 'amount',
			type: 'number',
			is_price: true,
			only_show: true,
			use_to_update: true,
		},
		{
			text: 'Importe IVA',
			key: 'importe_iva',
			type: 'number',
			is_price: true,
			use_to_update: true,
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