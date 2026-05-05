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
	],
	singular_model_name_spanish: 'PDF de ofertas (plantilla)',
	plural_model_name_spanish: 'PDFs de ofertas (plantillas)',
	create_model_name_spanish: 'Nueva plantilla de PDF de ofertas',
	text_delete: 'la',
}
