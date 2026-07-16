export default {
	properties: [
		{
			text: 'Titulo',
			key: 'title',
			type: 'text',
			value: '',
			is_title: true,
		},
		{
			text: 'Contenido',
			key: 'content',
			type: 'texteditor',
		},
		{
			// Fuente de la descripcion generada por IA: campo de solo lectura
			// (only_show) que se resuelve via get_description_ai_sources_text
			// (src/mixins/model_functions.js), leyendo ai_sources (array de
			// objetos {source, url, title} persistido desde el prompt 366/369).
			// no_usar_en_filtros porque no es un campo filtrable por el usuario.
			text: 'Fuente',
			key: 'ai_sources',
			function: 'get_description_ai_sources_text',
			only_show: true,
			no_usar_en_filtros: true,
			table_width: 'lg',
		},
	],
	singular_model_name_spanish: 'Descripcion',
	plural_model_name_spanish: 'Descripciones',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}