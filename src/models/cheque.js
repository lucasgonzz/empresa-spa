/*
	Misión cheque-edicion-acotada (8/10/2026): el formulario del cheque deja editar SOLO número,
	banco (el select del catálogo), notas, fecha de emisión y fecha de pago. El resto (tipo,
	cliente, proveedor, monto, endosos, cobro y rechazo) mueve cuentas corrientes y cajas, así
	que no se edita acá. Dos flags, y solo ellos, arman eso (no cambian columnas ni orden):
	  - `only_show`: se dibuja en el formulario como valor gris, de contexto, sin input.
	  - `not_show_on_form`: no se dibuja en el formulario. La tabla lo ignora (solo mira
	    `not_show_on_table`), así que la columna sigue donde estaba.
	El back (PUT api/cheque/{id}) ignora lo demás aunque lo manden: esto es solo la interfaz.
*/
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
			only_show: true,
			options: [
				'recibido',
				'emitido',
			],
		},
		{
			text: 'Cliente',
			key: 'client_id',
			type: 'search',
			// Contexto de solo lectura: solo tiene sentido en el cheque recibido. Va por
			// v_if_function y no por v_if: showProperty() compara `typeof v_if == 'array'`, que nunca
			// es cierto, así que un v_if en forma de array no oculta nada (ver models/order.js).
			only_show: true,
			v_if_function: 'cheque_es_recibido',
			// Sin prop "store" el buscador resuelve el store por la key (client_id -> client), asi
			// que este campo tiene el mismo problema que los de abajo: la busqueda va siempre
			// contra la API (global-search/client) y nunca contra el store. No sacar.
			search_from_api: true,
		},
		{
			text: 'Endozado desde cliente',
			key: 'endosado_desde_client_id',
			not_show_on_form: true,
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
			// Contexto de solo lectura: solo tiene sentido en el cheque emitido (por v_if_function,
			// ver el aviso en `client_id`).
			only_show: true,
			v_if_function: 'cheque_es_emitido',
			// Sin prop "store" el buscador resuelve el store por la key (provider_id -> provider),
			// asi que este campo tiene el mismo problema que los de abajo: la busqueda va siempre
			// contra la API (global-search/provider) y nunca contra el store. No sacar.
			search_from_api: true,
		},
		{
			text: 'Endozado al proveedor',
			key: 'endosado_a_provider_id',
			not_show_on_form: true,
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
			only_show: true,
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
			not_show_on_form: true,
		},
		{
			text: 'Cobrado en',
			key: 'cobrado_en',
			type: 'date',
			v_if: ['estado_manual', '=', 'cobrado'],
			is_date: true,
			not_show_on_form: true,
		},
		{
			text: 'Cobrado por',
			key: 'cobrado_por_id',
			v_if: ['estado_manual', '=', 'cobrado'],
			not_show_on_form: true,
		},
		{
			// La columna de la base es `rechazado_en`. Hasta la misión cheque-motivo-rechazo
			// (9/10/2026) la key era `rechazo_en`, que no existe, y la columna salía siempre vacía.
			text: 'Rechazado en',
			key: 'rechazado_en',
			v_if: ['estado_manual', '=', 'rechazado'],
			type: 'date',
			is_date: true,
			not_show_on_form: true,
		},
		{
			text: 'Rechazado por',
			key: 'rechazado_por_id',
			v_if: ['estado_manual', '=', 'rechazado'],
			not_show_on_form: true,
		},
		{
			/*
				Misión cheque-motivo-rechazo (9/10/2026): el motivo que se escribe en el modal
				Rechazar cheque (RechazarCheque.vue) y que la API guarda en
				`cheques.rechazado_observaciones` (texto, hasta 1000 caracteres).

				Solo en las solapas Rechazados (de Recibido y de Emitido): en el resto siempre está
				vacía, y la saca base_properties_for_cheques_list en components/cheques/list/Index.vue.
				No va al formulario: el motivo se escribe al rechazar, no al editar el cheque (el
				PUT de edición tampoco lo lee).

				`table_wrap_content`: un motivo largo se parte en varias líneas en vez de cortarse
				(los td de la tabla son nowrap por defecto). Es el valor inicial del "salto de línea"
				de la columna en las preferencias: el usuario lo puede cambiar.
			*/
			text: 'Motivo del rechazo',
			key: 'rechazado_observaciones',
			type: 'textarea',
			table_wrap_content: true,
			not_show_on_form: true,
		},
	],
	singular_model_name_spanish: 'Cheque',
	plural_model_name_spanish: 'Cheques',
	create_model_name_spanish: 'Nuevo Cheque',
	text_delete: 'el',
}