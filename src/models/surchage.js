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
		para_que_sirve: 'Define recargos porcentuales predefinidos para aplicar en las ventas.',
		implicancias: 'Los recargos se suman al total de la venta al seleccionarlos en Vender y aparecen detallados en los comprobantes. Sirven por ejemplo para financiación o costos extra.',
		como_se_utiliza: 'Creá el recargo con un nombre y su porcentaje. En Vender lo elegís de la lista al momento de cerrar la venta.',
		palabras_clave: ['aumento', 'interes', 'adicional', 'porcentaje'],
	},
	singular_model_name_spanish: 'Recargo',
	plural_model_name_spanish: 'Recargos',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}