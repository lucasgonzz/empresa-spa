export default {
	properties: [
		{
			/*
				Mision sincronizar-descuentos-proveedor (17/9/2026): el descuento del proveedor
				ahora lleva un nombre para que el comercio sepa POR QUE se lo hacen
				("Bonificacion por volumen", "Acuerdo anual", "Pago contado"). Ese mismo nombre
				se copia al descuento del articulo cuando se sincroniza, asi que en la ficha del
				articulo se lee el motivo y no solo el porcentaje.

				Va como is_title porque es el titulo humano del descuento: es lo que identifica
				la fila. Antes de esta mision el modelo no declaraba ninguna prop con is_title.
			*/
			text: 'Nombre',
			key: 'nombre',
			type: 'text',
			is_title: true,
		},
		{
			text: 'Porcentaje',
			key: 'percentage',
			type: 'number',
		},
	],
	singular_model_name_spanish: 'Descuento',
	plural_model_name_spanish: 'Descuentos',
	create_model_name_spanish: 'Nuevo Descuento',
	text_delete: 'el',
}
