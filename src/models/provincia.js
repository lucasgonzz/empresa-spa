export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			value: '',
			is_title: true,
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Registra las provincias que se usan en domicilios de clientes y envíos.',
		implicancias: 'Las provincias alimentan los selectores de domicilio y son la base de las localidades.',
		como_se_utiliza: 'Creá las provincias que necesites; las localidades después se asocian a ellas.',
		palabras_clave: ['domicilio', 'ubicacion', 'geografia'],
	},
	singular_model_name_spanish: 'Provincia',
	plural_model_name_spanish: 'Provincias',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}