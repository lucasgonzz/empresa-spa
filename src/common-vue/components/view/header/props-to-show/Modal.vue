<template>

	<b-modal

	v-if="usa_props_to_show"

	size="lg"

	modal-class="props-to-show-modal"

	body-class="props-to-show-body"

	footer-class="props-to-show-footer"

	title="Propiedades para mostrar"

	:id="'props-to-show-'+model_name">



		<columns-preferences-config-modal

		:config_rows="config_rows"></columns-preferences-config-modal>



		<template #modal-footer>

			<b-button

			block

			@click="save"

			class="m-t-15"

			variant="primary">

				Listo

			</b-button>

		</template>

	</b-modal>

</template>

<script>

import ColumnsPreferencesConfigModal from './ColumnsPreferencesConfigModal.vue'

import { fallback_column_width_px } from '@/common-vue/config/column_preference_defaults'

import {

	apply_column_preference_rows_to_module_store,

	bootstrap_module_column_preferences_if_needed,

	clear_module_filters_after_column_change,

	module_already_has_column_preferences,

	normalize_column_preference_rows,

	resolve_column_preference_rows,

	table_column_preference_columns_from_store,

} from '@/common-vue/helpers/column_preferences_helper'



export default {

	components: {

		ColumnsPreferencesConfigModal,

	},

	props: {

		model_name: String,

	},

	data() {

		return {

			config_rows: [],

			loading_preferences: false,

		}

	},

	computed: {

		usa_props_to_show() {

			if (this.$store._mutations[this.model_name+'/set_props_to_show']) {

				return true

			}

			console.warn(`La mutación set_props_to_show no está definida en el store.`);

			return false

		},

	},

	watch: {

		model_name() {

			if (this.usa_props_to_show) {

				this.init_preferences()

			}

		},

	},

	created() {

		if (this.usa_props_to_show) {

			this.init_preferences()

		}

	},

	methods: {

		/**

		 * Sincroniza filas del modal sin volver a commitear props_to_show.

		 *

		 * @return {void}

		 */

		sync_config_rows_only() {

			let rows = resolve_column_preference_rows(this.$store, this.model_name, 'table')



			this.config_rows = rows.map(item => ({

				...item,

				width: item.width || fallback_column_width_px(item.key),

				label: item.label || item.key,

			}))

		},

		/**

		 * Inicializa preferencias del módulo una sola vez por sesión.

		 * Usa cache global de table_column_preference; API solo como fallback.

		 *

		 * @return {Promise<void>}

		 */

		init_preferences() {

			/* Ya aplicadas al entrar al módulo o en bootstrap de recursos: no re-disparar props. */

			if (module_already_has_column_preferences(this.$store, this.model_name)) {

				this.sync_config_rows_only()

				return Promise.resolve()

			}



			/* Intentar aplicar desde cache global descargado al inicio. */

			if (bootstrap_module_column_preferences_if_needed(this.$store, this.model_name, 'table')) {

				this.sync_config_rows_only()

				return Promise.resolve()

			}



			return this.init_preferences_from_api_fallback()

		},

		/**

		 * Fallback cuando el módulo entró antes de terminar la descarga de recursos.

		 *

		 * @return {Promise<void>}

		 */

		init_preferences_from_api_fallback() {

			let self = this



			try {

				localStorage.removeItem('table_column_preference-' + this.model_name)

			} catch (e) {

				// ignore

			}



			let default_rows = resolve_column_preference_rows(this.$store, this.model_name, 'table')

			let cached_rows = table_column_preference_columns_from_store(this.$store, this.model_name, 'table')



			if (cached_rows && cached_rows.length) {

				let rows = normalize_column_preference_rows(cached_rows, default_rows)

				apply_column_preference_rows_to_module_store(self.$store, self.model_name, rows)

				self.sync_config_rows_only()

				return Promise.resolve()

			}



			return self.get_preference_from_api()

			.then(function (api_rows) {

				let rows = default_rows

				if (api_rows && api_rows.length) {

					rows = normalize_column_preference_rows(api_rows, default_rows)

				}



				apply_column_preference_rows_to_module_store(self.$store, self.model_name, rows)

				self.sync_config_rows_only()

			})

		},

		/**

		 * Guarda preferencias del usuario y limpia filtros porque cambiaron las columnas.

		 *

		 * @return {Promise<void>}

		 */

		save() {

			let self = this

			const rows_to_save = this.config_rows

			.filter(row => typeof row.key != 'undefined' && row.key !== null && row.key !== '')

			.map((row, index) => ({

				key: row.key,

				visible: !!row.visible,

				order: index,

				width: row.width ? Number(row.width) : null,

				wrap_content: !!row.wrap_content,

			}))



			clear_module_filters_after_column_change(this.$store, this.model_name)

			apply_column_preference_rows_to_module_store(this.$store, this.model_name, rows_to_save)



			return this.save_preference_in_api(rows_to_save)

			.then(function () {

				self.$bvModal.hide('props-to-show-' + self.model_name)

			})

		},

		/**

		 * Consulta preferencia puntual al backend (solo fallback).

		 *

		 * @return {Promise<Array|null>}

		 */

		get_preference_from_api() {

			let self = this



			self.loading_preferences = true



			return self.$api.get('table-column-preference/' + self.model_name + '/table')

			.then(function (res) {

				if (res.data && res.data.model && Array.isArray(res.data.model.columns)) {

					return res.data.model.columns

				}

				return null

			})

			.catch(function () {

				return null

			})

			.then(function (rows) {

				self.loading_preferences = false

				return rows

			})

		},

		/**

		 * Persiste preferencia en API y refresca cache global.

		 *

		 * @param {Array} rows

		 * @return {Promise<void>}

		 */

		save_preference_in_api(rows) {

			let self = this



			self.$store.commit('auth/setMessage', 'Guardando')

			self.$store.commit('auth/setLoading', true)



			return self.$api.put('table-column-preference/' + self.model_name + '/table', {

				columns: rows,

			})

			.then(function () {

				return self.$store.dispatch('table_column_preference/getModels')

			})

			.then(function () {

				self.$store.commit('auth/setLoading', false)

				self.$store.commit('auth/setMessage', '')

			})

			.catch(function () {

				self.$store.commit('auth/setLoading', false)

				self.$store.commit('auth/setMessage', '')

				self.$toast.error('No se pudo guardar la configuracion en el servidor')

			})

		},

	}

}

</script>

<style lang="sass">

.props-to-show-modal .modal-content

	max-height: 85vh



.props-to-show-modal .props-to-show-body

	max-height: calc(85vh - 130px)

	overflow-y: auto



.props-to-show-modal .props-to-show-footer

	position: sticky

	bottom: 0

	background: inherit

	z-index: 2

	border-top: 1px solid rgba(0,0,0,.1)

</style>

