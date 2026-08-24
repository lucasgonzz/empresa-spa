export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			value: '',
			is_title: true,
		},
		{
			text: 'Provincia',
			key: 'provincia_id',
			type: 'select',
			use_store_models: true,
		},
		{
			text: 'Codigo postal',
			key: 'codigo_postal',
			type: 'text',
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Registra las localidades con su provincia y código postal.',
		implicancias: 'Las localidades se usan en los domicilios de clientes y en los datos de envío, con su código postal asociado.',
		como_se_utiliza: 'Creá la localidad, asignale la provincia y completá el código postal.',
		palabras_clave: ['ciudad', 'codigo postal', 'domicilio', 'envios'],
	},
	singular_model_name_spanish: 'Localidad',
	plural_model_name_spanish: 'Localidades',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}