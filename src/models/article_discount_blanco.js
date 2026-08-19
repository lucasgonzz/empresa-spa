export default {
	properties: [
		{
			text: 'Porcentaje',
			key: 'percentage',
			type: 'number',
			is_title: true,
		},
		{
			// Clasifica el origen/motivo del descuento en blanco, misma convencion que article_discount (tipo)
			text: 'Tipo',
			key: 'tipo',
			type: 'select',
			value: 'otro',
			options: [
				{ value: 'bonificacion_proveedor', text: 'Bonificación proveedor' },
				{ value: 'otro', text: 'Otro' },
			],
			descriptions: [
				'Clasifica el motivo del descuento en blanco.',
				'"Bonificación proveedor": descuento originado por una bonificación cargada en la ficha del proveedor.',
				'"Otro": cualquier otro descuento cargado manualmente.',
			],
		},
	],
	singular_model_name_spanish: 'Descuento en blanco',
	plural_model_name_spanish: 'Descuentos en blanco',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}