export default {
	properties: [
		{
			text: 'Número',
			key: 'numero',
			type: 'text',
			is_title: true,
		},
		{
			text: 'Tipo',
			key: 'tipo',
			type: 'select',
			options: [
				'recibido',
				'emitido',
			],
		},
		{
			text: 'Cliente',
			key: 'client_id',
			type: 'search',
			// Sin prop "store" el buscador resuelve el store por la key (client_id -> client), asi
			// que este campo tiene el mismo problema que los de abajo: la busqueda va siempre
			// contra la API (global-search/client) y nunca contra el store. No sacar.
			search_from_api: true,
		},
		{
			text: 'Endozado desde cliente',
			key: 'endosado_desde_client_id',
			// store: 'client' es el modelo contra el que busca el modal (search-from-modal/client),
			// no el nombre de la relacion embebida: esa se llama endosado_desde_client y se deriva
			// de la clave (grupo 332, 4/8/2026, ver propertyText()).
			store: 'client',
			type: 'search',
			// La busqueda va siempre contra la API (global-search/client), nunca contra el store:
			// hay cuentas con miles de clientes y el resultado no puede depender de que la descarga
			// del store haya terminado. No sacar.
			search_from_api: true,
		},
		{
			text: 'Proveedor',
			key: 'provider_id',
			type: 'search',
			// Sin prop "store" el buscador resuelve el store por la key (provider_id -> provider),
			// asi que este campo tiene el mismo problema que los de abajo: la busqueda va siempre
			// contra la API (global-search/provider) y nunca contra el store. No sacar.
			search_from_api: true,
		},
		{
			text: 'Endozado al proveedor',
			key: 'endosado_a_provider_id',
			// store: 'provider' es el modelo contra el que busca el modal (search-from-modal/provider),
			// no el nombre de la relacion embebida: esa se llama endosado_a_provider y se deriva de
			// la clave (grupo 332, 4/8/2026, ver propertyText()).
			store: 'provider',
			type: 'search',
			// La busqueda va siempre contra la API (global-search/provider), nunca contra el store:
			// hay cuentas con miles de proveedores y el resultado no puede depender de que la
			// descarga del store haya terminado. No sacar.
			search_from_api: true,
		},
		{
			/*
				Misión cheques-endoso-y-bancos (21/9/2026): el banco del cheque pasa de texto libre
				a un catálogo (cheque_banco). Esta sigue siendo LA columna "Banco" de la tabla
				--misma key, así las preferencias de columnas ya guardadas no se pierden-- pero
				se resuelve por función: el nombre del banco elegido si el cheque tiene
				cheque_banco_id, y si no el texto de siempre (los cheques anteriores a esta
				versión, hasta que el asistente los unifique). Una sola columna y no dos, para
				que el usuario no vea "Banco" repetido con el mismo dato.

				No va al formulario: ahí el control es el select de abajo. El texto `banco` de un
				cheque viejo no se pierde al editarlo porque el formulario manda el modelo entero.
			*/
			text: 'Banco',
			key: 'banco',
			type: 'text',
			function: 'cheque_banco_texto',
			not_show_on_form: true,
		},
		{
			/*
				Solo para el formulario: en la tabla la columna es `banco` (arriba). `not_show`
				la deja destildada por defecto en el selector de columnas y `not_show_on_table`
				hace que no se dibuje aunque alguien la tilde (column_preferences_helper la
				excluye al armar props_to_show). base_properties_for_cheques_list --que arma las
				columnas sin pasar por las preferencias-- también la respeta.
			*/
			text: 'Banco del cheque',
			key: 'cheque_banco_id',
			type: 'select',
			use_store_models: true,
			not_show: true,
			not_show_on_table: true,
		},
		{
			text: 'Monto',
			key: 'amount',
			type: 'number',
			is_price: true,
		},
		{
			text: 'Notas',
			key: 'notes',
			type: 'text',
		},
		{
			text: 'Fecha emisión',
			key: 'fecha_emision',
			type: 'date',
			is_date: true,
		},
		{
			text: 'Fecha pago',
			key: 'fecha_pago',
			type: 'date',
			is_date: true,
		},
		{
			/*
				Un cheque recibido endosado en un GASTO (no a un proveedor): misión
				cheques-endoso-y-bancos, decisión 1 de Lucas. Se muestra "Gasto N° 12 — Flete" a
				partir de la relación `endosado_en_expense` (con su expense_concept) que trae
				GET cheque. Visible solo en la solapa Endosados, igual que `endosado_a_provider_id`
				(ver base_properties_for_cheques_list en components/cheques/list/Index.vue).
			*/
			text: 'Endosado en el gasto',
			key: 'endosado_en_expense_id',
			type: 'text',
			function: 'cheque_endosado_en_gasto_texto',
			not_show_on_form: true,
		},
		{
			text: 'Fecha endoso',
			key: 'fecha_endoso',
			type: 'date',
			is_date: true,
		},
		{
			text: 'Cobrado en',
			key: 'cobrado_en',
			type: 'date',
			v_if: ['estado_manual', '=', 'cobrado'],
			is_date: true,
		},
		{
			text: 'Cobrado por',
			key: 'cobrado_por_id',
			v_if: ['estado_manual', '=', 'cobrado'],
		},
		{
			text: 'Rechazado en',
			key: 'rechazo_en',
			v_if: ['estado_manual', '=', 'rechazado'],
			type: 'date',
			is_date: true,
		},
		{
			text: 'Rechazado por',
			key: 'rechazado_por_id',
			v_if: ['estado_manual', '=', 'rechazado'],
		},
	],
	singular_model_name_spanish: 'Cheque',
	plural_model_name_spanish: 'Cheques',
	create_model_name_spanish: 'Nuevo Cheque',
	text_delete: 'el',
}