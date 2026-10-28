export default {
	properties: [
		{
			text: 'Articulo',
			key: 'article_id',
			type: 'text',
			only_show: true,
		},
		/*
			Estado, detalle y horas legibles (misión mercado-libre-pruebas, 27/10/2026): la tabla
			mostraba el valor crudo de la base (`en_progreso`, `exitosa`), cortaba el motivo de un
			error a la mitad (que es justo lo que hay que leer) y las horas no se veían.
			Las funciones viven en src/mixins/model_functions.js.
		*/
		{
			text: 'Estado',
			key: 'status',
			type: 'text',
			only_show: true,
			function: 'sync_meli_estado_texto',
		},
		{
			text: 'Detalle',
			key: 'error_message',
			type: 'textarea',
			only_show: true,
			table_wrap_content: true,
		},
		{
			text: 'Intentado',
			key: 'attempted_at',
			type: 'date',
			only_show: true,
			is_date: true,
			function: 'fecha_y_hora_texto',
		},
		{
			text: 'Sincronizado',
			key: 'synced_at',
			type: 'date',
			only_show: true,
			is_date: true,
			function: 'fecha_y_hora_texto',
		},
	],
	singular_model_name_spanish: 'Sincronizacion',
	plural_model_name_spanish: 'Sincronizaciones',
	create_model_name_spanish: 'Nueva Sincronizacion',
	text_delete: 'la',
	color_display_function: true,
}