/*
	Metadata del modelo PurchaseSuggestion, molde de models/stock_suggestion.js
	(arreglo A14, pasada post-chequeo). Hoy ningun componente propio de
	sugerencias-de-compra/ la usa (Listado.vue, Detalle.vue y FormNueva.vue
	son todos custom): esto existe para que store/purchase_suggestion.js
	(__base_store con model_name: 'purchase_suggestion') no reviente si algo
	llega a llamar la mutation setModel(), que hace
	require('@/models/${state.model_name}') sin guard.

	Los cuatro parametros del motor (PLAN §5.1), con los mismos defaults que
	FormNueva.vue precarga en cargar_defaults(). A diferencia de
	stock_suggestion.js, ACA NO se agrega `color_display_function`: ese flag
	hace que las tablas genericas (Tr.vue / TableComponent.vue) llamen
	this['purchase_suggestionGetColor'](model), y ese metodo no existe en
	mixins/model_functions.js. Agregarlo sin esa funcion es exactamente la
	clase de bomba latente que este arreglo vino a sacar, no a plantar de nuevo.
*/
export default {
	properties: [
		{
			text: 'Dias de punto de pedido',
			key: 'dias_punto_pedido',
			type: 'number',
			value: 15,
			description: 'Con cuantos dias de cobertura restante ya conviene generar el pedido.',
		},
		{
			text: 'Dias de cobertura objetivo',
			key: 'dias_cobertura_objetivo',
			type: 'number',
			value: 30,
			description: 'A cuantos dias de venta futura se quiere llegar con la cantidad sugerida.',
		},
		{
			text: 'Dias de lead time',
			key: 'dias_lead_time',
			type: 'number',
			value: 7,
			description: 'Cuanto tarda en llegar el pedido una vez hecho; se suma a la cobertura objetivo.',
		},
		{
			text: 'Vigencia de la oferta (dias)',
			key: 'dias_vigencia_oferta',
			type: 'number',
			value: 120,
			description: 'Hasta cuantos dias atras se toma como vigente el precio ofertado por un proveedor.',
		},
	],
	singular_model_name_spanish: 'Sugerencia de Compra',
	plural_model_name_spanish: 'Sugerencias de Compra',
	create_model_name_spanish: 'Nueva Sugerencia de Compra',
	text_delete: 'la',
}
