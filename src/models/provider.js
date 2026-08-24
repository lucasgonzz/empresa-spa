export default {
	properties: [
		{
			text: 'N°',
			key: 'id',
			type: 'number',
			not_show_on_form: true,
		},

		{
			group_title: 'Datos generales',
		},
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			is_title: true,
		},
		{
			text: 'Saldo',
			key: 'saldo_pesos',
			only_show: true,
			type: 'number',
			value: '',
			show: true,
			is_price: true,
			use_to_filter_in_modal: true,
			filter_modal_position: 2,
		},
		{
			text: 'Saldo USD',
			key: 'saldo_dolares',
			only_show: true,
			type: 'number',
			value: '',
			show: true,
			is_price: true,
			use_to_filter_in_modal: true,
			filter_modal_position: 2,
			if_has_extencion: 'ventas_en_dolares',
		},
		{
			text: 'Observaciones',
			key: 'observations',
			type: 'textarea',
		},

		{
			group_title: 'Precios y descuentos',
		},
		{
			text: 'Setear precio con COSTO + IVA',
			key: 'price_from_cost_mas_iva',
			type: 'checkbox',
			if_has_extencion: 'providers_article_price_from_costo_mas_iva',
		},
		{
			// Prompt 517: default de "precios_incluyen_iva" para las compras de este proveedor. Al elegir
			// este proveedor en una compra (provider_order), se precarga este valor en el check de la
			// compra (ver "prefill_prop_on_select" en provider_order.js), pero el usuario puede
			// sobreescribirlo en cada compra puntual.
			// Mision costo-bruto-por-condicion-fiscal (20/8/2026): el texto habla de COSTOS y no de
			// "precios" porque lo que este default decide es como se lee el costo tipeado en la
			// compra (bruto = con IVA adentro, o neto). El precio de venta del articulo no entra.
			text: 'Los costos de este proveedor son BRUTOS (ya tienen el IVA adentro)',
			key: 'precios_incluyen_iva',
			type: 'checkbox',
			value: 0,
			description: 'Valor por defecto para tus compras a este proveedor: activalo si sus listas ya vienen con el IVA sumado al costo. Al cargar una compra de este proveedor, el check "Los costos que cargo en esta compra son BRUTOS (ya tienen el IVA adentro)" viene pre-tildado según esto, y lo podés cambiar en cada compra. Ojo: esto no modifica el costo de ningún artículo ya cargado, solo define cómo se va a interpretar el número que tipees en la próxima compra.',
		},
		{
			text: 'Margen de ganancia',
			key: 'percentage_gain',
			type: 'number',
		},
		{
			text: 'Valor dolar',
			key: 'dolar',
			type: 'number',
			is_price: true,
		},
		{
			text: '% de comision ventas en NEGRO',
			key: 'porcentaje_comision_negro',
			type: 'number',
			if_has_extencion: 'comision_por_proveedores',
			not_show: true,
		},
		{
			text: '% de comision ventas en BLANCO',
			key: 'porcentaje_comision_blanco',
			type: 'number',
			if_has_extencion: 'comision_por_proveedores',
			not_show: true,
		},
		{
			text: 'Descuentos',
			key: 'provider_discounts',
			has_many: {
				text: 'Descuento',
				model_name: 'provider_discount',
			}
		},
		// {
		// 	text: 'Listas de precios',
		// 	key: 'provider_price_lists',
		// 	has_many: {
		// 		text: 'Lista de precios',
		// 		model_name: 'provider_price_list',
		// 	},
		// 	not_show: true,
		// },

		{
			group_title: 'Datos de contacto',
		},
		{
			text: 'Telefono',
			key: 'phone',
			type: 'text',
		},
		{
			text: 'Provincia',
			key: 'provincia_id',
			type: 'search',
			use_store_models: true,
		},
		{
			text: 'Localidad',
			key: 'location_id',
			type: 'search',
			depends_on: 'provincia_id',
		},
		{
			text: 'Direccion',
			key: 'address',
			type: 'text',
		},
		{
			text: 'Correo',
			key: 'email',
			type: 'text',
			not_show: true,
		},

		{
			group_title: 'Facturacion',
		},
		{
			text: 'IVA',
			key: 'iva_condition_id',
			type: 'select',
			value: 0,
		},
		{
			text: 'Cuit',
			key: 'cuit',
			type: 'text',
		},
		{
			text: 'Razon social',
			key: 'razon_social',
			type: 'text',
			not_show: true,
		},
	],
	singular_model_name_spanish: 'Proveedor',
	plural_model_name_spanish: 'Proveedores',
	create_model_name_spanish: 'Nuevo proveedor',
	text_delete: 'el',
	show_all_models_on_display: false,
}
