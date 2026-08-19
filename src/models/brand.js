export default {
	properties: [
		{
			text: 'N°',
			key: 'num',
			not_show_on_form: true,
		},
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			value: '',
			is_title: true,
		},
		/*
		 * Propiedad para gestionar la imagen de la marca.
		 * key: campo persistido en backend.
		 * type image: habilita selector/carga de imagen en el formulario.
		 */
		{
			text: 'Imagen',
			key: 'image_url',
			type: 'image',
			value: '',
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Registra las marcas de los artículos para clasificarlos y filtrarlos.',
		implicancias: 'La marca aparece como filtro en el listado de artículos y en la tienda online, y puede mostrarse en catálogos y PDFs.',
		como_se_utiliza: 'Creá la marca con su nombre y logo opcional, y asignala a los artículos desde el listado o al crearlos.',
		palabras_clave: ['fabricante', 'filtro', 'logo'],
	},
	singular_model_name_spanish: 'Marca',
	plural_model_name_spanish: 'Marcas',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}