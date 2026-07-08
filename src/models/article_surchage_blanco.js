export default {
	properties: [
		{
			text: 'Porcentaje',
			key: 'percentage',
			type: 'number',
			is_title: true,
		},
		{
			// Clasifica el origen/motivo del recargo en blanco, misma convencion que article_surchage (tipo)
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
				'Clasifica el motivo del recargo en blanco.',
				'"Transporte", "Seguro" y "Arancel/Importación" son los mismos tipos disponibles en costos extra de compra y en el recargo normal del articulo.',
				'"Otro": cualquier otro recargo cargado manualmente.',
			],
		},
	],
	singular_model_name_spanish: 'Recargo en blanco',
	plural_model_name_spanish: 'Recargos en blanco',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}