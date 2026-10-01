export default {
	properties: [
		{
			text: 'Modelo',
			key: 'model_name',
			type: 'select',
			is_title: true,
			// Requerido para que el chequeo de Index.vue avise "Ingrese Modelo" si se intenta guardar sin elegir uno.
			required: true,
			options: [
				// Opción placeholder con value: 0 para matchear el valor inicial del select (evita el bug de la opción "fantasma" seleccionada sin disparar change).
				{ value: 0, text: 'Seleccioná un modelo' },
				{ value: 'sale', text: 'Venta (comprobantes)' },
				{ value: 'article', text: 'Artículo (listado PDF tabla)' },
				// Misión pdf-presupuestos-y-pedidos-personalizables (29/9/2026): el presupuesto y el
				// pedido online se diseñan igual que la venta (columnas, encabezado, pie y totales).
				// El value es el `model_name` que la API usa para su catálogo de columnas
				// (GET pdf-column-options?model_name=budget|order) y para elegir el diseño al imprimir.
				{ value: 'budget', text: 'Presupuesto' },
				{ value: 'order', text: 'Pedido online' },
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
		/*
			Misión diseno-pdf-configurable (1/10/2026): comisiones, costos, total, sub total,
			observaciones del cliente, la hoja, el margen, el logo y el texto del pie de venta,
			presupuesto y pedido online pasan a decidirse en el diseñador de PDF ("Diseñar PDF", con
			cajas y campos). Acá dejan de mostrarse para esos modelos: `show_when_model_name: []` (lista
			vacía) = no se muestra para ninguno. Las propiedades siguen declaradas porque viajan en el
			payload del formulario (getModelToSend arma el envío desde `model`) y con su `value` de
			siempre: un perfil nuevo nace con los defaults de hoy y su PDF de siempre sale igual (y
			el diseño derivado que muestra el diseñador también los usa).
		*/
		{
			text: 'Mostrar comisiones',
			key: 'show_comissions',
			type: 'checkbox',
			value: 0,
			show_when_model_name: [],
		},
		{
			text: 'Mostrar total costos',
			key: 'show_total_costs',
			type: 'checkbox',
			value: 0,
			show_when_model_name: [],
		},
		{
			/**
			 * Flag para controlar visibilidad del total general en el pie del PDF de siempre.
			 * Aplica a venta, presupuesto y pedido online. En el presupuesto, apagarlo es justamente
			 * lo que da el diseño "Presupuesto sin precios": no se imprime ningún renglón de totales.
			 * Desde el diseñador de PDF se decide con la caja de totales (no se muestra acá).
			 */
			text: 'Mostrar total en el pie',
			key: 'show_total_in_footer',
			type: 'checkbox',
			value: 1,
			show_when_model_name: [],
		},
		{
			/**
			 * Muestra la línea "Sub Total" en el pie del PDF de siempre (flag del backend, prompt
			 * 417). Solo tiene efecto cuando el comprobante tiene descuentos o recargos. Default 1 =
			 * comportamiento legacy. Desde el diseñador de PDF es el campo "Sub total" de la caja de
			 * totales (no se muestra acá).
			 */
			text: 'Mostrar Sub Total en el pie',
			key: 'show_subtotal_in_footer',
			type: 'checkbox',
			value: 1,
			show_when_model_name: [],
		},
		{
			/**
			 * Cómo se listan los descuentos y recargos en el pie (prompt 431/433):
			 * 'descriptivo' = monto + porcentaje + total acumulado por cada uno (comportamiento actual);
			 * 'simple' = solo el porcentaje y el nombre, sin montos ni totales parciales.
			 */
			text: 'Detalle de descuentos y recargos',
			key: 'discount_display_mode',
			type: 'select',
			value: 'descriptivo',
			show_when_model_name: 'sale',
			options: [
				{ value: 'descriptivo', text: 'Descriptivo (monto, porcentaje y total por cada uno)' },
				{ value: 'simple', text: 'Simple (solo porcentaje y nombre)' },
			],
		},
		{
			/**
			 * Controla si TODO el pie de página (total, subtotal, comisiones, costos y texto libre)
			 * se imprime en cada hoja o solo en la última. Apagado (default) = solo en la última página.
			 * Esta columna ya existía en la base; acá solo se la expone en el editor de perfiles
			 * (antes solo estaba en el modal de impresión).
			 */
			text: 'Mostrar pie de página en cada hoja',
			key: 'show_totals_on_each_page',
			type: 'checkbox',
			value: 0,
			show_when_model_name: 'sale',
		},
		{
			/**
			 * Cuando está activo, el PDF imprime la fecha actual del servidor
			 * en lugar de la fecha en que se creó el comprobante.
			 * Aplica a venta, presupuesto y pedido online.
			 */
			text: 'Imprimir con fecha actual',
			key: 'use_current_date',
			type: 'checkbox',
			value: 0,
			show_when_model_name: ['sale', 'budget', 'order'],
		},
		{
			/**
			 * Controla si las observaciones del cliente (campo "Observaciones" del cliente)
			 * se imprimen en el PDF de siempre. Default 1 = comportamiento legacy (se imprimían
			 * siempre que el cliente tuviera observaciones cargadas). En los diseños de presupuesto
			 * sembrados nace apagada: es una nota que muchos dueños usan como interna y el PDF le llega
			 * al cliente. Desde el diseñador de PDF es el campo "Observaciones del cliente" (no se
			 * muestra acá).
			 */
			text: 'Mostrar observaciones del cliente',
			key: 'show_client_description',
			type: 'checkbox',
			value: 1,
			show_when_model_name: [],
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
			 * Perfil predeterminado para PDF de ventas que imprime el buyer desde la tienda.
			 */
			text: 'Predeterminado Tienda (ecommerce)',
			key: 'is_default_tienda',
			type: 'checkbox',
			value: 0,
			show_when_model_name: 'sale',
		},
		{
			/**
			 * Ancho físico de la hoja. A4 portrait artículos: 210 mm.
			 *
			 * Solo se muestra para artículo. Venta, presupuesto y pedido online eligen la hoja en el
			 * diseñador de PDF (A4, Carta, Oficio o A5): su PDF de siempre es una hoja A4 vertical con
			 * 200 mm útiles, y el diseño con cajas usa la hoja que se elige ahí. El valor igual viaja
			 * en el payload (la API lo exige): un diseño nuevo de presupuesto o pedido arranca en
			 * 210/210/5 (ver `apply_article_a4_defaults()` del editor).
			 */
			text: 'Ancho hoja (mm)',
			key: 'paper_width_mm',
			type: 'number',
			value: 297,
			show_when_model_name: ['article'],
		},
		{
			/**
			 * Ancho útil de la hoja antes de márgenes laterales (A4: 210 mm).
			 * El espacio para columnas = imprimible − (margen × 2). Solo artículo (ver arriba); el
			 * diseñador de PDF lo guarda igual al ancho de la hoja.
			 */
			text: 'Ancho imprimible (mm)',
			key: 'printable_width_mm',
			type: 'number',
			value: 277,
			show_when_model_name: ['article'],
		},
		{
			/**
			 * Margen izquierdo y derecho por separado (A4 típico: 5 mm → 200 mm para columnas).
			 * Solo artículo; en el diseñador de PDF es el margen de la hoja (los cuatro lados).
			 */
			text: 'Margen por lado (mm)',
			key: 'margin_mm',
			type: 'number',
			value: 5,
			show_when_model_name: ['article'],
		},
		{
			/**
			 * Tamaño del logo en mm para el header de este comprobante (remito, factura, presupuesto
			 * o pedido online). Vacío = usar el tamaño global configurado en el dueño (fallback en el
			 * backend). Se cambia en el encabezado del diseñador de PDF, tirando de la manija del
			 * logo (no se muestra acá).
			 */
			text: 'Tamaño del logo en mm (vacío = usar el global del dueño)',
			key: 'logo_size_mm',
			type: 'number',
			show_when_model_name: [],
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
			text: 'Imagen de cabecera (banner ancho)',
			key: 'header_image_url',
			type: 'image',
			show_when_model_name: 'article',
			crop_aspect_ratio: 4/1,
		},
		{
			/**
			 * Texto libre del pie. Solo se muestra para artículo: en venta, presupuesto y pedido
			 * online el texto del pie es el campo "Texto libre" del diseñador de PDF (que se pone las
			 * veces que se quiera). El de un perfil de siempre se sigue imprimiendo igual, y el
			 * diseñador lo muestra como un texto libre en el pie.
			 */
			text: 'Pie de página',
			key: 'footer_text',
			type: 'textarea',
			value: '',
			show_when_model_name: ['article'],
		},
		{
			/**
			 * Layout del encabezado del PDF (fiscal y comercial), en formato JSON (prompt 437,
			 * default en PdfColumnProfile::default_header_layout, render en el prompt 439).
			 * No tiene input visible en este form: lo edita el diseñador de encabezados del
			 * prompt 441. Se declara igual como propiedad del modelo para que getModelToSend()
			 * (common-vue/components/model/Index.vue, que arma el payload por spread de `model`)
			 * lo incluya al crear/actualizar el perfil y no se pierda en el round-trip.
			 */
			text: 'Layout de encabezado',
			key: 'header_layout',
			type: 'text',
			value: null,
			not_show: true,
			not_show_on_form: true,
		},
		{
			/**
			 * Diseño del encabezado del PDF del catálogo de artículos (misión
			 * catalogo-pdf-encabezado, 18/9/2026): logo, nombre y datos del negocio en renglones
			 * de título + valor, con la elección de qué sale en todas las hojas y qué solo en
			 * la primera. Columna JSON propia, separada de `header_layout` (que es el esquema
			 * emisor/receptor de los comprobantes de venta). No tiene input visible en este form:
			 * lo edita el diseñador de `common-vue/components/pdf/catalog-header-designer/`. Se
			 * declara igual como propiedad del modelo para que getModelToSend() lo incluya al
			 * crear/actualizar el perfil y no se pierda en el round-trip.
			 */
			text: 'Diseño del encabezado del catálogo',
			key: 'catalog_header_layout',
			type: 'text',
			value: null,
			not_show: true,
			not_show_on_form: true,
		},
		{
			/**
			 * Diseño de la hoja armado con cajas (misión diseno-pdf-configurable, 1/10/2026): las cajas
			 * de arriba de la tabla y del pie, en el JSON de DisenoDePaginaPdf (empresa-api). Null =
			 * el PDF de siempre. No tiene input en este form: lo arma el diseñador de PDF
			 * (common-vue/components/pdf/disenador-pdf/). Se declara para que getModelToSend() lo
			 * incluya al crear/actualizar el perfil y no se pierda en el round-trip.
			 */
			text: 'Diseño de la hoja',
			key: 'page_layout',
			type: 'text',
			value: null,
			not_show: true,
			not_show_on_form: true,
		},
		{
			/**
			 * Alto de la hoja en mm (null = 297, A4). Lo elige el diseñador de PDF junto con el ancho
			 * (A4, Carta, Oficio o A5) y solo lo usa el PDF con cajas. Oculta, como page_layout.
			 */
			text: 'Alto de la hoja (mm)',
			key: 'paper_height_mm',
			type: 'number',
			value: null,
			not_show: true,
			not_show_on_form: true,
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Define perfiles de diseño para los PDFs del sistema: comprobantes de venta (remito y factura de ARCA), presupuestos, pedidos online y listados de artículos.',
		implicancias: 'Cada perfil controla qué columnas tiene la tabla, en qué orden y con qué ancho. En los comprobantes de venta, los presupuestos y los pedidos online, el botón Diseñar PDF arma la hoja entera: el encabezado con el logo y los datos del negocio, cajas arriba de la tabla con los datos que quieras (del cliente, de la venta, de la cuenta corriente: saldo anterior, compra actual y saldo), y el pie con totales, subtotal, descuentos, comisiones o un texto propio; además la hoja (A4, Carta, Oficio o A5) y el margen. Los diseños que nunca se abrieron en el diseñador siguen imprimiendo como siempre. En una factura de ARCA, los datos del cliente que pide ARCA y el cuadro de importes con el QR y el CAE se pueden mover pero no sacar. El perfil elegido al imprimir determina cómo sale el documento. Cada dueño ya tiene armados los diseños "Presupuesto", "Presupuesto sin precios", "Presupuesto con imágenes" y "Pedido online": podés modificarlos o duplicarlos.',
		como_se_utiliza: 'Creá el perfil eligiendo el modelo (venta, presupuesto, pedido online o artículo), elegí las columnas en Columnas del PDF y tocá Diseñar PDF: arrastrá cajas a la zona de arriba de la tabla o al pie, y adentro los campos de la bandeja (organizados por cliente, venta, cuenta corriente, totales y otros); tirá del borde de una caja para cambiarle el ancho, y tocá una caja o un campo para ponerle título, estilo, tamaño de letra, negrita, cursiva o alineación. Con Ver un PDF de prueba ves cómo sale con tu último comprobante, y Volver al diseño de siempre deshace el diseño con cajas. Seleccioná el perfil al imprimir: en un presupuesto o en un pedido online, el botón Imprimir lista los diseños disponibles y el marcado como por defecto va primero. Podés duplicar un perfil existente con el botón de duplicar para hacer variantes rápido. En las plantillas de artículo, el botón Diseñar encabezado permite ubicar el logo, el nombre y los datos del negocio y elegir si salen en todas las hojas o solo en la primera.',
		palabras_clave: ['comprobante', 'columnas', 'diseño', 'impresion', 'remito', 'factura', 'presupuesto', 'pedido online', 'pedido', 'pdf', 'sin precios', 'con imagenes', 'diseñar pdf', 'cajas', 'arrastrar', 'pie de pagina', 'encabezado', 'hoja', 'margen', 'a4', 'a5', 'carta', 'oficio', 'cuenta corriente', 'saldo anterior'],
	},
	/**
	 * Sin esto, model/Index.vue le pasa al formulario una COPIA no reactiva del modelo
	 * (`{...model}`, sin observer), y en un diseño NUEVO elegir el Modelo no re-renderizaba nada:
	 * el editor de columnas seguía diciendo "Seleccioná el tipo de modelo", los campos con
	 * show_when_model_name no aparecían y el botón "Diseñar encabezado" tampoco. Medido el
	 * 18/9/2026 (misión catalogo-pdf-encabezado): `model.__ob__` ausente en el form. Con
	 * full_reactivity el form edita el modelo del store, como ya hacen article, expense, etc.
	 */
	full_reactivity: true,
	singular_model_name_spanish: 'Diseño de PDF',
	plural_model_name_spanish: 'Diseño de PDF',
	create_model_name_spanish: 'Nuevo Diseño de PDF',
	text_delete: 'el',
}
