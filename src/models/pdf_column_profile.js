export default {
	properties: [
		{
			text: 'Modelo',
			key: 'model_name',
			type: 'select',
			is_title: true,
			options: [
				{ value: 'sale', text: 'Venta (comprobantes)' },
				{ value: 'article', text: 'Artículo (listado PDF tabla)' },
			],
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
			show_when_model_name: 'sale',
		},
		{
			text: 'Mostrar comisiones',
			key: 'show_comissions',
			type: 'checkbox',
			value: 0,
			show_when_model_name: 'sale',
		},
		{
			text: 'Mostrar total costos',
			key: 'show_total_costs',
			type: 'checkbox',
			value: 0,
			show_when_model_name: 'sale',
		},
		{
			/**
			 * Flag para controlar visibilidad del total general en el pie del PDF.
			 */
			text: 'Mostrar total en el pie',
			key: 'show_total_in_footer',
			type: 'checkbox',
			value: 1,
			show_when_model_name: 'sale',
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
			show_when_model_name: 'sale',
		},
		{
			text: 'Opciones de columnas',
			key: 'pdf_column_options',
			store: 'pdf_column_option',
			type: 'search',
			not_show: true,
			not_show_on_form: true,
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
				],
				properties_to_set: [
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
					{
						text: 'Tamaño de letra (pt)',
						key: 'font_size',
						type: 'number',
						value: 8,
						show_when_model_name: 'article',
					},
					{
						text: 'Alineación horizontal',
						key: 'text_align',
						type: 'select',
						value: '',
						show_when_model_name: 'article',
						options: [
							{ value: '', text: 'Automática' },
							{ value: 'left', text: 'Izquierda' },
							{ value: 'center', text: 'Centro' },
							{ value: 'right', text: 'Derecha' },
						],
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
			/**
			 * Perfil remito/no fiscal enviado por WhatsApp (un solo activo por modelo).
			 */
			text: 'Predeterminado WhatsApp (remito)',
			key: 'is_default_whatsapp',
			type: 'checkbox',
			value: 0,
			show_when_model_name: 'sale',
		},
		{
			/**
			 * Perfil factura ARCA enviado por WhatsApp cuando la venta tiene ticket AFIP.
			 */
			text: 'Predeterminado WhatsApp (factura ARCA)',
			key: 'is_default_whatsapp_afip',
			type: 'checkbox',
			value: 0,
			show_when_model_name: 'sale',
		},
		{
			/**
			 * Ancho físico de la hoja. A4 portrait artículos/ventas: 210 mm.
			 */
			text: 'Ancho hoja (mm)',
			key: 'paper_width_mm',
			type: 'number',
			value: 297,
		},
		{
			/**
			 * Ancho útil de la hoja antes de márgenes laterales (A4: 210 mm).
			 * El espacio para columnas = imprimible − (margen × 2).
			 */
			text: 'Ancho imprimible (mm)',
			key: 'printable_width_mm',
			type: 'number',
			value: 277,
		},
		{
			/**
			 * Margen izquierdo y derecho por separado (A4 típico: 5 mm → 200 mm para columnas).
			 */
			text: 'Margen por lado (mm)',
			key: 'margin_mm',
			type: 'number',
			value: 5,
		},
		{
			text: 'Columnas del PDF',
			key: 'pdf_column_profile_editor',
			type: 'display',
			full_cols: true,
			not_show: true,
			not_show_on_table: true,
			not_show_on_form: false,
		},
		{
			/**
			 * Tamaño de letra uniforme para todos los encabezados de columna (th) del PDF tabular.
			 */
			text: 'Letra encabezado columnas (pt)',
			key: 'table_header_font_size',
			type: 'number',
			value: 8,
			show_when_model_name: 'article',
		},
		{
			text: 'Imagen de cabecera (cada página)',
			key: 'header_image_url',
			type: 'image',
			show_when_model_name: 'article',
			crop_aspect_ratio: 4/1,
		},
		{
			text: 'Pie de página',
			key: 'footer_text',
			type: 'textarea',
			value: '',
		},
	],
	singular_model_name_spanish: 'Diseño de PDF',
	plural_model_name_spanish: 'Diseño de PDF',
	create_model_name_spanish: 'Nuevo Diseño de PDF',
	text_delete: 'el',
}
