export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			value: '',
			is_title: true,
			required: true,
		},
		{
			text: 'Descripcion',
			key: 'description',
			type: 'textarea',
			value: '',
			show: true,
			required: false,
		},
		{
			text: 'Precio',
			key: 'price',
			type: 'number',
			value: '',
			show: true,
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Define las zonas de envío de la tienda online con su costo.',
		implicancias: 'El comprador elige su zona al finalizar el pedido y el costo de envío de esa zona se suma al total de la compra.',
		como_se_utiliza: 'Creá cada zona con nombre, descripción y precio de envío.',
		palabras_clave: ['envio', 'costo', 'reparto', 'zonas', 'tienda'],
	},
	singular_model_name_spanish: 'Zona de envio',
	plural_model_name_spanish: 'Zonas de envio',
	create_model_name_spanish: 'Nueva zona de envio',
	text_delete: 'la',
}