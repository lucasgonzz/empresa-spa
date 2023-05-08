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
			text: 'Vendedores',
			key: 'sellers',
			type: 'search',
			description: 'Si se agregan vendedores a esta comision, SIEMPRE se crearan las comisiones para esos Vendedores, independientemente de si el cliente de la venta pertenece o no a estos.',
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
	],
	singular_model_name_spanish: 'Comision',
	plural_model_name_spanish: 'Comisiones',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}