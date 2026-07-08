export default {
	properties: [
		{
			text: 'Porcentaje',
			key: 'percentage',
			type: 'number',
			is_title: true,
		},
		{
			// Clasifica el origen/motivo del descuento. Se usa para diferenciar descuentos cargados manualmente de las bonificaciones de proveedor (prompt 262/264)
			text: 'Tipo',
			key: 'tipo',
			type: 'select',
			value: 'otro',
			options: [
				{ value: 'bonificacion_proveedor', text: 'Bonificación proveedor' },
				{ value: 'otro', text: 'Otro' },
			],
			descriptions: [
				'Clasifica el motivo del descuento.',
				'"Bonificación proveedor": descuento originado por una bonificación cargada en la ficha del proveedor.',
				'"Otro": cualquier otro descuento cargado manualmente.',
			],
		},
		{
			text: 'Monto',
			key: 'amount',
			type: 'number',
			is_price: true,
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