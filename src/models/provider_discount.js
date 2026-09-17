export default {
	properties: [
		{
			/*
				Mision sincronizar-descuentos-proveedor (17/9/2026): el descuento del proveedor
				ahora lleva un nombre para que el comercio sepa POR QUE se lo hacen
				("Bonificacion por volumen", "Acuerdo anual", "Pago contado"). Ese mismo nombre
				se copia al descuento del articulo cuando se sincroniza, asi que en la ficha del
				articulo se lee el motivo y no solo el porcentaje.

				🔴 NO lleva is_title, aunque semanticamente sea el titulo de la fila. Este modelo
				no declaraba ninguna prop con is_title, y agregarselo se nota en la ventana de
				despliegue: los dos repos no llegan juntos a produccion, asi que durante horas o
				dias la API vieja no devuelve `nombre`, viene undefined y el titulo de la tarjeta
				de cada descuento queda EN BLANCO en telefono (ver CardComponent.vue, computed
				`titles`). Sin is_title la tarjeta se comporta igual que hoy.
			*/
			text: 'Nombre',
			key: 'nombre',
			type: 'text',
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
