export default {
	properties: [
		{
			text: 'Proveedor',
			key: 'provider_id',
			type: 'select',
			use_store_models: true,
		},
		{
			text: 'Articulos para chequear',
			key: 'articles_para_chequear',
			type: 'select',
			function: 'get_articles_para_checkear_from_articles_pre_import',
			not_show_on_form: true,
		},
		{
			text: 'Articulos',
			key: 'articles',
			type: 'select',
			not_show: true,
		},
	],
	singular_model_name_spanish: 'Pre importacion',
	plural_model_name_spanish: 'Pre importacion',
	create_model_name_spanish: 'Nueva Pre importacion',
	text_delete: 'la',
}