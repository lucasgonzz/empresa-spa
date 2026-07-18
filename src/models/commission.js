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
			text: 'Vendedor',
			key: 'seller_id',
			type: 'select',
			use_store_models: true,
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
	abm_descripcion: {
		para_que_sirve: 'Define las reglas de comisión porcentual para los vendedores según las condiciones de la venta.',
		implicancias: 'Cuando una venta entra en el rango de descuento definido (desde/hasta) y coincide el tipo de venta, el sistema genera automáticamente la comisión para los vendedores que correspondan. Podés incluir vendedores siempre, limitar solo a los vendedores del cliente o excluir vendedores puntuales.',
		como_se_utiliza: 'Creá la regla indicando el rango de descuento de la venta, el tipo de venta, el porcentaje y a qué vendedores aplica. Las comisiones generadas se consultan en el módulo de vendedores.',
		palabras_clave: ['vendedores', 'porcentaje', 'incentivo', 'liquidacion'],
	},
	singular_model_name_spanish: 'Comision',
	plural_model_name_spanish: 'Comisiones',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}