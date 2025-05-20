export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			value: '',
			is_title: true,
			required: false,
		},
		{
			text: 'Liquidar comision despues de saldar la venta',
			key: 'commission_after_pay_sale',
			type: 'checkbox',
		},
		{
			text: 'Categorias',
			if_has_extencion: 'comisiones_por_categoria',
			store: 'category',
			key: 'categories',
			type: 'search',
			belongs_to_many: {
				model_name: 'category',
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
					},
				],
			},
		}
	],
	singular_model_name_spanish: 'Vendedor',
	plural_model_name_spanish: 'Vendedores',
	create_model_name_spanish: 'Nuevo vendedor',
	text_delete: 'el',
}