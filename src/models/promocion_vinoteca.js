export default {
	properties: [
		{
			text: 'Imagenes',
			key: 'images',
			type: 'images',
		},
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			is_title: true,
		},
		{
			text: 'Costo',
			key: 'cost',
			type: 'number',
			only_show: true,
			is_price: true,
		},
		{
			text: 'Precio',
			key: 'final_price',
			type: 'number',
			is_price: true,
		},
		{
			text: 'Stock',
			key: 'stock',
			type: 'number',
		},
		{
			text: 'Deposito',
			key: 'address_id',
			type: 'select',
			use_store_models: true,
			select_prop_name: 'street',
			show: true,
			value: 0,
			required: true,
			required_if_models_length: 'address',
			// Desde la segunda sucursal; con una sola ni se ve ni se exige y la API usa la principal
			// (misión sucursal-siempre, 23/10/2026, D1).
			v_if_function: 'mostrar_campo_de_sucursal',
			disabled_if_not_0: true,
		},
		{
			text: 'Disponible en la tienda',
			key: 'online',
			type: 'checkbox',
			show: true,
			value: 1,
		},
		{
			text: 'Descripcion',
			key: 'description',
			full_cols: true,
			type: 'texteditor',
		},
		// Peso y medidas del paquete: se cargan juntos, en el orden en que se mide una caja (peso, largo, ancho, alto),
		// que son los cuatro datos que pide Zipnova. mid_full_cols arma un bloque 2x2 en tablet y escritorio
		// (apilado en teléfono); la prop anterior ocupa la fila entera para que el bloque empiece siempre en fila propia.
		// La key 'profundidad' NO se renombra (contrato con la API y la tienda): sólo cambia el rótulo a 'Largo'.
		{
			text: 'Peso del paquete (kg)',
			key: 'peso',
			type: 'number',
			variable_decimals: { min: 0, max: 4 },
			v_if_function: 'mostrar_medidas_de_envio_de_promocion',
			not_show: true,
			mid_full_cols: true,
			value: null,
			description: 'Peso en kilogramos de una unidad del paquete completo, con el embalaje. Ejemplo: 1.25 (1 kg y 250 g). Lo usa la tienda para cotizar el envío. Si lo dejás vacío, se usa el bulto por defecto del negocio.',
		},
		{
			text: 'Largo del paquete (cm)',
			key: 'profundidad',
			type: 'number',
			variable_decimals: { min: 0, max: 4 },
			v_if_function: 'mostrar_medidas_de_envio_de_promocion',
			not_show: true,
			mid_full_cols: true,
			value: null,
			description: 'Largo en centímetros: el lado más largo de la caja, con el embalaje. Es lo que Zipnova llama largo (length); no hay un cuarto eje "profundidad". Lo usa la tienda para cotizar el envío. Si lo dejás vacío, se usa el bulto por defecto del negocio.',
		},
		{
			text: 'Ancho del paquete (cm)',
			key: 'ancho',
			type: 'number',
			variable_decimals: { min: 0, max: 4 },
			v_if_function: 'mostrar_medidas_de_envio_de_promocion',
			not_show: true,
			mid_full_cols: true,
			value: null,
			description: 'Ancho en centímetros de una unidad del paquete completo, con el embalaje. Lo usa la tienda para cotizar el envío. Si lo dejás vacío, se usa el bulto por defecto del negocio.',
		},
		{
			text: 'Alto del paquete (cm)',
			key: 'alto',
			type: 'number',
			variable_decimals: { min: 0, max: 4 },
			v_if_function: 'mostrar_medidas_de_envio_de_promocion',
			not_show: true,
			mid_full_cols: true,
			value: null,
			description: 'Alto en centímetros: de la base a la tapa de la caja, con el embalaje. Lo usa la tienda para cotizar el envío. Si lo dejás vacío, se usa el bulto por defecto del negocio.',
		},
		{
			text: 'Articulos',
			store: 'article',
			type: 'search',
			key: 'articles',
			no_editar_una_vez_creado_el_modelo: true,
			search_from_api: true,
			belongs_to_many: {
				model_name: 'article',
				props_to_show: [
					{
						text: 'Codigo barras',
						key: 'bar_code',
					},
					{
						text: 'Codigo proveedor',
						key: 'provider_code',
					},
					{
						text: 'Nombre',
						key: 'name',
					},			
					{
						text: 'Stock',
						key: 'stock',
					},			
					{
						text: 'Precio final',
						key: 'final_price',
						is_price: true,
					},					
				],
				properties_to_set: [
					{
						text: 'Cantidad',
						key: 'amount',
						type: 'number',
					},
					{
						text: 'Unidades por promo',
						key: 'unidades_por_promo',
						type: 'number',
					},
				],
			}
		}
	],
	singular_model_name_spanish: 'Promocion',
	plural_model_name_spanish: 'Promociones',
	create_model_name_spanish: 'Nueva Promocion',
	full_reactivity: true,
	text_delete: 'la',
}
