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
		{
			text: 'Grupo',
			key: 'order_production_status_group_id',
			type: 'select',
			store: 'order_production_status_group',
			use_store_models: true,
			value: 0,
			show: true,
			descriptions: [
				'Agrupa este estado con los demas estados de la misma etapa del proceso. Por ejemplo: todos los estados por los que pasa una pata de silla.',
				'Si lo dejas sin grupo, el estado se comporta como siempre: aparece en todas las rutas.',
			],
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