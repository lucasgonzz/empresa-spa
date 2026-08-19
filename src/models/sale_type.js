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
		para_que_sirve: 'Clasifica las ventas por tipo (por ejemplo: mostrador, reparto, telefónica).',
		implicancias: 'El tipo de venta sirve para segmentar reportes y además es un criterio de las reglas de comisiones: podés pagar comisiones distintas según el tipo de venta.',
		como_se_utiliza: 'Creá los tipos que use tu negocio y asignalos al registrar cada venta en Vender.',
		palabras_clave: ['mostrador', 'reparto', 'clasificacion', 'canal'],
	},
	singular_model_name_spanish: 'Tipo de venta',
	plural_model_name_spanish: 'Tipos de venta',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}