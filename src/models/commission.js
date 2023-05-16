export default {
	properties: [
		{
			text: 'N°',
			key: 'num', 
			type: 'text',
			value: '',
			show: true,
			not_show_on_form: true,
			use_to_filter_in_search: true,
		},
		{
			text: 'Desde',
			key: 'from',
			type: 'number',
		},
		{ 
			text: 'Hasta',
			key: 'until',
			type: 'number',
		},
		{
			text: 'Tipo de Venta',
			key: 'sale_type_id',
			type: 'select',
			use_store_models: true,
		},
		{
			text: 'Porcentaje',
			key: 'percentage',
			type: 'number',
		},
		{
			text: 'Para todos los Vendedores',
			key: 'for_all_sellers',
			type: 'search',
			description: 'Si se agregan vendedores, cuando una venta ingrese en el rango de descuentos, SIEMPRE se crearan las comisiones para estos Vendedores, independientemente de si el cliente de la venta pertenece o no a estos.',
			store: 'seller',
			belongs_to_many: {
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',
					},
				],
				properties_to_set: [
					{
						text: 'Porcentaje',
						key: 'percentage',
						type: 'number',
					}
				],
			}
		},
		{
			text: 'Solo para los Vendedores',
			key: 'for_only_sellers',
			type: 'search',
			description: 'Si se agregan vendedores, cuando una venta ingrese en el rango de descuentos, SOLO se crearan las comisiones para estos Vendedores, siempre y cuando el cliente de la venta pertenezca a estos vendedores.',
			store: 'seller',
			belongs_to_many: {
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',
					},
				],
			}
		},
		{
			text: 'Excepto para los Vendedores',
			key: 'except_sellers',
			type: 'search',
			description: 'Si se agregan vendedores, cuando una venta ingrese en el rango de descuentos, aunque el cliente de la venta pertenezca a uno de los vendedores, no se creara su comision.',
			store: 'seller',
			belongs_to_many: {
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',
					},
				],
			}
		},
	],
	singular_model_name_spanish: 'Comision',
	plural_model_name_spanish: 'Comisiones',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}