export default {
	properties: [
		{
			/*
				N° del articulo, el mismo que muestra el Listado (key `id` de models/article.js).

				La key termina en `_id`, asi que isRelationKey() (common-vue/mixins/generals.js) la trata
				como relacion y pinta un campo del articulo embebido en la fila (`model.article`, que la
				API ya manda). Sin relation_prop_name ese campo era `name`, y la columna "Num" mostraba
				el nombre del articulo en vez del numero (10/10/2026).
			*/
			text: 'N°',
			key: 'article_id',
			relation_prop_name: 'id',
			type: 'text',
			show: true,
		},
		{
			text: 'Codigo Barras',
			key: 'bar_code',
			type: 'text',
			show: true,
		},
		{
			text: 'Codigo Prov',
			key: 'provider_code',
			type: 'text',
			show: true,
		},
		{
			text: 'Articulo',
			key: 'article_name',
			type: 'text',
			show: true,
		},
		{
			text: 'Cantidad',
			key: 'unidades_vendidas',
			type: 'number',
			show: true,
		},
		{
			text: 'Costo Total',
			key: 'cost',
			is_price: true,
			type: 'number',
			show: true,
		},
		{
			text: 'Precio Total',
			key: 'price',
			is_price: true,
			type: 'number',
			show: true,
		},
		{
			text: 'Beneficio Final',
			key: 'beneficio',
			is_price: true,
			type: 'number',
			show: true,
		},
		{
			text: 'Costo Total USD',
			key: 'cost_dolar',
			is_price: true,
			type: 'number',
			show: true,
		},
		{
			text: 'Precio Total USD',
			key: 'price_dolar',
			is_price: true,
			type: 'number',
			show: true,
		},
		{
			text: 'Beneficio Final USD',
			key: 'beneficio_dolar',
			is_price: true,
			type: 'number',
			show: true,
		},
	],
	singular_model_name_spanish: 'Venta de articulo',
	plural_model_name_spanish: 'Ventas de articulo',
	create_model_name_spanish: 'Nueva Venta de articulo',
	text_delete: 'la',
}