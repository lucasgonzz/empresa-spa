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
		para_que_sirve: 'Define un monto fijo de comisión para el vendedor por cada promoción de vinoteca vendida.',
		implicancias: 'Cada vez que se vende una promoción de vinoteca, el vendedor asignado suma este importe fijo como comisión.',
		como_se_utiliza: 'Creá el registro eligiendo el vendedor y el monto fijo por promoción vendida.',
		palabras_clave: ['vinoteca', 'promocion', 'monto fijo', 'vendedores'],
	},
	singular_model_name_spanish: 'Comision por Promocion',
	plural_model_name_spanish: 'Comision por Promocion',
	create_model_name_spanish: 'Nueva Comision por Promocion',
	text_delete: 'la',
}