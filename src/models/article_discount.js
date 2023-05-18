export default {
	properties: [
		{
			text: 'Porcentaje',
			key: 'percentage',
			type: 'number',
			is_title: true,
		},
		{
			text: 'Mostrar en la tienda online',
			if_has_extencion: 'online',
			key: 'show_in_online',
			type: 'checkbox',
			value: 0,
		},
	],
	singular_model_name_spanish: 'Descuento',
	plural_model_name_spanish: 'Descuentos',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}