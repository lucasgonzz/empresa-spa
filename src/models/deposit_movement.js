export default {
	properties: [
		{
			text: 'N°',
			key: 'num',
			not_show_on_form: true,
			filter_modal_position: 1,
		},
		{
			text: 'Empleado',
			key: 'employee_id',
			type: 'select',
			value: 0,
			use_store_models: true,
			filter_modal_position: 2,
		},
		{
			text: 'Estado',
			key: 'deposit_movement_status_id',
			type: 'select',
			value: 1,
			show: true,
			filter_modal_position: 3,
		},
		{
			text: 'Deposito ORIGEN',
			key: 'from_address_id',
			store: 'address',
			relation_prop_name: 'street',
			use_store_models: true,
			type: 'select',
			value: 0,
			show: true,
			filter_modal_position: 4,
		},
		{
			text: 'Deposito DESTINO',
			key: 'to_address_id',
			store: 'address',
			relation_prop_name: 'street',
			use_store_models: true,
			type: 'select',
			value: 0,
			show: true,
			filter_modal_position: 5,
		},
		{
			text: 'Articulos',
			store: 'article',
			search_on_models_by: 'name',
			type: 'search',
			search_from_api_function: 'search_from_api_in_provider_order',
			key: 'articles',
			belongs_to_many: {
				model_name: 'article',
				props_to_show: [
					{
						text: 'Codigo de barras',
						key: 'bar_code',
						show: true,
					},
					{
						text: 'Codigo Prov',
						key: 'provider_code',
						show: true,
					},
					{
						text: 'Nombre',
						key: 'name',
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
					{
						text: 'Variante',
						key: 'article_variant_id',
						value: 0,
						select_prop_name: 'variant_description',
						v_if: {
							b_t_many_model_prop: 'article_variants',
							check_array_length: true,
						},
						type: 'select',
						get_options_function: 'get_variants_for_deposit_movement',
					},
				],
			}
		},
		{
			text: 'Notas',
			key: 'notes',
			type: 'textarea',
			value: '',
			show: true,
		},
	],
	singular_model_name_spanish: 'Movimiento de deposito',
	plural_model_name_spanish: 'Movimientos de deposito',
	create_model_name_spanish: 'Nuevo Movimiento de deposito',
	text_delete: 'el',
}