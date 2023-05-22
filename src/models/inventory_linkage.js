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
	],
	singular_model_name_spanish: 'Vinculacion de inventario',
	plural_model_name_spanish: 'Vinculaciones de inventario',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}