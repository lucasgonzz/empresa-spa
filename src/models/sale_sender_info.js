export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			required: true,
			is_title: true,
		},
		{
			text: 'Mail',
			key: 'mail',
			type: 'text',
		},
		{
			text: 'CUIT',
			key: 'cuit',
			type: 'text',
		},
		{
			text: 'Provincia',
			key: 'provincia',
			type: 'text',
		},
		{
			text: 'Localidad',
			key: 'localidad',
			type: 'text',
		},
		{
			text: 'Código postal',
			key: 'postal_code',
			type: 'text',
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Guarda los datos del remitente que se imprimen en las etiquetas de envío de las ventas.',
		implicancias: 'Al imprimir la etiqueta de envío de una venta, el sistema usa el remitente para completar quién envía el paquete: nombre, CUIT, provincia, localidad y código postal.',
		como_se_utiliza: 'Creá el remitente con sus datos completos. Si tenés más de un punto de despacho, creá un remitente por cada uno y elegí el que corresponda al imprimir.',
		palabras_clave: ['etiqueta', 'envio', 'paqueteria', 'despacho', 'correo'],
	},
	singular_model_name_spanish: 'Remitente',
	plural_model_name_spanish: 'Remitentes',
	create_model_name_spanish: 'Nuevo remitente',
	text_delete: 'el',
}
