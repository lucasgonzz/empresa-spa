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
	abm_descripcion: {
		para_que_sirve: 'Vincula tu catálogo con la cuenta de un cliente que también usa ComercioCity, para que revenda tus artículos.',
		implicancias: 'Al crear la vinculación, tus categorías y artículos se replican en la cuenta del cliente con los descuentos por categoría que definas, y el sistema le avisa cuando un artículo tuyo se agota. Es la base del circuito mayorista-minorista entre cuentas.',
		como_se_utiliza: 'Elegí el cliente, el alcance de la vinculación y las categorías con su porcentaje de descuento. La sincronización inicial puede demorar según el tamaño del catálogo.',
		palabras_clave: ['sincronizar', 'revendedor', 'mayorista', 'minorista', 'catalogo compartido'],
	},
	singular_model_name_spanish: 'Vinculacion de inventario',
	plural_model_name_spanish: 'Vinculaciones de inventario',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}