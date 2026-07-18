export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Define los tipos de propiedades que pueden tener los artículos, como talle, color o material.',
		implicancias: 'Los tipos de propiedad son la base para cargar variantes y características de los artículos: primero existe el tipo (por ejemplo Talle) y después sus valores.',
		como_se_utiliza: 'Creá el tipo de propiedad con su nombre y después cargá sus valores posibles en Valores de Propiedad de Artículo.',
		palabras_clave: ['talle', 'color', 'variantes', 'caracteristicas', 'atributos'],
	},
	singular_model_name_spanish: 'Tipo de Propiedad de Articulo',
	plural_model_name_spanish: 'Tipos de Propiedad de Articulo',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}