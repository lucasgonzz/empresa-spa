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
		para_que_sirve: 'Define los estados de los movimientos de mercadería entre depósitos (por ejemplo: solicitado, en camino, recibido).',
		implicancias: 'Los estados permiten seguir cada traslado entre depósitos y saber en qué instancia está la mercadería en tránsito.',
		como_se_utiliza: 'Creá los estados de tu circuito y asignalos a los movimientos desde el módulo de depósitos.',
		palabras_clave: ['traslado', 'depositos', 'transito', 'stock'],
	},
	singular_model_name_spanish: 'Estado de Movimiento de deposito',
	plural_model_name_spanish: 'Estados de Movimiento de deposito',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}