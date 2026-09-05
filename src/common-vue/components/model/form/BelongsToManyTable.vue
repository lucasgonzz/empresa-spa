<template>
	<div class="m-l-15">

		<!--
			Boton para abrir el modal de configuracion de columnas.

			Solo se dibuja aca cuando nadie mas lo dibuja por nosotros: en el formulario de un
			modelo, ModelForm lo pone al lado del buscador de la relacion (donde antes estaba el
			input de "buscar dentro de") y nos pasa show_columns_config_btn en false. Los consumidores
			que usan esta tabla sueltos --SaleArticlesAttachmentTable-- no tienen buscador al lado,
			asi que siguen viendolo aca arriba.
		-->
		<div
		v-if="show_own_columns_config_btn"
		class="d-flex justify-content-end m-b-5">
			<b-button
			:id="'btm-cols-btn-'+modal_id"
			v-b-modal="modal_id"
			class="btm-columnas-btn"
			title="Elegir que columnas se ven">
				<i class="bi bi-layout-three-columns"></i>
			</b-button>
		</div>

		<!-- Modal de configuración de columnas para esta relación belongs_to_many -->
		<b-modal
		v-if="show_btn_columns_config"
		:id="modal_id"
		size="lg"
		modal-class="props-to-show-modal"
		body-class="props-to-show-body"
		footer-class="props-to-show-footer"
		title="Columnas a mostrar"
		@show="on_columns_modal_show"
		@hidden="on_columns_modal_hidden">

			<columns-preferences-config-modal
			:config_rows="config_rows">
			</columns-preferences-config-modal>

			<!--
				Mismo footer que "Propiedades en resultados de busqueda": Cancelar al lado de Listo,
				los dos del mismo tamano. Antes Listo era un `block` que ocupaba todo el ancho y se
				leia como una franja azul, que es justo lo que el chasis global de modales
				(common-vue/sass/_modals.sass) ya evita empujando los botones a la derecha.
			-->
			<template #modal-footer>
				<b-button
				variant="secondary"
				@click="$bvModal.hide(modal_id)">
					Cancelar
				</b-button>
				<b-button
				variant="primary"
				@click="save">
					Listo
				</b-button>
			</template>
		</b-modal>

		<!-- Tabla de la relación: usa active_belongs_to_many si hay preferencia guardada, o prop.belongs_to_many por defecto -->
		<!--
			Ancla del tour de la demo (clip 4.1): la tabla de articulos de una compra, donde vive
			la columna "Cant Recibida". Condicional por `parent_model_name` porque este componente
			lo usa cualquier belongs_to_many del sistema. `provider_order` declara uno solo
			(`articles`), asi que el valor no se duplica.
		-->
		<table-component
		:data-tour="parent_model_name === 'provider_order' ? 'compras.tabla_articulos' : null"
		:pivot_parent_model="model"
		:loading="false"
		:models="model[prop.key]"
		:model_name="prop.store"
		:pivot="active_belongs_to_many"
		:order_list_by="prop.belongs_to_many.order_list_by"
		:order_list_from_pivot="true"
		:set_model_on_row_selected="false"
		:disable_cell_fade="true"
		show_pivot_created_at
		:show_btn_edit="false">
			<template v-slot:table_left_options="slotProps">
				<slot name="table_left_options" :model="slotProps.model"></slot>
			</template>
			<template v-slot:table_right_options="slotProps">
				<slot name="belongs" :model="slotProps.model"></slot>

				<b-button
				v-if="show_btn_remove_belongs_to_many"
				class="m-l-15"
				variant="danger"
				@click="$emit('remove-model', slotProps.model)">
					<i class="icon-trash"></i>
				</b-button>
			</template>
		</table-component>
	</div>
</template>

