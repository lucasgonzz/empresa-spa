export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			value: '',
			is_title: true,
		},
		{
			text: 'Margen por defecto',
			key: 'percentage',
			type: 'number',
			value: '',
			not_show: true,
			descriptions: [
				'Este margen de ganancia se le aplicara a todos los articulos que al momento de ser creados, no se le complete el margen de ganancia para esta lista de precios, ni tampoco se le complete el precio final de forma manual',
				'Si al momento de crear el articulo completa usted el campo, se usara ese valor y no se usara este valor',				
			]
		},
		// {
		// 	text: 'Aplicar margen por defecto en articulos ya creados',
		// 	key: 'apply_percentage_on_existing_articles',
		// 	type: 'checkbox',
		// 	value: 1,
		// 	not_show: true,
		// 	// Solo editable al crear: al editar, isDisabled usa model.id (ModelForm.vue).
		// 	disabled_to_edit: true,
		// 	descriptions: [
		// 		'Si activa esta opcion, se agregara el "Margen por defecto" indicado a todos los articulos creados hasta el momento',
		// 		'Si no lo activa, no se agregara ningun margen a los articulos ya creados, para que usted lo complete de forma manual a cada articulo',
		// 		'Esta opcion solo se define al crear la lista; luego no se puede modificar.',
		// 	]
		// },
		{
			text: 'Al actualizar el margen por defecto, actualizar articulos relacionados',
			key: 'update_existing_articles_percentage_mode',
			type: 'select',
			value: 'none',
			not_show: true,
			// value: lo que persiste la API; text (o label): etiqueta en el select.
			options: [
				{ value: 'none', text: 'No actualizar ningún artículo relacionado' },
				{ value: 'only_default_matches', text: 'Solo los que coincidían con el margen por defecto actual' },
				{ value: 'all', text: 'Todos los artículos relacionados' },
			],
			descriptions: [
				'Define como impacta el cambio de porcentaje por defecto sobre la relacion article_price_type.',
				'none: no actualiza ningun articulo relacionado.',
				'only_default_matches: actualiza solo articulos cuyo porcentaje del pivot coincide con el porcentaje previo por defecto.',
				'all: actualiza todos los articulos relacionados, incluso con porcentaje personalizado.',
			],
		},
		{
			text: 'Pocision',
			key: 'position',
			type: 'number',
			value: '',
			show: true,
		},
		{
			text: 'Ocultar al publico',
			key: 'ocultar_al_publico',
			type: 'checkbox',
			value: 0,
			show: true,
		},
		{
			text: 'Por defecto, incluir los articulos en esta lista para exportar en el Excel a los clientes',
			key: 'incluir_en_lista_de_precios_de_excel',
			type: 'checkbox',
			value: 1,
			not_show: true,
		},
		{
			text: 'Setear el precio final',
			key: 'setear_precio_final',
			type: 'checkbox',
			value: 0,
			not_show: true,
			descriptions: [
				'Si lo activa, en el modulo del LISTADO aparece siempre activada la opcion "Setear precio final" para esta lista de precio en cada articulo que vaya a crear',
			]
		},
		{
			// text: 'Setear el precio final',
			key: 'se_usa_en_tienda_nube',
			if_has_extencion: 'usa_tienda_nube',
			type: 'checkbox',
			value: 0,
			not_show: true,
		},
		{
			text: 'Se usa para Mercado Libre',
			key: 'se_usa_en_ml',
			if_has_extencion: 'usa_mercado_libre',
			type: 'checkbox',
			value: 0,
			not_show: true,
		},
		{
			text: 'Recargos',
			key: 'price_type_surchages',
			not_show: true,
			has_many: {
				text: 'Recargos',
				model_name: 'price_type_surchage',
			},
		},

		{
			text: 'Categorias',
			store: 'category',
			search_on_models_by: 'name',
			type: 'search',
			key: 'categories',
			not_show: true,
			belongs_to_many: {
				model_name: 'category',
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',
						type: 'text',
						show: true,
					},
				],
				properties_to_set: [
					{
						text: 'Margen de ganancia',
						key: 'percentage',
						value: '',
						type: 'number'
					},
				],
			}
		},
		{
			text: 'Sub Categorias',
			key: 'sub_categories',
			type: 'search',
			store: 'sub_category',
			not_show: true,
			belongs_to_many: {
				model_name: 'sub_category',
				properties_to_set: [
					{
						label: 'Porcentaje',
						key: 'percentage',
						type: 'number',
					}
				],
			}
		},
	],
	singular_model_name_spanish: 'Tipo de precio',
	plural_model_name_spanish: 'Tipos de precio',
	create_model_name_spanish: 'Nuevo tipo de precio',
	text_delete: 'el',
}