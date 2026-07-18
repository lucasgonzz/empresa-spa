export default {
	properties: [
		{
			text: 'Monto Fijo',
			key: 'monto_fijo',
			type: 'number',
			is_price: true,
		},
		{
			text: 'Vendedor',
			key: 'seller_id',
			type: 'select',
			use_store_models: true,
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Define un monto fijo de comisión que cobra un vendedor cada vez que una venta se marca como terminada.',
		implicancias: 'A diferencia de las comisiones porcentuales, acá el vendedor cobra un importe fijo por venta finalizada, independiente del monto de la venta.',
		como_se_utiliza: 'Creá el registro eligiendo el vendedor y el monto fijo. Se genera automáticamente al terminar cada venta.',
		palabras_clave: ['monto fijo', 'vendedores', 'incentivo', 'venta finalizada'],
	},
	singular_model_name_spanish: 'Comision por Venta Terminada',
	plural_model_name_spanish: 'Comisiones por Venta Terminada',
	create_model_name_spanish: 'Nueva Comision por Venta Terminada',
	text_delete: 'la',
}