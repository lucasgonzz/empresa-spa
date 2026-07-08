export default {
	properties: [
		{
			text: 'Descripcion',
			key: 'description',
			type: 'text',
		},
		{
			text: 'Valor',
			key: 'value',
			type: 'number',
			is_price: true,
		},
		{
			// Clasifica el costo extra. Si el tipo es Transporte/Seguro/Arancel-Importacion, el backend prorratea este costo entre los articulos de la compra y crea/actualiza un recargo (article_surchage) del mismo tipo en cada articulo (prompt 264)
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
				'Clasifica el costo extra de la compra.',
				'"Transporte", "Seguro" y "Arancel/Importación": el costo se prorratea automaticamente entre los articulos de la compra y se refleja como un recargo del mismo tipo en cada articulo.',
				'"Otro": el costo se suma al total de la compra pero NO se prorratea ni genera recargos en los articulos.',
			],
		},
	],
	singular_model_name_spanish: 'Costo Extra',
	plural_model_name_spanish: 'Costos Extra',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}