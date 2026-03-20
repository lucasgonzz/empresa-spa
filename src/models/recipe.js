export default {
	properties: [
		{
			text: 'Articulo',
			store: 'article',
			// combine_with: { 
			// 	store: 'article',
			// 	prop: 'inactive_models',
			// },
			key: 'article_id',
			type: 'search',
			is_title: true,
			show: true,
			value: '',
			search_from_api: true,
			route_to_search: 'vender/buscar-articulo-por-nombre/1',
		},
		{
			text: 'Imagen',
			key: 'article_image',
			type: 'image',
			not_show_on_form: true,
		},
		{
			text: 'Observaciones',
			key: 'observations',
			type: 'textarea',
			value: '',
		},
		{
			text: 'Rutas',
			key: 'recipe_routes',
			has_many: {
				text: 'Ruta',
				model_name: 'recipe_route',
			},
			full_cols: true,
		}
	],
	singular_model_name_spanish: 'Receta',
	plural_model_name_spanish: 'Recetas',
	create_model_name_spanish: 'Nueva receta',
	text_delete: 'la',
	full_reactivity: true,
}