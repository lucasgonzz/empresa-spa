import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL
export default {
	namespaced: true,
	state: {
		functions_to_execute: [],
		info_to_show: [],
		message_text: '',
		color_variant: '',
		/* global_notification | article_import_result */
		notification_modal: 'global_notification',
		import_stats: null,
		/* Configuración de la importación (rango, operación, opciones del paso 3). */
		import_options: null,
		/* Resultado del recálculo de precios (modal price_update_result). */
		price_stats: null,
		/*
		 * Corrida de análisis de Excel terminada (modal excel_analysis_ready):
		 * { uuid, tipo, estado, error, model, original_filename }. A propósito no
		 * trae el resumen del análisis — el aviso solo dice que terminó.
		 */
		excel_analysis: null,
		/*
		 * Escaneo de factura de compra terminado (modal provider_order_scan_ready):
		 * { uuid, provider_order_id, estado, error, cantidad_articulos, provider_nombre }.
		 * A propósito no trae el resultado del escaneo — el aviso solo dice que terminó;
		 * la tabla se pide recién si el usuario aprieta el botón de revisar.
		 */
		provider_order_scan: null,
	},
	mutations: {
		set_functions_to_execute(state, value) {
			state.functions_to_execute = value
		},
		set_info_to_show(state, value) {
			state.info_to_show = value
		},
		set_message_text(state, value) {
			state.message_text = value
		},
		set_color_variant(state, value) {
			state.color_variant = value
		},
		set_notification_modal(state, value) {
			state.notification_modal = value || 'global_notification'
		},
		set_import_stats(state, value) {
			state.import_stats = value
		},
		set_import_options(state, value) {
			state.import_options = value
		},
		set_price_stats(state, value) {
			state.price_stats = value
		},
		set_excel_analysis(state, value) {
			state.excel_analysis = value
		},
		set_provider_order_scan(state, value) {
			state.provider_order_scan = value
		},
		/*
		 * Carga el payload completo de una GlobalNotification broadcast.
		 */
		set_from_broadcast(state, notification) {
			state.functions_to_execute = notification.functions_to_execute || []
			state.info_to_show = notification.info_to_show || []
			state.message_text = notification.message_text || ''
			state.color_variant = notification.color_variant || 'info'
			state.notification_modal = notification.notification_modal || 'global_notification'
			state.import_stats = notification.import_stats || null
			state.import_options = notification.import_options || null
			state.price_stats = notification.price_stats || null
			state.excel_analysis = notification.excel_analysis || null
			state.provider_order_scan = notification.provider_order_scan || null
		},
	},
	actions: {
	},
}
