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
			text: 'Monto',
			key: 'amount',
			type: 'number',
			is_price: true,
		},
		{
			text: 'Metodo de pago',
			key: 'current_acount_payment_method_id',
			type: 'select',
			use_store_models: true,
		},
		{
			text: 'Caja',
			key: 'caja_id',
			type: 'select',
			get_options_function: 'get_cajas_abiertas_options',
		},
		{
			text: 'Fecha',
			key: 'created_at',
			type: 'date',
			value: moment().format('YYYY-MM-DD'),
			not_show: true,
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
}