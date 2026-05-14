/**
 * Catálogo global de plataformas (Comercio City en ML / TN).
 * Las claves no se exponen en JSON; solo `name` y `slug` para selects y tablas.
 */
export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			is_title: true,
			use_in_select: true,
		},
		{
			text: 'Slug',
			key: 'slug',
			type: 'text',
			only_show: true,
		},
	],
	singular_model_name_spanish: 'Plataforma',
	plural_model_name_spanish: 'Plataformas',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}
