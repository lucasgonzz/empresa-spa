export default {
	properties: [
		// RADIO
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			value: '',
			show: true,
		},
		{
			text: 'Pocision',
			key: 'position',
			type: 'number',
			value: '',
			show: true,
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Define los estados por los que pasan las órdenes de producción (por ejemplo: planificada, en proceso, terminada).',
		implicancias: 'Los estados ordenan el tablero de producción y permiten saber en qué etapa está cada orden. La posición define el orden en que se muestran.',
		como_se_utiliza: 'Creá los estados con nombre y posición, y asignalos a las órdenes desde el módulo de producción.',
		palabras_clave: ['ordenes', 'fabricacion', 'etapas', 'proceso'],
	},
	singular_model_name_spanish: 'Estado de Produccion',
	plural_model_name_spanish: 'Estados de Produccion',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}