export default {
	properties: [
		{
			text: 'Tipo de precio',
			key: 'price_type_id',
			type: 'select',
		},
		{
			text: 'Categoria',
			key: 'category_id',
			type: 'search',
		},
		{
			text: 'Sub Categoria',
			key: 'sub_category_id',
			type: 'search',
		},
		{
			text: 'Cantidad minima o igual',
			key: 'min',
			type: 'number',
		},
		{
			text: 'Cantidad maxima o igual',
			key: 'max',
			type: 'number',
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Define rangos de cantidad por categoría que determinan qué lista de precios se aplica según cuánto compra el cliente.',
		implicancias: 'Cuando la cantidad comprada de artículos de una categoría cae dentro de un rango, la venta usa la lista de precios asociada a ese rango. Permite armar precios por volumen: a más cantidad, mejor lista.',
		como_se_utiliza: 'Creá el rango eligiendo la lista de precios, la categoría (y subcategoría si aplica) y la cantidad mínima y máxima. En Vender el sistema aplica el rango automáticamente según las cantidades del carrito.',
		palabras_clave: ['cantidad', 'volumen', 'mayorista', 'escala', 'rangos'],
	},
	singular_model_name_spanish: 'Rango de precio',
	plural_model_name_spanish: 'Rangos de precio',
	create_model_name_spanish: 'Nuevo Rango de precio',
	text_delete: 'el',
}