export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
		},
		{
			text: 'Articulos',
			store: 'article',
			search_on_models_by: 'name',
			type: 'search',
			key: 'articles',
			search_from_api_function: 'search_from_api_in_provider_order',
			belongs_to_many: {
				model_name: 'article',
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',
						type: 'text',
					},
					{
						text: 'Codigo barras',
						key: 'bar_code',
						type: 'text',
					},
					{
						text: 'Codigo proveedor',
						key: 'provider_code',
						type: 'text',
					},
					{
						text: 'Costo',
						key: 'cost',
						type: 'number',
						is_price: true,
					},
				],
			}
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Agrupa artículos para que sus cantidades se sumen juntas al evaluar los rangos de precio por cantidad.',
		implicancias: 'Si un cliente compra artículos distintos del mismo grupo, las cantidades se acumulan para alcanzar el rango: comprar 6 unidades repartidas entre varios artículos del grupo cuenta como 6 para el rango. Sin el grupo, cada artículo evalúa su cantidad por separado.',
		como_se_utiliza: 'Creá el grupo con un nombre y agregale los artículos que deben sumar en conjunto. Funciona en combinación con los Rangos de precio.',
		palabras_clave: ['agrupar', 'cantidad conjunta', 'volumen', 'rangos'],
	},
	singular_model_name_spanish: 'Grupo de articulos',
	plural_model_name_spanish: 'Grupos de articulos',
	create_model_name_spanish: 'Nuevo Grupo de articulos',
	text_delete: 'el',
}