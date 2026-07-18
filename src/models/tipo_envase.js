export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			is_title: true,
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Define los tipos de envase de los artículos de distribuidora (botella, lata, bidón, etc.).',
		implicancias: 'El tipo de envase se asigna a cada artículo como propiedad de distribuidora y viaja en las exportaciones e importaciones de Excel del catálogo.',
		como_se_utiliza: 'Creá los tipos de envase que uses y elegilos en la ficha de cada artículo. Requiere la extensión de propiedades de distribuidora.',
		palabras_clave: ['envase', 'botella', 'distribuidora', 'presentacion'],
	},
	singular_model_name_spanish: 'Tipo de envase',
	plural_model_name_spanish: 'Tipo de envases',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}