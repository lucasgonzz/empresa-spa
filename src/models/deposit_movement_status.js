export default {
	properties: [
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
			value: '',
			is_title: true,
			// Mision movimientos-deposito-auditoria (3/10/2026): aviso permanente debajo del nombre
			// cuando el estado es uno de los fijos del sistema ("En proceso" y "Recibido").
			nota_function: 'deposit_movement_status_nota_fijo',
		},
	],
	/*
		Estados fijos + propios (mision movimientos-deposito-auditoria, 3/10/2026). "En proceso" y
		"Recibido" son filas globales (`user_id` en NULL) que aparecen siempre y no se renombran ni
		se borran: en las bases compartidas las usan muchos comercios a la vez. Con un estado fijo
		abierto, todo el formulario queda de solo lectura (ver src/mixins/model_functions.js) y el
		ABM esconde Guardar y Eliminar (src/common-vue/views/Abm.vue). Los propios se crean, se
		editan y se borran como cualquier otro modelo del ABM.
	*/
	form_disabled_to_edit_function: 'deposit_movement_status_es_fijo',
	abm_descripcion: {
		para_que_sirve: 'Define los estados con los que seguís cada movimiento de mercadería entre depósitos (por ejemplo: preparando, en camino, recibido). "En proceso" y "Recibido" vienen con el sistema; los demás los creás vos.',
		implicancias: 'Los estados son etiquetas para saber en qué anda cada traslado: cambiar el estado no mueve el stock. El stock se mueve una sola vez, con el botón "Mover stock" de cada movimiento.',
		como_se_utiliza: 'Creá los estados de tu circuito y asignalos a los movimientos desde el módulo de depósitos. "En proceso" y "Recibido" no se pueden cambiar ni eliminar, y un estado que está usando algún movimiento no se puede eliminar hasta que le cambies el estado a esos movimientos.',
		palabras_clave: ['traslado', 'depositos', 'transito', 'stock', 'mover stock', 'estado'],
	},
	singular_model_name_spanish: 'Estado de Movimiento de deposito',
	plural_model_name_spanish: 'Estados de Movimiento de deposito',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}