export default {
	properties: [
		{
			text: 'Descripcion',
			key: 'description',
			type: 'text',
		},
		{
			// Prompt 612: aclara que este importe es el bruto final del comprobante (con IVA
			// incluido si el costo extra esta facturado), no un valor "neto" a discriminar aparte.
			text: 'Valor',
			key: 'value',
			type: 'number',
			is_price: true,
			description: 'Importe bruto final de este costo extra, tal como figura en el comprobante (con IVA incluido si esta facturado).',
		},
		{
			// Clasifica el costo extra. Si el tipo es Transporte/Seguro/Arancel-Importacion, el backend prorratea este costo entre los articulos de la compra y crea/actualiza un recargo (article_surchage) del mismo tipo en cada articulo (prompt 264)
			text: 'Tipo',
			key: 'tipo',
			type: 'select',
			value: 'otro',
			options: [
				{ value: 'transporte', text: 'Transporte' },
				{ value: 'seguro', text: 'Seguro' },
				{ value: 'arancel_importacion', text: 'Arancel/Importación' },
				{ value: 'otro', text: 'Otro' },
			],
			descriptions: [
				'Clasifica el costo extra de la compra.',
				'"Transporte", "Seguro" y "Arancel/Importación": el costo se prorratea automaticamente entre los articulos de la compra y se refleja como un recargo del mismo tipo en cada articulo.',
				'"Otro": el costo se suma al total de la compra pero NO se prorratea ni genera recargos en los articulos.',
			],
		},
		{
			// Prompt 517: indica si este costo extra vino facturado. Controla la visibilidad del
			// resto de los campos nuevos (alicuota, en_factura_compra, emisor) via "v_if_function".
			text: 'Facturado',
			key: 'facturado',
			type: 'checkbox',
			value: 0,
			description: 'Indica si este costo extra (flete, seguro, etc.) vino facturado. Si está facturado, genera IVA crédito y hay que indicar con qué alícuota; si no, suma al costo sin IVA.',
		},
		{
			text: 'Alicuota IVA',
			key: 'iva_id',
			type: 'select',
			relation_prop_name: 'percentage',
			use_store_models: true,
			// Prompt 612: ademas de requerir "Facturado", ahora tambien se oculta en cuentas
			// Monotributista (ver "show_costo_extra_iva_si_facturado_y_rrii" en
			// src/common-vue/mixins/model_functions.js): al Monotributista nunca le discriminan el
			// IVA, no tiene alicuota que elegir.
			v_if_function: 'show_costo_extra_iva_si_facturado_y_rrii',
			description: 'Alícuota de IVA con la que se facturó este costo extra (puede ser distinta a la de la mercadería; ej. el flete suele ir a 21%).',
		},
		{
			// Prompt 612: label mas explicito sobre lo que implica activar/desactivar este control
			// (antes "Va en la factura de la compra").
			text: 'La factura viene incluida en la compra',
			key: 'en_factura_compra',
			type: 'checkbox',
			value: 1,
			v_if_function: 'show_costo_extra_si_facturado',
			description: 'Activado: este costo extra va dentro de la misma factura de la compra. Desactivado: se factura aparte (por ejemplo, cuando el transporte lo hizo otra empresa): se va a generar automaticamente un comprobante separado con el total de este costo extra, para completar despues con los datos del emisor (CUIT y razón social).',
		},
		{
			text: 'CUIT emisor',
			key: 'emisor_cuit',
			type: 'text',
			// Solo se muestra si esta facturado Y la factura es aparte (no va en la factura de la compra)
			v_if_function: 'show_costo_extra_si_factura_aparte',
			description: 'CUIT del emisor de la factura aparte de este costo extra (ej. la empresa de transporte que lo facturó por separado).',
		},
		{
			text: 'Razon social emisor',
			key: 'emisor_razon_social',
			type: 'text',
			v_if_function: 'show_costo_extra_si_factura_aparte',
			description: 'Razón social del emisor de la factura aparte de este costo extra.',
		},
	],
	singular_model_name_spanish: 'Costo Extra',
	plural_model_name_spanish: 'Costos Extra',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'el',
}