export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Registra los repartidores del negocio para asignarlos a las entregas.',
		implicancias: 'Los repartidores se asignan a las ventas con envío, lo que permite organizar los repartos y saber quién entrega cada pedido.',
		como_se_utiliza: 'Creá cada repartidor con su nombre y asignalo a las ventas desde el listado o la hoja de reparto.',
		palabras_clave: ['delivery', 'entregas', 'reparto', 'chofer', 'flete'],
	},
	singular_model_name_spanish: 'Repartidor',
	plural_model_name_spanish: 'Repartidores',
	create_model_name_spanish: 'Nuevo Repartidor',
	text_delete: 'el',
}