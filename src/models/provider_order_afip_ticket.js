export default {
	properties: [
		{
			text: 'Fecha de emision',
			key: 'issued_at',
			type: 'date',
			value: '',
			show: true,
			is_date: true,
		},
		{
			text: 'Numero',
			key: 'code',
			type: 'text',
			value: '',
			show: true,
			is_title: true,
		},
		{
			text: 'Total',
			key: 'total',
			type: 'number',
			is_price: true,
			value: '',
			show: true,
		},
		{
			text: 'Total IVA',
			key: 'total_iva',
			type: 'number',
			is_price: true,
			value: '',
			only_show: true,
			show: true,
		},
		{
			text: 'Ivas',
			key: 'provider_order_afip_ticket_ivas',
			has_many: {
				text: 'Ivas',
				model_name: 'provider_order_afip_ticket_iva',
			}
		},


		{
			group_title: 'Retenciones'
		},
		{
			key: 'retencion_iibb',
			type: 'number',
			is_price: true,
			value: '',
			show: true,
		},
		{
			key: 'retencion_iva',
			type: 'number',
			is_price: true,
			value: '',
			show: true,
		},
		{
			key: 'retencion_ganancias',
			type: 'number',
			is_price: true,
			value: '',
			show: true,
		},


		{
			group_title: 'Percepciones'
		},
		{
			key: 'percepcion_iibb',
			type: 'number',
			is_price: true,
			value: '',
			show: true,
		},
		{
			key: 'percepcion_iva',
			type: 'number',
			is_price: true,
			value: '',
			show: true,
		},
	],
	plural_model_name_spanish: 'Facturas',
	singular_model_name_spanish: 'Factura',
	create_model_name_spanish: 'Nueva factura',
	text_delete: 'esta',
}