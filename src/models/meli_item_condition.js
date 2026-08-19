export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Define la condición del producto (nuevo, usado) para las publicaciones de Mercado Libre.',
		implicancias: 'La condición es un dato obligatorio de cada publicación en Mercado Libre y afecta cómo se muestra el producto.',
		como_se_utiliza: 'Se elige al publicar o sincronizar artículos hacia Mercado Libre.',
		palabras_clave: ['mercado libre', 'nuevo', 'usado', 'condicion'],
	},
	singular_model_name_spanish: 'Condicion',
	plural_model_name_spanish: 'Condicion',
	create_model_name_spanish: 'Nueva Condicion',
	text_delete: 'la',
}