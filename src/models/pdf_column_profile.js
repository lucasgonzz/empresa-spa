export default {
	properties: [
		{
			text: 'Modelo',
			key: 'model_name',
			type: 'text',
			is_title: true,
		},
		{
			text: 'Nombre',
			key: 'name',
			type: 'text',
		},
		{
			text: 'Es factura de ARCA',
			key: 'is_afip_ticket',
			type: 'checkbox',
		},
		{
			text: 'Mostrar comisiones',
			key: 'show_comissions',
			type: 'checkbox',
			value: 0,
		},
		{
			text: 'Mostrar total costos',
			key: 'show_total_costs',
			type: 'checkbox',
			value: 0,
		},
		{
			/**
			 * Flag para controlar visibilidad del total general en el pie del PDF.
			 */
			text: 'Mostrar total en el pie',
			key: 'show_total_in_footer',
			type: 'checkbox',
			value: 1,
		},
		{
			/**
			 * Cuando está activo, el PDF imprime la fecha actual del servidor
			 * en lugar de la fecha en que se creó el comprobante.
			 */
			text: 'Imprimir con fecha actual',
			key: 'use_current_date',
			type: 'checkbox',
			value: 0,
		},
		{
			text: 'Opciones',
			key: 'pdf_column_options',
			store: 'pdf_column_option',
			type: 'search',
			belongs_to_many: {
				model_name: 'pdf_column_option',
				props_to_filter: [
					'name',
					'label',
				],
				props_to_show: [
					{
						text: 'Nombre',
						key: 'name',
					},
					{
						text: 'PDF',
						key: 'label',
					},
					// {
					// 	text: 'Key',
					// 	key: 'key',
					// },
				],
				properties_to_set: [
					// {
					// 	text: 'Visible',
					// 	key: 'visible',
					// 	type:
					// },
					{
						text: 'Orden',
						key: 'order',
						type: 'number',
						value: '',
					},
					{
						text: 'Ancho',
						key: 'width',
						type: 'number',
						value: '',
					},
					{
						text: 'Salto de linea',
						key: 'wrap_content',
						type: 'checkbox',
						value: 0,
					},
				],
			},
		},
		{
			text: 'Perfil por defecto',
			key: 'is_default',
			type: 'checkbox',
			value: 0,
		},
		{
			text: 'Ancho hoja (mm)',
			key: 'paper_width_mm',
			type: 'number',
			value: 297,
		},
		{
			text: 'Ancho imprimible (mm)',
			key: 'printable_width_mm',
			type: 'number',
			value: 277,
		},
	{
		text: 'Margen por lado (mm)',
		key: 'margin_mm',
		type: 'number',
		value: 5,
	},
	{
		text: 'Pie de página',
		key: 'footer_text',
		type: 'textarea',
		value: '',
	},
	// {
		// 	text: 'Columnas (JSON)',
		// 	key: 'columns',
		// 	type: 'textarea',
		// 	not_show: true,
		// 	value: '[]',
		// },
	],
	singular_model_name_spanish: 'Perfil de columnas PDF',
	plural_model_name_spanish: 'Perfiles de columnas PDF',
	create_model_name_spanish: 'Nuevo perfil de columnas PDF',
	text_delete: 'el',
}

