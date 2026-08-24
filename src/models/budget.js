export default {
	properties: [
		{
			text: 'N°',
			key: 'num',
			type: 'text',
			not_show_on_form: true,
		},
		{
			group_title: 'Datos generales',
		},
		{
			text: 'Cliente',
			key: 'client_id',
			store: 'client',
			type: 'search',
			// La busqueda va siempre contra la API (global-search/client), nunca contra el store:
			// hay cuentas con miles de clientes y el resultado no puede depender de que la descarga
			// del store haya terminado. No sacar.
			search_from_api: true,
			value: 0,
			is_title: true,
			show_btn_create: true,
			use_to_filter_in_modal: true,
			only_show: true,
		},
		{
			text: 'Sucursal',
			key: 'address_id',
			relation_prop_name: 'street',
			type: 'select',
			only_show: true,
			use_store_models: true,
		},
		{
			text: 'Moneda',
			type: 'select',
			key: 'moneda_id',
			only_show: true,
			if_has_extencion: 'ventas_en_dolares',
			use_store_models: true,
		},
		{
			text: 'Total',
			key: 'total',
			only_show: true,
			is_price: true,
			show: true,
		},
		{
			text: 'Estado del presupuesto',
			key: 'budget_status_id',
			type: 'select',
			value: 1,
			show: true,
			filterable: true,
			use_to_filter_in_modal: true,
			/*
				🔴 De solo lectura a proposito (pedido de Lucas, 24/8/2026): el estado se cambia
				UNICAMENTE con el boton Confirmar/Anular, que esta en la fila del listado
				(views/Budget.vue, slot table_left_options) y en el header del modal
				(budget/components/ModalButtons.vue).

				Confirmar no es editar un campo: crea la venta, descuenta stock y mueve la cuenta
				corriente del cliente. Con el select, ese efecto viajaba escondido adentro de un
				guardado completo del presupuesto, y desconfirmar directamente no se podia --el
				boton de guardar esta escondido cuando el presupuesto ya esta confirmado--.

				Se sigue VIENDO: `only_show` no lo saca del formulario, lo dibuja como valor. Y se
				sigue pudiendo FILTRAR por estado, porque `build_table_filters_from_props()` de
				generals.js no mira `only_show`.

				⚠️ `filterable` y `use_to_filter_in_modal`, que estaban de antes, no las lee ningun
				componente del repo (aparecen solo en archivos de models/). Se dejan porque no
				molestan, pero no son lo que sostiene el filtro.
			*/
			only_show: true,
		},
		{
			text: 'Empleado',
			key: 'employee_id',
			use_store_models: true,
			type: 'search',
			only_show: true,
		},
		{
			text: 'Observaciones',
			key: 'observations',
			type: 'textarea',
			value: '',
			show: true,
		},
		{
			text: 'Estado de venta',
			key: 'sale_status_id',
			type: 'select',
			use_store_models: true,
			value: null,
			show: true,
			v_if_function: 'show_budget_sale_status_id',
			/*
				🔴 Esta clave es lo que mantiene "Estado del presupuesto" FUERA de la actualizacion
				masiva, y es la otra mitad del pedido de Lucas del 24/8/2026.

				`propertiesToUpdate()` (generals.js) es una LISTA BLANCA con default invertido: si
				ninguna prop del modelo tiene `use_to_update`, devuelve TODAS. Como budget.js no
				tenia ni una, el modal "Actualizar" ofrecia todos los campos --incluido el estado--
				y `only_show` no lo salvaba: `set_form()` de
				view/header/opciones-filtrados-seleccion/Update.vue arma la tarjeta mirando solo
				`showProperty(prop)`, que no consulta `only_show`.

				Y ese camino es el peor de todos: pega a `PUT update/{model_name}`
				(CommonLaravel\UpdateController), no a BudgetController::update(). O sea que se
				podian marcar N presupuestos como "Confirmado" sin que se creara ninguna venta, sin
				descontar stock y sin mover la cuenta corriente, salteandose ademas el 422 de
				"El presupuesto esta confirmado".

				Marcando aca, la lista blanca se activa y el masivo queda con este campo solamente.
				Es el unico del modelo que es a la vez editable en el formulario y de un tipo que
				`set_form()` sabe dibujar (number, select, search o checkbox: `observations` es
				textarea y nunca genero tarjeta). Si alguna vez hace falta otro campo en el masivo,
				se le agrega `use_to_update: true` y listo -- pero NO al estado del presupuesto.
			*/
			use_to_update: true,
		},
		{
			group_title: 'Productos y servicios',
		},
		{
			text: 'Descontar stock',
			key: 'discount_stock',
			type: 'checkbox',
			value: true,
			show: true,
			only_show: true,
			description: 'Si está activo, al confirmar el presupuesto la venta generada descontará stock (artículos y promociones).',
		},
		{
			text: 'Precios con IVA',
			key: 'iva_aplicado',
			type: 'checkbox',
			value: true,
			show: true,
			description: 'Se guarda en el presupuesto y se aplica al generar la venta al confirmar; coherente con el flag en VENDER.',
			only_show: true,
		},
		{
			text: 'Articulos',
			store: 'article',
			key: 'articles',
			type: 'search',
			only_show: true,
			belongs_to_many: {
				model_name: 'article',
				create_if_not_exist: true,
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',
						function: 'get_budget_article_display_name',
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
				],
				pivot_props_to_show: [
					{
						text: 'Precio',
						key: 'price',
						// value: {key: 'final_price', value_if_undefined: ''},
						type: 'number',
						is_price: true,
						// set_with_function: 'setBudgetArticlePrice',
					},
					{
						text: 'Cantidad',
						key: 'amount',
						value: '',
						type: 'number'
					},
					{
						text: 'Desc',
						key: 'bonus',
						value: '',
						type: 'number'
					},
					{
						text: 'Costo',
						key: 'cost',
						is_price: true,
						if_is_admin: true,
						check_simbolo_moneda: true,
					},
					// {
					// 	text: 'Ubicacion',
					// 	key: 'location',
					// 	value: '',
					// 	type: 'textarea'
					// },
					{
						text: 'Total',
						key: 'total_item',
						function: 'totalBudgetItem',
					},
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
			text: 'Servicios',
			store: 'service',
			key: 'services',
			type: 'search',
			only_show: true,
			belongs_to_many: {
				model_name: 'service',
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',
						type: 'textarea',
						show: true,
					},
				],
				pivot_props_to_show: [
					{
						text: 'Precio',
						key: 'price',
						type: 'number',
						is_price: true,
					},
					{
						text: 'Cantidad',
						key: 'amount',
						value: '',
						type: 'number'
					},
					{
						text: 'Total',
						key: 'total_item',
						function: 'totalBudgetItem',
					},
				],
			}
		},
		{
			text: 'Promociones',
			store: 'promocion_vinoteca',
			key: 'promocion_vinotecas',
			type: 'search',
			only_show: true,
			belongs_to_many: {
				model_name: 'promocion_vinoteca',
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',
						type: 'textarea',
						show: true,
					},
				],
				pivot_props_to_show: [
					{
						text: 'Precio',
						key: 'price',
						type: 'number',
						is_price: true,
					},
					{
						text: 'Cantidad',
						key: 'amount',
						value: '',
						type: 'number'
					},
					{
						text: 'Total',
						key: 'total_item',
						function: 'totalBudgetItem',
					},
				],
			}
		},

		{
			group_title: 'Descuentos y recargos'
		},
		{
			text: 'Descuentos',
			key: 'discounts',
			type: 'search',
			store: 'discount',
			only_show: true,
			not_show: true,
			belongs_to_many: {
				model_name: 'discount',
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',
					},
					{
						text: 'Porcentaje',
						key: 'percentage',
					},
				],
			}
		},
		{
			text: 'Recargos',
			key: 'surchages',
			store: 'surchage',
			type: 'search',
			not_show: true,
			only_show: true,
			belongs_to_many: {
				model_name: 'surchage',
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',
					},
					{
						text: 'Porcentaje',
						key: 'percentage',
					},
				],
			}
		},
	],
	singular_model_name_spanish: 'Presupuesto',
	plural_model_name_spanish: 'Presupuestos',
	create_model_name_spanish: 'Nuevo presupuesto',
	text_delete: 'el',
}