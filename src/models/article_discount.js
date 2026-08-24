export default {
	properties: [
		{
			text: 'Porcentaje',
			key: 'percentage',
			type: 'number',
			is_title: true,
		},
		{
			// Clasifica el origen/motivo del descuento. Se usa para diferenciar descuentos cargados manualmente de las bonificaciones de proveedor (prompt 262/264)
			text: 'Tipo',
			key: 'tipo',
			type: 'select',
			value: 'otro',
			options: [
				{ value: 'bonificacion_proveedor', text: 'Bonificación proveedor' },
				{ value: 'otro', text: 'Otro' },
			],
			descriptions: [
				'Clasifica el motivo del descuento.',
				'"Bonificación proveedor": descuento originado por una bonificación cargada en la ficha del proveedor.',
				'"Otro": cualquier otro descuento cargado manualmente.',
			],
		},
		{
			text: 'Monto',
			key: 'amount',
			type: 'number',
			is_price: true,
		},
		{
			// Prompt 309 (tarea 4): distingue visualmente un descuento heredado de un proveedor
			// (se creo automaticamente al comprarle/asignarle ese proveedor al articulo, y se
			// barre solo si el usuario elige "eliminar descuentos" al cambiar de proveedor) de
			// uno manual (provider_id null, nunca se toca automaticamente desde el sistema).
			text: 'Proveedor',
			key: 'provider_id',
			type: 'select',
			store: 'provider',
			value: null,
			// Necesario para que la tabla resuelva el id a nombre del proveedor (ver "use_store_models" en generals.js)
			use_store_models: true,
			// Es un campo de solo lectura/informativo: el backend lo asigna automaticamente
			// (compras, import, o el modal de cambio de proveedor), nunca se carga a mano.
			not_show_on_form: true,
			descriptions: [
				'Proveedor que originó este descuento.',
				'Si tiene un proveedor asignado: es un descuento heredado automaticamente de ese proveedor (bonificacion estandar cargada en su ficha, o de una compra). Se elimina/reemplaza solo si el usuario elige la opcion "Eliminar descuentos" al cambiar el proveedor del articulo (o si se materializan nuevos descuentos de ese mismo proveedor).',
				'Si esta vacio: es un descuento manual cargado por el usuario. Nunca se toca ni se elimina automaticamente por cambios de proveedor.',
			],
		},
		{
			text: 'Mostrar en la tienda online',
			if_has_extencion: 'online',
			key: 'show_in_online',
			type: 'checkbox',
			value: 0,
		},
	],
	singular_model_name_spanish: 'Descuento',
	plural_model_name_spanish: 'Descuentos',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}