export default {
	properties: [
		{
			text: 'Dia de la semana',
			key: 'day_of_week',
			type: 'text',
			description: 'Ingrese el numero correspondiente al dia de la semana (Lunes = 1, Martes = 2, etc)',
			is_title: true,
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Define los días de la semana en que hacés entregas de pedidos de la tienda online.',
		implicancias: 'Los días cargados son las opciones de entrega que ve el comprador al finalizar su pedido en la tienda.',
		como_se_utiliza: 'Creá un registro por cada día de la semana en que repartís.',
		palabras_clave: ['entrega', 'reparto', 'dias', 'tienda'],
	},
	singular_model_name_spanish: 'Dia de entrega',
	plural_model_name_spanish: 'Dia de entrega',
	create_model_name_spanish: 'Nuevo Dia de entrega',
	text_delete: 'el',
}