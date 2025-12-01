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
		},
		{
			text: 'Importe IVA',
			key: 'importe_iva',
			type: 'number',
			is_price: true,
			description: 'Si completa este campo, el valor impactara en el valor de IVA CREDITO en el modulo de REPORTES',
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
			key: 'payment_methods',
			type: 'button',
      text: 'Metodos de Pago',
			button: {
				button_text: 'Seleccionar',
				badge: {
					function: 'get_payment_methods_count',
					variant: 'success',
				},
				call_functions: [
					{
						name: 'showSelectPaymentMethodModal',
						params: [
							'expense'
						]
					}
				]
			},
			check_can_edit: true,
		},
		{
			key: 'payment_methods_table',
			type: 'display',
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