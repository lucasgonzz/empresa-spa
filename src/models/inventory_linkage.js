export default {
	properties: [
		{
			text: 'Cliente',
			key: 'client_id',
			type: 'search',
		},
		{
			text: 'Alcance',
			key: 'inventory_linkage_scope_id',
			store: 'inventory_linkage_scope',
			type: 'select',
		},
		{
			text: 'Categorias con descouento',
			key: 'categories',
			type: 'search',
			store: 'category',
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
						text: '% Descuento',
						key: 'percentage_discount',
						type: 'number',
					}
				],
			}
		},
	],
	singular_model_name_spanish: 'Vinculacion de inventario',
	plural_model_name_spanish: 'Vinculaciones de inventario',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}