export default {
	properties: [
		{
			text: 'Porcentaje',
			key: 'percentage',
			type: 'number',
			is_title: true,
		},
		{
			text: 'Monto',
			key: 'amount',
			type: 'number',
			is_price: true,
		},
		{
			text: 'Aplicar al final luego del Margen de ganancia',
			key: 'luego_del_precio_final',
			type: 'checkbox',
			descriptions: [
				'Si se activa, este recargo se aplicara al final del proceso de calcular el "Precio Final" luego del "Margen de ganancia".',
				'Si se desactiva, este recargo se aplicara al costo a la hora d calcular el "Costo Real".',
			]
		},
	],
	singular_model_name_spanish: 'Recargo',
	plural_model_name_spanish: 'Recargos',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}