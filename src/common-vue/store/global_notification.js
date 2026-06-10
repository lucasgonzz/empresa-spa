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
		},
	},
	actions: {
	},
}
