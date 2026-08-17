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
			// La busqueda va siempre contra la API (global-search/provider), nunca contra el store:
			// hay cuentas con miles de proveedores y el resultado no puede depender de que la
			// descarga del store haya terminado. Sin esto, buscar apenas carga la pagina no
			// devuelve nada y el Enter dispara el alta de un proveedor nuevo. No sacar.
			search_from_api: true,
			value: 0,
			is_title: true,
			required: true,
			filter_modal_position: 2,
			disabled_to_edit: true,
			description: 'Proveedor al que va a pertenecer la compra. Si el proveedor tiene bonificaciones cargadas, se precargan automaticamente como descuentos editables de la compra (ver "prefill_has_many_on_select")',
			// Al elegir un proveedor con bonificaciones cargadas (provider.provider_discounts), precarga cada una como
			// fila editable en "Descuentos de la compra" (provider_order_discounts), tal como hace el backend al confirmar
			// la orden (prompt 262/265). Solo precarga si el usuario todavia no cargo descuentos manualmente.
			prefill_has_many_on_select: {
				source_prop: 'provider_discounts',
				target_key: 'provider_order_discounts',
				target_model_name: 'provider_order_discount',
				description_text: 'Bonificación de proveedor',
				only_if_empty: true,
			},
			// Prompt 517: al elegir un proveedor, precarga el check "precios_incluyen_iva" de la
			// compra con el default configurado en el proveedor (provider.precios_incluyen_iva).
			// El usuario puede sobreescribirlo despues en esta misma compra sin problema.
			prefill_prop_on_select: {
				source_prop: 'precios_incluyen_iva',
				target_key: 'precios_incluyen_iva',
			},
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
			// Prompt 517: define si los precios cargados en esta compra ya incluyen IVA. Se precarga
			// automaticamente al elegir el proveedor (ver "prefill_prop_on_select" en la prop
			// "provider_id" de este mismo modelo), pero el usuario puede sobreescribirlo para esta
			// compra puntual: el valor de la compra siempre manda sobre el default del proveedor.
			// Prompt 611: solo se muestra para cuentas Responsable Inscripto. En Monotributista se
			// oculta por completo (el proveedor nunca le discrimina el IVA al monotributista, se
			// asume siempre que los precios ya lo incluyen). El render de este campo se reemplaza
			// por un componente propio (slot "precios_incluyen_iva" en
			// src/components/provider/components/orders/Index.vue) que agrega, debajo del control,
			// una descripcion SIEMPRE VISIBLE (no popover) que cambia segun el estado del toggle -
			// por eso ya no se usa "descriptions" aca (quedaba como popover solo al hacer click,
			// que era justamente la confusion que este prompt vino a resolver).
			text: 'Los precios ya incluyen IVA',
			key: 'precios_incluyen_iva',
			type: 'checkbox',
			value: 0,
			not_show: true,
			v_if_function: 'es_responsable_inscripto_v_if_function',
		},
		{
			text: 'Actualizar precios',
			key: 'update_prices',
			type: 'checkbox',
			value: 0,
			not_show: true,
			no_se_puede_desactivar: true,
			// Prompt 309 (tarea 2): descripcion completa de todo lo que implica activar/desactivar
			// esta opcion, para que quede documentado en la UI (tooltip/ayuda) que se le muestra al usuario.
			descriptions: [
				'Una vez que active esta opcion, el sistema actualizara los costos/precios de sus articulos en el LISTADO en base a los valores indicados en esta compra. Una vez activada esta accion NO ES REVERSIBLE.',
				'Activado, implica TODO lo siguiente:',
				'1. El costo del articulo se actualiza al costo bruto oficial de la compra, sin descuentos.',
				'2. Los descuentos de la compra se materializan como descuentos del articulo atados a ese proveedor, barriendo (reemplazando) los descuentos que tenia atados al proveedor anterior.',
				'3. El articulo pasa a pertenecer al proveedor de esta compra.',
				'4. Los costos extra tipados (transporte, seguro, arancel, etc.) se prorratean entre los articulos de la compra y se materializan como recargos del articulo.',
				'5. Se recalcula el costo real y el precio final del articulo en base a todo lo anterior.',
				'Si nunca activa esta opcion (desactivado), no se toca nada del articulo: ni su costo, ni sus descuentos, ni su proveedor, ni su precio. La compra se registra igual (stock, cuenta corriente del proveedor, factura), solo que sin impactar en el LISTADO de articulos.',
			]
		},
		{
			text: 'Generar movimientos de Stock',
			key: 'update_stock',
			type: 'checkbox',
			value: 0,
			not_show: true,
			no_se_puede_desactivar: true,
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
			no_se_puede_desactivar: true,
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
				// Los table_width van explicitos a proposito: el ancho por defecto de una columna de
				// pivot_set no esta en un solo lugar, esta repartido y con valores distintos segun el
				// camino de render (300 en BelongsToManyTable.vue:390; 300 o 150 en
				// common-vue/components/display/table/Index.vue:575/567 segun la prop tenga o no
				// if_has_extencion). Fijar el ancho aca es lo unico que hace que la tabla de compras se
				// vea igual por los dos caminos, asi que no son redundantes con ningun default: no los
				// borres.
				// Ojo: esto solo lo ven los usuarios que todavia no guardaron su preferencia
				// btm_provider_order_articles, porque BelongsToManyTable.vue:434 le da prioridad al
				// ancho guardado.
				properties_to_set: [
					{
						text: 'Cantidad',
						key: 'amount',
						value: '',
						type: 'number',
						table_width: 150,
					},
					{
						text: 'Cant Recibida',
						key: 'received',
						value: '',
						type: 'number',
						table_width: 150,
					},
					{
						text: 'Costo',
						key: 'cost',
						value: {
							key: 'cost',
						},
						type: 'number',
						// Hasta 4 decimales en BD; en UI solo se muestran 3.º/4.º si el usuario los usa.
						variable_decimals: { min: 2, max: 4 },
						table_width: 200,
					},
					{
						text: 'Precio',
						key: 'price',
						value: {
							key: 'price',
						},
						type: 'number',
						table_width: 200,
					},
					{
						text: 'Descuento',
						key: 'discount',
						type: 'number',
						table_width: 200,
					},
					{
						text: 'Costo en dolares',
						key: 'cost_in_dollars',
						if_has_extencion: 'costo_en_dolares',
						// value: 0,
						value: {
							key: 'cost_in_dollars',
						},
						type: 'checkbox',
						table_width: 200,
					},
					{
						text: 'Actualizar proveedor en el sistema',
						key: 'update_provider',
						value: 0,
						type: 'checkbox',
						table_width: 200,
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
						table_width: 200,
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
	/*
		🔴 Sin esto el formulario de la compra PIERDE lo que el usuario ya cargo.

		El computed model() de common-vue/components/model/Index.vue devuelve una COPIA nueva del
		modelo del store (`{...model}`) para todo modelo que no declare esto. ModelForm escribe en
		esa copia, pero varios controles propios de este modulo --el toggle "Los precios ya incluyen
		IVA" (PreciosIncluyenIva.vue), y Total.vue / IvaBreakdown / PriceDescription para leer--
		hablan directo con el modelo del STORE, porque el slot de ModelForm no les pasa el modelo del
		formulario. Entonces, apenas el toggle escribia en el store, el computed se recalculaba,
		devolvia una copia recien sacada de ahi y se borraba todo lo editado hasta ese momento.

		Se veia asi: elegis el deposito, tocas el toggle de IVA, y al guardar salta "Ingrese
		Deposito" con el select otra vez en "Seleccione Deposito". No era solo el deposito: se perdia
		cualquier campo cargado antes de esa escritura. Medido el 15/8/2026 leyendo los tres objetos
		desde el navegador (hallazgo
		20260815-el-formulario-pierde-lo-editado-cuando-algo-escribe-en-el-modelo-del-store).

		Con esto los dos lados quedan sobre el MISMO objeto, que es lo que los componentes propios
		del modulo ya venian asumiendo. La contra a tener presente: el formulario ahora mutua el
		modelo del store en vivo, y setModel lo guarda por referencia (store/__base_store.js), asi
		que editar una compra y cerrar sin guardar deja los cambios en el objeto hasta que se vuelva
		a cargar el modelo. Decision de Lucas del 15/8/2026 frente a la alternativa de pasar el
		modelo por el scope del slot, que dejaba a Total.vue e IvaBreakdown sin enterarse del cambio.
	*/
	full_reactivity: true,
}