<script>
import TableComponent from '@/common-vue/components/display/table/Index'
import ColumnsPreferencesConfigModal from '@/common-vue/components/view/header/props-to-show/ColumnsPreferencesConfigModal.vue'
import {
	default_column_width_for_property,
	fallback_column_width_px,
} from '@/common-vue/config/column_preference_defaults'
import { belongs_to_many_columns_modal_id, belongs_to_many_preference_type } from '@/common-vue/helpers/column_preferences_helper'

export default {
	components: {
		TableComponent,
		ColumnsPreferencesConfigModal,
	},
	props: {
		/* Definición de la propiedad belongs_to_many (key, store, belongs_to_many config, etc.) */
		prop: {
			type: Object,
			required: true,
		},
		/* Modelo padre actual que contiene la relación */
		model: {
			type: Object,
			required: true,
		},
		/* Nombre del modelo padre (ej: 'provider_order', 'sale'), usado para identificar la preferencia */
		parent_model_name: {
			type: String,
			default: null,
		},
		show_btn_remove_belongs_to_many: {
			type: Boolean,
			default: true,
		},
		/*
		 * Si este componente tiene que dibujar el boton de configurar columnas.
		 * ModelForm lo pone en false porque lo dibuja el mismo, al lado del buscador de la relacion.
		 */
		show_columns_config_btn: {
			type: Boolean,
			default: true,
		},
	},
	data() {
		return {
			/* Filas de configuración de columnas para el modal (orden, visibilidad, ancho) */
			config_rows: [],
			/*
			 * Copia de config_rows tomada al abrir el modal, para poder volver atrás si se cancela.
			 * ColumnsPreferencesConfigModal edita las filas EN EL LUGAR (mueve el array con splice y
			 * escribe row.visible), así que sin esta copia "Cancelar" solo cerraba la ventana: los
			 * cambios descartados seguían vivos en config_rows y se guardaban con el próximo Listo.
			 */
			config_rows_snapshot: [],
			/* True solo entre el click en Listo y el cierre del modal, para no deshacer lo guardado. */
			columns_saved: false,
			/* Configuración de pivote activa aplicada a la tabla. Null = usar prop.belongs_to_many por defecto */
			active_belongs_to_many: this.prop.belongs_to_many,
		}
	},
	computed: {
		/*
		 * Identificador único del modal para esta relación específica.
		 * Combina modelo padre y clave de relación para evitar colisiones entre distintas relaciones.
		 * Retorno: String con el id del modal b-modal.
		 */
		modal_id() {
			return belongs_to_many_columns_modal_id(this.parent_model_name, this.prop.key)
		},
		/*
		 * Tipo de preferencia usado como identificador en la API y el store.
		 * Ejemplo: 'btm_provider_order_articles' para la relación articles de provider_order.
		 * Retorno: String con el tipo de preferencia.
		 */
		preference_type() {
			return belongs_to_many_preference_type(this.parent_model_name, this.prop.key)
		},
		/*
		 * Determina si debe mostrarse el botón de configurar columnas.
		 * Requiere modelo padre y store del modelo relacionado para funcionar.
		 * Retorno: Boolean.
		 */
		show_btn_columns_config() {
			return !!(this.parent_model_name && this.prop.store)
		},
		/*
		 * Si el boton se dibuja dentro de este componente (arriba de la tabla).
		 * El modal de configuracion se sigue montando aunque el boton lo dibuje otro.
		 * Retorno: Boolean.
		 */
		show_own_columns_config_btn() {
			return this.show_btn_columns_config && this.show_columns_config_btn
		},
		/*
		 * Todas las propiedades válidas del modelo relacionado (ej: todas las props de article).
		 * Excluye props no mostrables como group_title, no_mostrar_nunca, botones y sub-relaciones.
		 * Retorno: Array de props del modelo.
		 */
		all_related_properties() {
			if (!this.prop.store) {
				return []
			}
			try {
				/* Cargar todas las propiedades del modelo relacionado desde su archivo de modelo */
				let props = require(`@/models/${this.prop.store}`).default.properties

				/* Filtrar props que no tienen sentido mostrar en una tabla belongs_to_many */
				props = props.filter(prop => {
					return typeof prop.group_title == 'undefined'
						&& typeof prop.no_mostrar_nunca == 'undefined'
						&& typeof prop.key != 'undefined'
						&& prop.key !== null
						&& prop.key !== ''
						&& prop.type !== 'button'
						&& prop.type !== 'belongs_to_many'
						&& prop.type !== 'has_many'
				})

				/* Aplicar filtros de extensiones del sistema (si la app tiene extensiones activas) */
				props = this.check_extencions(props)

				return props
			} catch (e) {
				return []
			}
		},
	},
	created() {
		/* Inicializar preferencias al montar el componente */
		if (this.show_btn_columns_config) {
			this.init_preferences()
		}
	},
	methods: {
		/*
		 * Se abre el modal: se guarda una copia de las filas tal como están, para poder restaurarlas
		 * si el usuario cancela.
		 * Retorno: void.
		 */
		on_columns_modal_show() {
			this.config_rows_snapshot = this.config_rows.map(row => ({ ...row }))
			this.columns_saved = false
		},
		/*
		 * Se cerró el modal. Si no fue por Listo (Cancelar, la X, Escape o clic afuera), se deshacen
		 * los cambios volviendo a la copia.
		 * Retorno: void.
		 */
		on_columns_modal_hidden() {
			if (this.columns_saved) {
				return
			}
			this.config_rows = this.config_rows_snapshot.map(row => ({ ...row }))
		},
		/*
		 * Arma un identificador único de fila cuando la misma key existe en modelo y pivot.
		 * Parámetros: source (string), prop_key (string).
		 * Retorno: string tipo "model_prop:cost" o "pivot_set:price".
		 */
		build_row_id(source, prop_key) {
			return `${source}:${prop_key}`
		},
		/*
		 * Resuelve row_id en filas guardadas sin ese campo (compatibilidad con preferencias anteriores).
		 */
		resolve_row_id(row) {
			if (row.row_id) {
				return row.row_id
			}
			return this.build_row_id(row.source || 'model_prop', row.key)
		},
		/*
		 * Inicializa las preferencias de columnas para esta relación.
		 * Intenta cargar desde el store local (ya precargado al inicio de la app).
		 * Si no hay preferencias guardadas, usa las columnas por defecto del modelo.
		 * Retorno: void.
		 */
		init_preferences() {
			/* Filas por defecto construidas desde la definición del modelo */
			const default_rows = this.get_default_rows()

			/* Intentar obtener preferencias ya cargadas en el store de preferencias de columnas */
			const store_rows = this.tableColumnPreferenceColumnsFromStore(
				this.prop.store,
				this.preference_type
			)

			/* Si hay preferencias guardadas, normalizarlas con los defaults actuales */
			if (store_rows && store_rows.length) {
				const normalized = this.normalize_rows(store_rows, default_rows)
				this.config_rows = normalized.map(item => ({
					...item,
					row_id: this.resolve_row_id(item),
					width: item.width || fallback_column_width_px(item.key),
					label: item.label || item.key,
				}))
				/* Aplicar inmediatamente las preferencias a la tabla */
				this.apply_rows_to_active_pivot()
				return
			}

			/* Sin preferencias guardadas: usar defaults y no sobreescribir el comportamiento nativo */
			this.config_rows = default_rows
			/* active_belongs_to_many queda como prop.belongs_to_many (comportamiento original) */
		},
		/*
		 * Construye las filas de configuración por defecto combinando:
		 * - Todas las propiedades válidas del modelo relacionado (source: model_prop)
		 * - Columnas de pivot_props_to_show (source: pivot_show)
		 * - Columnas de properties_to_set (source: pivot_set)
		 * Retorno: Array de filas de configuración con key, label, visible, order, width, wrap_content, source.
		 */
		get_default_rows() {
			let rows = []
			let order_index = 0

			const belongs = this.prop.belongs_to_many

			/* Mapa de claves en props_to_show explícitas para determinar visibilidad por defecto */
			const explicit_props_to_show_keys = {}
			if (belongs.props_to_show && belongs.props_to_show.length) {
				belongs.props_to_show.forEach(p => {
					explicit_props_to_show_keys[p.key] = p
				})
			}
			/* Indica si hay una lista explícita de props a mostrar */
			const has_explicit_props_to_show = Object.keys(explicit_props_to_show_keys).length > 0

			/* Keys del modelo relacionado: sirve para marcar labels pivot cuando hay colisión */
			const related_model_keys = {}
			this.all_related_properties.forEach(model_prop => {
				related_model_keys[model_prop.key] = true
			})

			/* Agregar todas las propiedades del modelo relacionado */
			this.all_related_properties.forEach(model_prop => {
				/* Visibilidad por defecto: si hay lista explícita, solo las mencionadas; si no, todas salvo not_show */
				let visible = false
				if (has_explicit_props_to_show) {
					visible = !!explicit_props_to_show_keys[model_prop.key]
				} else {
					visible = !model_prop.not_show
				}

				rows.push({
					key: model_prop.key,
					row_id: this.build_row_id('model_prop', model_prop.key),
					label: this.getLabel(model_prop),
					visible,
					order: order_index++,
					width: default_column_width_for_property(model_prop),
					wrap_content: !!model_prop.table_wrap_content,
					/* Indica que esta columna viene del modelo relacionado */
					source: 'model_prop',
				})
			})

			/* Agregar columnas de pivot_props_to_show (datos solo lectura del pivot) */
			const pivot_props_to_show = belongs.pivot_props_to_show || []
			pivot_props_to_show.forEach(pivot_prop => {
				let pivot_show_label = pivot_prop.text || pivot_prop.key
				if (related_model_keys[pivot_prop.key]) {
					pivot_show_label = pivot_show_label + ' (pivot)'
				}
				rows.push({
					key: pivot_prop.key,
					row_id: this.build_row_id('pivot_show', pivot_prop.key),
					label: pivot_show_label,
					visible: true,
					order: order_index++,
					width: pivot_prop.table_width
						? Number(pivot_prop.table_width)
						: fallback_column_width_px(pivot_prop.key),
					wrap_content: false,
					/* Indica que esta columna viene de pivot_props_to_show */
					source: 'pivot_show',
				})
			})

			/* Agregar columnas de properties_to_set (campos editables del pivot) */
			const properties_to_set = belongs.properties_to_set || []
			properties_to_set.forEach(prop_to_set => {
				/* Respetar filtros de extensiones del sistema si aplica */
				if (prop_to_set.if_has_extencion && !this.hasExtencion(prop_to_set.if_has_extencion)) {
					return
				}
				let pivot_set_label = prop_to_set.text || prop_to_set.key
				if (related_model_keys[prop_to_set.key]) {
					pivot_set_label = pivot_set_label + ' (pivot)'
				}
				rows.push({
					key: prop_to_set.key,
					row_id: this.build_row_id('pivot_set', prop_to_set.key),
					label: pivot_set_label,
					visible: true,
					order: order_index++,
					width: prop_to_set.table_width
						? Number(prop_to_set.table_width)
						: 300,
					wrap_content: false,
					/* Indica que esta columna viene de properties_to_set */
					source: 'pivot_set',
				})
			})

			return rows
		},
		/*
		 * Normaliza las filas guardadas en la API con las filas por defecto actuales.
		 * Agrega columnas nuevas del modelo que no estaban en la preferencia guardada.
		 * Elimina columnas guardadas que ya no existen en el modelo actual.
		 * Parámetros:
		 * - saved_rows (Array): columnas tal como vienen de la API.
		 * - default_rows (Array): columnas por defecto calculadas del modelo.
		 * Retorno: Array normalizado listo para config_rows.
		 */
		normalize_rows(saved_rows, default_rows) {
			/* Mapa de defaults por row_id (evita colisión cost/pivot vs cost/article) */
			const defaults_by_row_id = {}
			default_rows.forEach(item => {
				defaults_by_row_id[item.row_id] = item
			})

			/* Mantener solo las columnas que todavía existen en el modelo actual */
			let normalized = saved_rows
				.map(item => {
					const row_id = this.resolve_row_id(item)
					return {
						...item,
						row_id,
					}
				})
				.filter(item => defaults_by_row_id[item.row_id])
				.sort((a, b) => Number(a.order) - Number(b.order))
				.map((item, index) => {
					const default_item = defaults_by_row_id[item.row_id]
					return {
						key: item.key,
						row_id: item.row_id,
						label: default_item.label,
						visible: !!item.visible,
						order: index,
						width: item.width || default_item.width || fallback_column_width_px(item.key),
						wrap_content: !!item.wrap_content,
						source: item.source || default_item.source || 'model_prop',
					}
				})

			/* Agregar al final las columnas nuevas que no estaban en la preferencia guardada */
			default_rows.forEach(default_item => {
				const already_exists = normalized.find(item => item.row_id == default_item.row_id)
				if (!already_exists) {
					normalized.push({
						...default_item,
						order: normalized.length,
					})
				}
			})

			return normalized
		},
		/*
		 * Aplica las filas de configuración actuales reconstruyendo active_belongs_to_many.
		 * Separa las filas visibles por source y reconstruye props_to_show, pivot_props_to_show
		 * y properties_to_set de forma consistente con lo que espera TableComponent.
		 *
		 * Parámetros:
		 * - rows (Array): filas a aplicar. Tienen que traer `order` coherente con el orden real
		 *   (ver la nota de save()). Por defecto usa config_rows, que es lo correcto cuando las
		 *   filas vienen de init_preferences (ahi normalize_rows/get_default_rows ya renumeraron).
		 * Retorno: void.
		 */
		apply_rows_to_active_pivot(rows = this.config_rows) {
			const belongs = this.prop.belongs_to_many

			/* Mapas de acceso rápido a las definiciones originales por key */
			const model_props_by_key = {}
			this.all_related_properties.forEach(p => {
				model_props_by_key[p.key] = p
			})

			/*
			 * Mapa de las props_to_show explícitas del modelo padre (ej: budget.js).
			 * all_related_properties se arma desde el modelo relacionado (ej: article.js),
			 * que no incluye overrides de display como `function`. Este mapa permite
			 * conservarlos al reconstruir las columnas.
			 */
			const explicit_props_to_show_by_key = {}
			;(belongs.props_to_show || []).forEach(p => {
				explicit_props_to_show_by_key[p.key] = p
			})

			const pivot_show_by_key = {}
			;(belongs.pivot_props_to_show || []).forEach(p => {
				pivot_show_by_key[p.key] = p
			})

			const pivot_set_by_key = {}
			;(belongs.properties_to_set || []).forEach(p => {
				pivot_set_by_key[p.key] = p
			})

			/* Tomar solo las filas visibles ordenadas por order */
			const visible_sorted = rows
				.filter(row => row.visible)
				.sort((a, b) => Number(a.order) - Number(b.order))

			/* Arrays destino de la configuración reconstruida */
			const new_props_to_show = []
			const new_pivot_props_to_show = []
			const new_properties_to_set = []

			visible_sorted.forEach(row => {
				if (row.source === 'model_prop') {
					/* Reconstruir usando la definición completa del modelo más los ajustes de ancho/wrap */
					const model_prop = model_props_by_key[row.key]
					if (model_prop) {
						const explicit_prop = explicit_props_to_show_by_key[row.key]
						const merged_prop = {
							...model_prop,
							table_width: row.width,
							table_wrap_content: row.wrap_content,
						}
						/*
						 * Conservar la funcion de display definida en props_to_show del
						 * modelo padre (ej: budget.js -> get_budget_article_display_name),
						 * que all_related_properties (tomado del modelo relacionado) no incluye.
						 */
						if (explicit_prop && explicit_prop.function) {
							merged_prop.function = explicit_prop.function
						}
						new_props_to_show.push(merged_prop)
					}
				} else if (row.source === 'pivot_show') {
					/* Reconstruir prop de pivot solo-lectura con ajuste de ancho */
					const pivot_prop = pivot_show_by_key[row.key]
					if (pivot_prop) {
						new_pivot_props_to_show.push({
							...pivot_prop,
							table_width: row.width,
						})
					}
				} else if (row.source === 'pivot_set') {
					/* Reconstruir prop editable del pivot con ajuste de ancho */
					const prop_to_set = pivot_set_by_key[row.key]
					if (prop_to_set) {
						new_properties_to_set.push({
							...prop_to_set,
							table_width: row.width,
						})
					}
				}
			})

			/* Actualizar el pivot activo manteniendo todas las demás claves de belongs_to_many */
			this.active_belongs_to_many = {
				...belongs,
				props_to_show: new_props_to_show,
				pivot_props_to_show: new_pivot_props_to_show,
				properties_to_set: new_properties_to_set,
			}
		},
		/*
		 * Guarda las preferencias de columnas en la API y las aplica inmediatamente a la tabla.
		 * Cierra el modal al finalizar.
		 * Retorno: void (Promise internamente).
		 */
		save() {
			/* Preparar las filas a guardar: incluir source para poder reconstruir correctamente */
			const rows_to_save = this.config_rows
				.filter(row => typeof row.key != 'undefined' && row.key !== null && row.key !== '')
				.map((row, index) => ({
					key: row.key,
					row_id: row.row_id || this.resolve_row_id(row),
					visible: !!row.visible,
					order: index,
					width: row.width ? Number(row.width) : null,
					wrap_content: !!row.wrap_content,
					source: row.source || 'model_prop',
				}))

			/*
			 * Aplicar inmediatamente sin esperar respuesta de la API.
			 *
			 * Va `rows_to_save` y NO `config_rows`: el modal de configuracion reordena moviendo los
			 * elementos del array (splice/unshift/push) y nunca reescribe `row.order`, asi que en
			 * config_rows el campo `order` queda con el orden ANTERIOR. apply_rows_to_active_pivot
			 * ordena justamente por ese campo, y por eso la tabla se veia igual que antes hasta
			 * cerrar y reabrir el modal del modelo: recien ahi init_preferences leia de la API las
			 * filas con el `order` ya renumerado. rows_to_save es la unica version con el `order`
			 * sacado de la posicion real (order: index). Bug reportado por Lucas el 13/8/2026.
			 */
			this.apply_rows_to_active_pivot(rows_to_save)

			/* Cerrar el modal sin que on_columns_modal_hidden deshaga lo que se acaba de guardar */
			this.columns_saved = true
			this.$bvModal.hide(this.modal_id)

			/* Guardar en la API de forma asíncrona */
			this.$store.commit('auth/setMessage', 'Guardando')
			this.$store.commit('auth/setLoading', true)
			this.$api.put(
				`table-column-preference/${this.prop.store}/${this.preference_type}`,
				{ columns: rows_to_save }
			).then(() => {
				/* Refrescar el store de preferencias para que futuras instancias de este componente carguen correctamente */
				this.$store.dispatch('table_column_preference/getModels')
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
			}).catch(() => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				this.$toast.error('No se pudo guardar la configuracion de columnas')
			})
		},
	},
}
</script>
<!-- El estilo de .btm-columnas-btn vive en src/sass/_toolbar_botones.sass: el boton lo dibujan
     este componente y ModelForm.vue, y los dos se cargan de forma diferida. -->
