export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
		},
		{
			text: 'Tipo de Propiedad',
			key: 'article_property_type_id',
			type: 'select',
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Carga los valores posibles de cada tipo de propiedad, como los talles S, M y L o los colores disponibles.',
		implicancias: 'Estos valores son los que se eligen al definir propiedades o variantes en la ficha de los artículos.',
		como_se_utiliza: 'Creá cada valor y asignale a qué tipo de propiedad pertenece. Por ejemplo, el valor Rojo dentro del tipo Color.',
		palabras_clave: ['talle', 'color', 'variantes', 'opciones', 'atributos'],
	},
	singular_model_name_spanish: 'Valor de Propiedad de Articulo',
	plural_model_name_spanish: 'Valores de Propiedad de Articulo',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}