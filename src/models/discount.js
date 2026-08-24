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
			text: 'Porcentaje',
			key: 'percentage',
			type: 'number',
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Define descuentos porcentuales predefinidos para aplicar en las ventas.',
		implicancias: 'Los descuentos creados acá quedan disponibles para seleccionar en Vender y se restan del total de la venta. También aparecen detallados en los comprobantes impresos.',
		como_se_utiliza: 'Creá el descuento con un nombre y su porcentaje. En Vender lo elegís de la lista al momento de cerrar la venta.',
		palabras_clave: ['rebaja', 'bonificacion', 'porcentaje', 'promocion'],
	},
	singular_model_name_spanish: 'Descuento',
	plural_model_name_spanish: 'Descuentos',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}