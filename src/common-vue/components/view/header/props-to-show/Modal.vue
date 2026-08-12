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

			<!--

				Sin `block` y sin `m-t-15`: el boton dejo de ser una franja azul de ancho completo.

				El footer del chasis global (common-vue/sass/_modals.sass) ya lo empuja a la derecha

				y le da la altura, asi que aca solo queda el boton. Su chasis sale del <style> de

				abajo, con los mismos valores que la tarea 2 definio para el footer del modal de

				formulario: no se inventa un tercer boton de footer.

			-->

			<b-button

			@click="save"

			class="props-to-show-footer__listo"

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

import { article_dynamic_dependencies_ready } from '@/common-vue/helpers/dynamic_column_dependencies_status'



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



			// Si 'article' todavia no tiene las colecciones dinamicas listas (direcciones/sucursales,
			// listas de precio, descuentos por metodo de pago), NO ejecutar el fallback de API: ese
			// fallback SI fija props_to_show con lo que haya en ese momento, y lo dejaria trabado sin
			// las columnas dinamicas por el resto de la sesion (bootstrap_module_column_preferences_if_needed
			// ya devolvio false por esta misma razon, no porque no exista preferencia). Dejamos
			// props_to_show vacio -- el fallback reactivo del Listado ya muestra la tabla bien mientras
			// tanto -- y sync_config_rows_only() igual arma la lista de checkboxes del modal con lo que
			// ya haya cargado hasta ahora (puede faltar alguna columna dinamica si el modal se abre en
			// ese instante exacto; caso raro, no cubierto por este prompt).
			if (this.model_name == 'article' && !article_dynamic_dependencies_ready()) {

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

		 * Guarda preferencias del usuario, limpia filtros porque cambiaron las columnas y vuelve

		 * a pedir lo que se estaba viendo.

		 *

		 * 🔴 Los tres pasos son uno solo y no se pueden separar. Limpiar sin volver a pedir deja la

		 * tabla EN BLANCO, y no es evidente leyendo ninguno de los dos archivos por separado:

		 *

		 *   1. `clear_module_filters_after_column_change` apaga `is_filtered` y vacia `filtered`.

		 *   2. `display/Index.vue`, en `models_to_show()`, elige que renderiza segun ese mismo flag:

		 *      con `is_filtered` prendido devuelve `filtered`, y apagado devuelve `models`.

		 *   3. Desde el refactor el listado entra al modulo con `is_filtered` en true y los modelos

		 *      viven en `filtered` (misma causa que documento la tarea 22). `runGlobalSearch` y

		 *      `runListadoPorDefecto` NO escriben `models`, asi que al apagar el flag la tabla pasa

		 *      a mirar un array que ese camino nunca llena.

		 *

		 * Ojo con el sintoma, porque no siempre es el mismo: `models` puede tener algo por otros

		 * caminos --los articulos por defecto de Vender que siembra start_methods.js, los que se

		 * dieron de alta o editaron en la sesion (`add` hace unshift), los que llegan por

		 * websocket--. En esas sesiones la tabla no quedaba en blanco: quedaba mostrando un puñado

		 * de filas sueltas con pinta de listado completo, que es peor. El arreglo cubre las dos.

		 *

		 * Y encima no se veia el estado vacio, por el mismo flag: `Listado.vue` calcula

		 * `show_empty_text` como `state.article.is_filtered`, asi que al apagarlo desaparecia

		 * tambien el cartel de "no hay resultados" y quedaba una zona en blanco sin explicacion.

		 *

		 * El patron correcto ya existia en el repo: `view/header/BtnRestartFilter.vue` hace estas

		 * mismas seis mutaciones y despues dispatchea una carga. Aca faltaba esa segunda mitad.

		 *

		 * Se re-ejecuta con `runGlobalSearch` y no con `runListadoPorDefecto` a proposito: el

		 * primero reusa `global_search_payload`, o sea que conserva lo que el usuario haya buscado

		 * en el buscador general, y el segundo lo descartaria y lo devolveria al listado completo.

		 * Los filtros de columna SI se pierden, que es lo que la limpieza busca: `runGlobalSearch`

		 * los adjunta desde `state.filters`, que quedo vacio.

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



			// Hay que mirar el estado ANTES de limpiarlo: si el modulo no estaba filtrado, la

			// limpieza no le saco nada de la pantalla y no hay nada que recargar.

			let modulo = this.$store.state[this.model_name]

			let estaba_filtrado = !!(modulo && modulo.is_filtered)

			let payload_de_busqueda = modulo ? modulo.global_search_payload : null



			clear_module_filters_after_column_change(this.$store, this.model_name)

			apply_column_preference_rows_to_module_store(this.$store, this.model_name, rows_to_save)

			this.recargar_listado_despues_de_limpiar(estaba_filtrado, payload_de_busqueda)



			return this.save_preference_in_api(rows_to_save)

			.then(function () {

				self.$bvModal.hide('props-to-show-' + self.model_name)

			})

		},

		/**

		 * Vuelve a pedir lo que el listado estaba mostrando, despues de que la limpieza de filtros

		 * dejara el modulo sin nada que renderizar. El porque largo esta arriba, en save().

		 *

		 * Las tres guardas, y por que cada una:

		 *

		 * 1. `estaba_filtrado`. Si el modulo no estaba filtrado, la limpieza no le saco nada de la

		 *    pantalla: recargar seria trafico gratis. Se mide ANTES de limpiar, obvio.

		 * 2. **La accion tiene que existir.** No alcanza con que el modulo tenga `is_filtered`: hay

		 *    una decena de stores escritos a mano que NO salen de `__base_store` (recipe, pending,

		 *    road_map, panel_control, deposit_movement, seller_commission, papelera/*, y algunos

		 *    mas) y que igual tienen `is_filtered` y `set_props_to_show`, o sea que abren este

		 *    mismo modal. Ahi `runListadoPorDefecto` no existe y el dispatch seria un

		 *    "unknown action type". Es el mismo idiom que ya usa `usa_props_to_show` mas arriba

		 *    en este archivo, pero contra `_actions` en vez de `_mutations`.

		 * 3. Con que se recarga. Ver abajo: no es indistinto.

		 *

		 * @param {boolean} estaba_filtrado Si el modulo tenia is_filtered antes de la limpieza.

		 * @param {Object|null} payload_de_busqueda global_search_payload de antes de la limpieza.

		 * @return {void}

		 */

		recargar_listado_despues_de_limpiar(estaba_filtrado, payload_de_busqueda) {

			if (!estaba_filtrado) {

				return

			}

			let prefijo = this.model_name + '/'



			// Con que se recarga NO es indistinto, y es la parte facil de hacer mal:

			//

			// - Si el usuario tenia una busqueda escrita en el buscador general, hay que repetirla:

			//   `runGlobalSearch` sin `props` reusa `global_search_payload` y la conserva.

			// - Si no la tenia, va `runListadoPorDefecto`, y NO `runGlobalSearch` con el payload

			//   vacio que dejo la carga inicial. Los dos traen las mismas filas, pero solo el

			//   primero repone `listado_por_defecto` en true. Ese flag es el que mira

			//   `BtnRestartFilter` (junto con is_filtered) para mostrarse: dejandolo en false con

			//   los filtros ya vacios, el boton "Limpiar filtros" queda visible sin ningun filtro

			//   puesto. Es la misma clase de mentira que documenta el comentario largo de

			//   `runListadoPorDefecto` en __base_store.js.

			// Los `extra_filters` cuentan como busqueda: el buscador general deja buscar SIN texto

			// cuando hay filtros fijos puestos (por ejemplo solo por categoria). Sin esta rama, un

			// usuario que hubiera destildado todas las props y filtrara solo por categoria perdia

			// ese filtro al guardar columnas, porque runListadoPorDefecto manda extra_filters: [].

			// El payload del listado por defecto siempre los lleva vacios, asi que la distincion es

			// exacta y no hay falsos positivos.

			let hay_busqueda_escrita = !!(

				payload_de_busqueda

				&& (

					(payload_de_busqueda.query_value && String(payload_de_busqueda.query_value).trim() !== '')

					|| (payload_de_busqueda.props && payload_de_busqueda.props.length)

					|| (payload_de_busqueda.extra_filters && payload_de_busqueda.extra_filters.length)

				)

			)



			let accion = hay_busqueda_escrita ? 'runGlobalSearch' : 'runListadoPorDefecto'

			if (!this.$store._actions[prefijo + accion]) {

				return

			}



			// El overlay global lo prende y lo apaga `save_preference_in_api`, que corre EN

			// PARALELO con esto: si el PUT gana la carrera, apaga el overlay mientras la busqueda

			// sigue viajando y se ve un parpadeo de "No hay articulos" sobre la tabla vacia. El

			// loading del modulo es el que hace que la tabla muestre su skeleton, y estas dos

			// acciones no lo tocan (solo mueven el de auth), asi que se maneja aca -- igual que lo

			// hace el mixin actualizar_lista_de_articulos, por el mismo motivo.

			let self = this

			let tiene_loading = typeof this.$store.state[this.model_name].loading != 'undefined'

			if (tiene_loading) {

				this.$store.commit(prefijo + 'setLoading', true)

			}



			let recarga = hay_busqueda_escrita

				? this.$store.dispatch(prefijo + accion, { page: 1 })

				: this.$store.dispatch(prefijo + accion)



			// 🔴 Si no hay promesa a la que colgarse, hay que APAGAR el loading acá mismo. Salir sin

			// hacerlo lo dejaria prendido para siempre y la tabla se quedaria con el skeleton

			// puesto, que es peor que el bug que este metodo viene a arreglar. Hoy la rama es

			// inalcanzable --en Vuex 3 dispatch solo devuelve undefined cuando la accion no existe,

			// y eso ya lo descarto la guarda de _actions de arriba-- pero una guarda defensiva que

			// deja el estado roto no es defensiva.

			if (!recarga || typeof recarga.then != 'function') {

				if (tiene_loading) {

					this.$store.commit(prefijo + 'setLoading', false)

				}

				return

			}

			if (!tiene_loading) {

				return

			}

			recarga

			.then(function () {

				self.$store.commit(prefijo + 'setLoading', false)

			})

			.catch(function () {

				self.$store.commit(prefijo + 'setLoading', false)

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

	// El borde iba en rgba(0,0,0,.1): sobre el modal oscuro es negro sobre negro y la franja no

	// se separaba del cuerpo. El token tiene contraparte en html.dark-mode.

	//

	// Esta regla empata en especificidad con la del chasis global (common-vue/sass/_modals.sass)

	// y vive en el chunk de este componente, asi que le gana por orden de carga. Por eso el color

	// hay que repetirlo aca: si esta linea se borrara, el borde lo pondria el chasis igual, pero

	// mientras exista, manda esta.

	border-top: 1px solid var(--color-border)



	// Boton "Listo": mismo chasis que definio la tarea 2 para el footer del modal de formulario

	// (.model-modal-footer .btn). Los valores se repiten en vez de reusar aquella clase porque

	// alla estan anidados bajo su propio contenedor a proposito, para no filtrarse a los 147 usos

	// de btn-loader del sistema.

	.props-to-show-footer__listo

		height: 38px

		padding: 0 18px

		border-radius: 10px

		font-size: 0.875rem

		font-weight: 600

		line-height: 1

		display: inline-flex

		align-items: center

		justify-content: center

		border: 1px solid transparent

		background: var(--color-primary)

		border-color: var(--color-primary)

		color: #fff

		transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease



		&:hover

			// brightness y no un token de azul oscuro: --color-primary vale distinto en claro y

			// en oscuro, y un hex de hover fijo se pelearia con uno de los dos.

			filter: brightness(0.94)

			background: var(--color-primary)

			border-color: var(--color-primary)



		&:focus-visible

			outline: none

			box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25)

</style>

