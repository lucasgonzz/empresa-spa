export default {
	properties: [
		{
			text: 'N°',
			key: 'num',
			type: 'number',
			not_show_on_form: true,
			filter_modal_position: 1,
		},
		{
			text: 'Proveedor',
			key: 'provider_id',
			store: 'provider',
			type: 'search',
			value: 0,
			is_title: true,
			required: true,
			filter_modal_position: 2,
			disabled_to_edit: true,
			description: 'Proveedor al que va a pertenecer la compra',
		},
		{
			text: 'Moneda',
			key: 'moneda_id',
			type: 'select',
			value: 1,
			use_store_models: true,
			if_has_extencion: 'ventas_en_dolares',
			description: 'Moneda de esta compra, dependiendo la moneda se va a cargar en la cuenta corriente correspondiente',
		},
		{
			text: 'Estado',
			key: 'provider_order_status_id',
			store: 'provider_order_status',
			type: 'select',
			value: 1,
			filter_modal_position: 3,
			not_show: true,
			descriptions: [
				'Estado para indicar si la compra esta en proceso o ya fue recibida.',
				'Es solo informativo para organizacion interna, este dato no influye en:',
				'1. Actualizar el stock',
				'2. Actualizar cuenta corriente del proveedor',
				'3. Actualizar precios de los articulos comprados',
			],
		},
		{
			text: 'Deposito',
			key: 'address_id',
			type: 'select',
			use_store_models: true,
			select_prop_name: 'street',
			value: 0,
			not_show: true,
			required: true,
			required_if_models_length: 'address',
			disabled_if_not_0: true,
			descriptions: [
				'Deposito hacia el cual va a ir el stock comprado de los articulos una vez activada la opcion de "Generar movimientos de Stock".',
			],
		},
		{
			key: 'days_to_advise',
			text: 'Dias para alertar',
			type: 'number',
			placeholder: 'Ingrese los dias a partir de los cuales se le notificara',
			value: '',
			not_show: true,
			descriptions: [
				'Si completa este campo, y la compra no ha sido pasada al estado "Recibido" a partir de X dias desde que fue creada, aparecera en el modulo de Alertas',
			]
		},

		{
			group_title: 'Configuracion'
		},
		{
			text: 'Actualizar precios',
			key: 'update_prices',
			type: 'checkbox',
			value: 0,
			not_show: true,
			no_de_puede_desactivar: true,
			descriptions: [
				'Una vez que active esta opcion, el sistema actualizara los costos/precios de sus articulos en el LISTADO en base a los valores indicados en esta compra.',
				'Si nunca activa esta opcion, el sistema no cambiara los costos/precios de sus articulos por lo que indico en esta compra',
				'Una vez activada esta accion NO ES REVERSIBLE',
			]
		},
		{
			text: 'Generar movimientos de Stock',
			key: 'update_stock',
			type: 'checkbox',
			value: 0,
			not_show: true,
			no_de_puede_desactivar: true,
			descriptions: [
				'Una vez que active esta opcion, el sistema actualizara el stock de sus articulos en el LISTADO en base a los valores indicados en esta compra.',
				'Si nunca activa esta opcion, el sistema no actualizara el stock de sus articulos por lo que indico en esta compra',
				'Una vez activada esta accion NO ES REVERSIBLE',
				'Recomendamos activar esta opcion una vez recibida la mercaderia, mientras tanto dejelo desactivado',
			]
		},
		{
			text: 'Generar movimiento en Cuenta Corriente',
			key: 'generate_current_acount',
			type: 'checkbox',
			value: 1,
			not_show: true,
			no_de_puede_desactivar: true,
			descriptions: [
				'Una vez que active esta opcion, el sistema generara un movimiento en la Cuenta Corriente del proveedor por el "Total final" de esta compra.',
				'Si nunca activa esta opcion, el sistema no generara un movimiento en la Cuenta Corriente del proveedor.',
				'Una vez activada esta accion NO ES REVERSIBLE',
				'Si una vez activada ustedes actualiza la compra y cambie el Total Final, el sistema actualizara la cuenta corriente del proveedor segun corresponda.',
			]
		},
		// {
		// 	key: 'numero_comprobante',
		// 	type: 'text',
		// 	value: '',
		// 	not_show: true,
		// 	description: 'Si esta compra fue facturada, y no vas a cargar las facturas, utiliza este campo para indicar el numero de la factura',
		// },
		// {
		// 	key: 'fecha_emision_comprobante',
		// 	type: 'date',
		// 	value: '',
		// 	not_show: true,
		// 	description: 'Si esta compra fue facturada, y no vas a cargar las facturas, utiliza este campo para indicar la fecha de emision de la factura',
		// },

		{
			group_title: 'Articulos',
		},
		{
			text: 'Articulos',
			store: 'article',
			search_on_models_by: 'name',
			type: 'search',
			key: 'articles',
			search_from_api_function: 'search_from_api_in_provider_order',
			route_to_search: 'vender/buscar-articulo-por-nombre/1',
			toast_function: 'toast_article_provider_order_unidades_individuales',
			limpiar_resultados_de_busqueda: false,
			belongs_to_many: {
				model_name: 'article',
				create_if_not_exist: true,
				props_to_filter: [
					'bar_code',
					'provider_code',
					'name',
				],
				props_to_show: [
					{
						text: 'Imagen',
						key: 'images',
						type: 'images',
					},
					{
						text: 'Nombre',
						key: 'name',
						type: 'textarea',
						show: true,
						show_in_input_if: ['status', '=', 'inactive'],
						size: 'lg',
					},
					{
						text: 'Codigo barras',
						key: 'bar_code',
						type: 'text',
						show: true,
						show_in_input_if: ['status', '=', 'inactive']
					},
					{
						text: 'Codigo proveedor',
						key: 'provider_code',
						type: 'text',
						show: true,
						show_in_input_if: ['status', '=', 'inactive']
					},
					{
						text: 'Stock',
						key: 'stock',
						type: 'number',
						show: true,
					},
				],
				properties_to_set: [
					{
						text: 'Cantidad',
						key: 'amount',
						value: '',
						type: 'number'
					},
					// {
					// 	text: 'Cantidad pedida',
					// 	key: 'amount_pedida',
					// 	value: '',
					// 	type: 'number'
					// },
					{
						text: 'Costo',
						key: 'cost',
						value: {
							key: 'cost',
						},
						type: 'number'
					},
					{
						text: 'Precio',
						key: 'price',
						value: {
							key: 'price',
						},
						type: 'number'
					},
					{
						text: 'Descuento',
						key: 'discount',
						type: 'number',
					},
					{
						text: 'Costo en dolares',
						key: 'cost_in_dollars',
						if_has_extencion: 'costo_en_dolares',
						// value: 0,
						value: {
							key: 'cost_in_dollars',
						},
						type: 'checkbox'
					},
					{
						text: 'Actualizar proveedor en el sistema',
						key: 'update_provider',
						value: 0,
						type: 'checkbox'
					},
					{
						text: 'Iva',
						key: 'iva_id',
						type: 'select',
						select_prop_name: 'percentage',
						value: {
							key: 'iva_id',
						},
						size: 'md',
					},
					{
						text: 'Notas',
						key: 'notes',
						value: '',
						type: 'textarea'
					},
					// {
					// 	text: 'Recibidas',
					// 	key: 'received',
					// 	value: 0,
					// 	type: 'number',
					// },
					// {
					// 	text: 'Ediar',
					// 	type: 'button',
					// 	button: {
					// 		variant: 'primary',
					// 	},
					// 	source: '@/mixins/edit_articles.js',
					// 	function: 'editArticle',
					// },
				],
				save_if_not_exist: {
					properties_to_send: [
						{
							key: 'status',
							value: 'inactive',
						}
					], 
					not_add_to_store_models: true,
				}
			}
		},

		{
			group_title: 'Facturacion',
		},
		{
			text: 'Modo Facturacion',
			key: 'modo_facturacion',
			type: 'select',
			not_show: true,
			options: [
				'sin factura',
				'automatico',
				'manual',
			],
			descriptions: [
				'Elegí cómo se va a registrar la factura de esta compra para el Libro IVA Compras.',
				'Sin factura (no facturado)',
				'Usalo si tu proveedor no te emitió factura por esta compra. La compra queda registrada solo con sus artículos, pero no se incluye como comprobante en el libro de IVA hasta que cargues una factura.',
				'Facturación automática (coincide con la compra)',
				'Usalo si tu proveedor facturó la compra tal cual se cargó (mismos importes y alícuotas). El sistema va a:',
				'1. Dejar una sola factura asociada a la compra.',
				'2. Calcular automáticamente el IVA por alícuota (21%, 10,5%, 27%, etc.) a partir de los artículos.',
				'3. Dejarte completar manualmente datos como fecha/número de factura, percepciones y retenciones.',
				'Facturación manual (factura diferente o parcial)',
				'Usalo si tu proveedor facturó distinto, facturó solo una parte, o querés cargar una o varias facturas para la misma compra. En este modo:',
				'1. El sistema no calcula el IVA automáticamente.',
				'2. Vos cargás las facturas y completás totales e IVA por alícuota (además de percepciones/retenciones).',
			],
		},
		{
			text: 'Facturas',
			key: 'provider_order_afip_tickets',
			has_many: {
				text: 'Factura',
				model_name: 'provider_order_afip_ticket',
			},
			descriptions: [
				'Si modo facturacion es "Automatico" complete la informacion de la factura ya generada automaticamente. La informacion de las alicuotas de IVA ya habran sido generadas por el sistema',
				'Si modo facturacion es "Manual", cargue ustedes la/las facturas correspondientes indicando las alicuotas de IVA.'
			],	
		},


		{
			group_title: 'Descuentos y recargos',
		},
		{
			text: 'Descuentos de la compra',
			key: 'provider_order_discounts',
			not_show: true,
			has_many: {
				text: 'Descuento',
				model_name: 'provider_order_discount',
			},
			descriptions: [
				'Agregue descuentos a esta compra. Estos descuentos seran restados al total del pedido siempre y cuando "Total de las facturas" esta desactivado',
			],
		},
		{
			text: 'Costos Extra',
			key: 'provider_order_extra_costs',
			has_many: {
				text: 'Cost Extra',
				model_name: 'provider_order_extra_cost',
			},
			not_show: true,
			descriptions: [
				'Agregue los costos extras que tenga esta compra, como costos de transporte, comisiones, etc.',
				'Estos valores seran sumados SIEMPRE al total de la compra',
			],
		},


		{
			group_title: 'Total',
		},
		{
			key: 'total_with_iva',
			text: 'Total con IVA',
			type: 'checkbox',
			value: 1,
			description: 'Sumar el "TOTAL IVA" al "TOTAL FINAL" de la compra',
			not_show: true,
		},
		{
			key: 'total_from_provider_order_afip_tickets',
			text: 'Total de las facturas',
			type: 'checkbox',
			descriptions: [
				'Si se activa: se calcula el total de la compra sumando los totales de las Facturas de la compra, ignorando:',
				'La suma de los articulos comprados y los descuentos de la compra. Y teniendo en cuenta:',
				'Los costos extras, y el "Total IVA" en caso de activar "Total con IVA"',
				'Se se desactiva: se calcula el total de la compra sumando los totales de los articulos de la compra, ignorando la suma de las facturas.'
			],
			value: 0,
			not_show: true,
		},
		{
			text: 'Total Articulos',
			key: 'sub_total',
			type: 'number',
			only_show: true,
			is_price: true,
			not_show: true,
			descriptions: [
				'Suma de todos los articulos comprados, sin tener en cuenta:',
				'Descuentos',
				'Costos Extras',
				'IVA',
				'En caso de que un articulo tenga el costo en dolares, se utilizara la cotizacion del proveedor de esta compra, y no se usara la cotizacion del proveedor al que pertenezca el articulo (en caso de ya pertenecer a otro proveedor).',
			],
		},
		{
			text: 'Descuentos individuales',
			key: 'descuentos_individuales',
			type: 'number',
			only_show: true,
			is_price: true,
			not_show: true,
			descriptions: [
				'Suma de todos los descuentos individuales de los articulos.',
			],
		},
		{
			text: 'Descuentos compra',
			key: 'descuentos_compra',
			type: 'number',
			only_show: true,
			is_price: true,
			not_show: true,
			descriptions: [
				'Suma de todos los descuentos de la compra, aplicados al "Total articulos" - "Descuentos individuales".',
			],
		},
		{
			text: 'Total Descuentos',
			key: 'total_descuento',
			type: 'number',
			only_show: true,
			is_price: true,
			not_show: true,
			descriptions: [
				'Suma de todos los descuentos implicados en esta compra:',
				'Descuentos individuales de los articulos.',
				'Descuentos de la compra.',
			],
		},
		{
			text: 'Total Extra',
			key: 'total_costos_extra',
			type: 'number',
			only_show: true,
			is_price: true,
			not_show: true,
			descriptions: [
				'Suma de todos los costos extras de esta compra',
			],
		},
		{
			text: 'Total IVA',
			key: 'total_iva',
			type: 'number',
			only_show: true,
			is_price: true,
			descriptions: [
				'Suma de todo el IVA de la compra.',
				'Si el modo facturacion es "automatico" se obtendra del iva de todos los articulos.',
				'Si el modo facturacion es "manual" se obtendra del iva de las facturas cargadas manualmente en la compra.',
			],
		},
		{
			text: 'Total Final',
			key: 'total',
			type: 'number',
			only_show: true,
			is_price: true,
			show: true,
			check_simbolo_moneda: true,
			descriptions: [
				'Si "Total de las facturas" esta activado, el total final sera igual a la suma de los "Totales" todas las facturas + "Costos Extras" + Total Iva (en caso de activar "Total con IVA").',
				'Si esta desactivado, sera igual a la suma de:',
				'Total Articulos + Total Descuentos + Costos extras + IVA (en caso de tener activado "Total con IVA" en la compra).',
			]
		},
		{
			text: 'Resumen Ivas',
			key: 'iva_breakdown',
			not_show: true,
		},
	],
	singular_model_name_spanish: 'Compra',
	plural_model_name_spanish: 'Compras',
	create_model_name_spanish: 'Nueva Compra',
	text_delete: 'la',
}