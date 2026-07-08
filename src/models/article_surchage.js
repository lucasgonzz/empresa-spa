export default {
	properties: [
		{
			text: 'Porcentaje',
			key: 'percentage',
			type: 'number',
			is_title: true,
		},
		{
			// Clasifica el origen/motivo del recargo. Los recargos creados automaticamente por el prorrateo de flete de una compra (prompt 264) llegan con este tipo ya asignado
			text: 'Tipo',
			key: 'tipo',
			type: 'select',
			value: 'otro',
			options: [
				{ value: 'transporte', text: 'Transporte' },
				{ value: 'seguro', text: 'Seguro' },
				{ value: 'arancel_importacion', text: 'Arancel/Importación' },
				{ value: 'otro', text: 'Otro' },
			],
			descriptions: [
				'Clasifica el motivo del recargo.',
				'"Transporte", "Seguro" y "Arancel/Importación" son los tipos que tambien se pueden cargar como costo extra en una orden de compra; si la compra tiene flete, el prorrateo (prompt 264) crea o actualiza automaticamente el recargo del articulo con ese mismo tipo.',
				'"Otro": cualquier otro recargo cargado manualmente, no se prorratea automaticamente.',
			],
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
				'Si se desactiva, este recargo se aplicara al costo a la hora de calcular el "Costo Real".',
			]
		},
	],
	singular_model_name_spanish: 'Recargo',
	plural_model_name_spanish: 'Recargos',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}