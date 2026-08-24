export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
		},
		{
			text: 'Sucursal/Deposito',
			key: 'address_id',
			type: 'select',
			relation_prop_name: 'street',
			use_store_models: true,
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Define ubicaciones físicas (estantería, pasillo, sector) para saber dónde está guardada la mercadería.',
		implicancias: 'Cada ubicación pertenece a una sucursal o depósito. Al asignarla a los artículos, el equipo puede encontrarlos más rápido al preparar pedidos o hacer inventario.',
		como_se_utiliza: 'Creá la ubicación con un nombre y la sucursal a la que pertenece, y asignala a los artículos desde su ficha.',
		palabras_clave: ['estanteria', 'gondola', 'pasillo', 'deposito', 'picking'],
	},
	singular_model_name_spanish: 'Ubicacion de articulo',
	plural_model_name_spanish: 'Ubicaciones de articulo',
	create_model_name_spanish: 'Nueva Ubicacion de articulo',
	text_delete: 'la',
}