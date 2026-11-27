export default {
	properties: [
		{
			text: 'Nombre del diseño',
			key: 'nombre',
			type: 'text',
		},
		{
			text: 'Título (encabezado del PDF)',
			key: 'titulo',
			type: 'text',
		},
		{
			text: 'Mostrar precio anterior',
			key: 'mostrar_precio_anterior',
			type: 'checkbox',
		},
		{
			text: 'Texto personalizado',
			key: 'texto_personalizado',
			type: 'text',
		},
		{
			text: 'Mostrar fecha de impresión',
			key: 'motrar_fecha_impresion',
			type: 'checkbox',
		},
		{
			// Activa el formato de cartel con recuadro de precio pagando en efectivo/transferencia.
			// El porcentaje sale solo de los descuentos de los métodos de pago (el mismo que se usa al cobrar).
			text: 'Cartel con precio en efectivo o transferencia',
			key: 'mostrar_precio_efectivo',
			type: 'checkbox',
			description: 'Muestra el precio con el descuento de efectivo/transferencia configurado en los métodos de pago, en un recuadro amarillo. Oculta el precio sin impuestos y el precio anterior.',
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Define plantillas para generar el PDF de ofertas de artículos con imágenes, ideal para difundir promociones.',
		implicancias: 'Cada plantilla define título, texto personalizado y opciones como mostrar el precio anterior o la fecha de impresión. También podés activar el cartel con el precio pagando en efectivo o transferencia: usa el descuento ya configurado en tus métodos de pago y oculta el precio sin impuestos y el precio anterior. Al generar el PDF de ofertas, el diseño sale de la plantilla elegida.',
		como_se_utiliza: 'Creá la plantilla con su configuración y usala al exportar el PDF de ofertas desde el listado de artículos.',
		palabras_clave: ['ofertas', 'catalogo', 'promociones', 'pdf', 'plantilla'],
	},
	singular_model_name_spanish: 'PDF de ofertas (plantilla)',
	plural_model_name_spanish: 'PDFs de ofertas (plantillas)',
	create_model_name_spanish: 'Nueva plantilla de PDF de ofertas',
	text_delete: 'la',
}
