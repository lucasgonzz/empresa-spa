<template>
<div>
	<b-modal
	hide-footer
	size="lg"
	title="Historial de actualizaciones masivas"
	id="masive-update-history"
	@show="get_models">

		<div
		v-if="loading"
		class="all-center-md">
			<b-spinner
			variant="primary"></b-spinner>
		</div>

		<history-empty-state
		v-else-if="!models.length"
		icon_class="icon-history"
		title="Aún no hay actualizaciones masivas"
		hint="Cuando realices una actualización masiva, aparecerá aquí su historial."></history-empty-state>

		<b-table
		responsive
		head-variant="dark"
		v-else
		:fields="fields"
		:items="items">

			<template #cell(action)="data">
				{{ action_label(models[data.index].action) }}
			</template>

			<template #cell(status)="data">
				{{ status_label(models[data.index].status) }}
			</template>

			<template #cell(employee_name)="data">
				{{ employee_label(models[data.index]) }}
			</template>

			<template #cell(actions)="data">
				<b-button
				size="sm"
				variant="outline-primary"
				class="m-r-5"
				@click="open_detail(models[data.index])">
					Detalle
				</b-button>
				<b-button
				v-if="models[data.index].can_revert"
				size="sm"
				variant="outline-danger"
				:data-testid="'btn-revertir-masiva-' + models[data.index].id"
				:disabled="revert_loading_id == models[data.index].id"
				@click="confirm_revert(models[data.index])">
					Revertir
				</b-button>
			</template>
		</b-table>
	</b-modal>

	<b-modal
	hide-footer
	size="xl"
	scrollable
	title="Detalle de actualización masiva"
	id="masive-update-detail"
	@hidden="clear_detail">

		<div
		v-if="detail_loading"
		class="all-center-md">
			<b-spinner
			variant="primary"></b-spinner>
		</div>

		<div
		v-else-if="detail_model">
			<p class="m-b-10">
				<strong>Estado:</strong> {{ status_label(detail_model.status) }}
				<span class="m-l-15">
					<strong>Acción:</strong> {{ action_label(detail_model.action) }}
				</span>
			</p>
			<p class="m-b-10">
				<strong>Registros afectados:</strong> {{ numero_es(detail_model.affected_count) }}
				<span class="m-l-15">
					<strong>Cambios:</strong> {{ numero_es(detail_model.changes_count) }}
				</span>
			</p>

			<h6 class="m-t-15 m-b-10">Criterios utilizados</h6>
			<!--
				Renglones legibles armados desde `criteria` (ver criterios_utilizados). Hasta el
				4/10/2026 esto era un <pre> con el JSON crudo, que solo podia leer alguien del equipo.
			-->
			<div
			class="masive-update-criteria"
			data-testid="masiva-criterios">
				<p
				v-if="!criterios_utilizados.length"
				class="text-muted m-b-0">
					Sin criterios registrados.
				</p>
				<div
				v-for="seccion in criterios_utilizados"
				:key="'masive-crit-'+seccion.clave"
				class="masive-update-criteria__seccion">
					<p class="masive-update-criteria__titulo m-b-0">
						{{ seccion.titulo }}
					</p>
					<ul class="masive-update-criteria__lista">
						<li
						v-for="(renglon, index) in seccion.renglones"
						:key="'masive-crit-'+seccion.clave+'-'+index">
							{{ renglon }}
						</li>
					</ul>
				</div>
			</div>

			<h6
			v-if="detail_articles.length"
			class="m-t-15 m-b-10">
				Artículos modificados ({{ numero_es(detail_articles.length) }})
			</h6>

			<div
			v-for="article in detail_articles"
			:key="'masive-upd-art-'+article.id"
			class="masive-update-article-block m-b-15">
				<p class="m-b-5">
					<strong>#{{ article.num }}</strong> — {{ article.name }}
				</p>
				<b-table
				small
				responsive
				:fields="change_fields"
				:items="article.change_rows"
				empty-text="Sin cambios registrados"></b-table>
			</div>

			<p
			v-if="detail_model.error_message"
			class="text-danger m-t-10">
				{{ detail_model.error_message }}
			</p>
		</div>
	</b-modal>

	<!--
		Confirmacion antes de revertir. Mismo patron que confirm-rollback-import de ImportHistory:
		not_show_delete_text para que el texto no quede envuelto en "¿Seguro que quiere eliminar …?",
		y emit para que el confirm no corra su camino de borrado (que termina en el aviso "Eliminado")
		ademas del aviso propio de revert_masive_update. El id lo usa el tour s1-listado.
	-->
	<confirm
	id="confirm-revert-masive-update"
	text="¿Seguro que quiere revertir esta actualización masiva? Los valores guardados volverán al estado anterior."
	not_show_delete_text
	btn_text="Revertir"
	variant="danger"
	emit="revert_confirmado"
	@revert_confirmado="revert_masive_update"></confirm>
</div>
</template>
<script>
export default {
	props: {
		model_name: String,
	},
	components: {
		Confirm: () => import('@/common-vue/components/Confirm'),
		HistoryEmptyState: () => import('@/common-vue/components/horizontal-nav/HistoryEmptyState'),
	},
	data() {
		return {
			loading: false,
			models: [],
			detail_loading: false,
			detail_model: null,
			detail_articles: [],
			revert_loading_id: null,
			pending_revert_id: null,
			/**
			 * Nombres de los registros relacionados que se le pidieron a la API para los criterios
			 * del detalle, por "<store>:<id>": el nombre, o null si no se pudo (queda "#id"). Vive
			 * en el componente y no se limpia al cerrar el detalle, así que cada id se pide una sola
			 * vez aunque el detalle se abra varias. Ver nombre_por_api.
			 */
			nombres_de_relaciones: {},
		}
	},
	created() {
		// Las claves ya pedidas (en vuelo o resueltas). NO es reactivo a propósito: se escribe
		// mientras se evalúa `criterios_utilizados`, y lo único que tiene que redibujar el detalle
		// es la respuesta, que llega a `nombres_de_relaciones`.
		this.nombres_pedidos = {}
	},
	computed: {
		fields() {
			return [
				{ key: 'created_at', label: 'Fecha' },
				{ key: 'action', label: 'Tipo' },
				{ key: 'employee_name', label: 'Realizado por' },
				{ key: 'status', label: 'Estado' },
				{ key: 'affected_count', label: 'Afectados' },
				{ key: 'changes_count', label: 'Cambios' },
				{ key: 'actions', label: '' },
			]
		},
		change_fields() {
			return [
				{ key: 'prop_label', label: 'Propiedad' },
				{ key: 'operation', label: 'Operación' },
				{ key: 'old_value', label: 'Valor anterior' },
				{ key: 'new_value', label: 'Valor nuevo' },
			]
		},
		/**
		 * Propiedades del modelo para resolver labels en español en el detalle: las columnas de los
		 * filtros de "Criterios utilizados" y las propiedades de los artículos modificados.
		 *
		 * Antes leía solo las de `article` (el único modelo con artículos modificados), pero los
		 * filtros los tiene cualquier modelo con masivas. Si el modelo no se puede leer, ninguna:
		 * los labels caen en la key legible (get_prop_label).
		 *
		 * @returns {Array}
		 */
		model_properties_for_labels() {
			try {
				return this.modelPropertiesFromName(this.model_name) || []
			} catch (e) {
				return []
			}
		},
		items() {
			let items = []
			this.models.forEach(model => {
				items.push({
					created_at: this.date(model.created_at, true),
					action: model.action,
					employee_name: null,
					status: model.status,
					affected_count: this.numero_es(model.affected_count),
					changes_count: this.numero_es(model.changes_count),
					actions: null,
				})
			})
			return items
		},
		/**
		 * "Criterios utilizados" del detalle en renglones legibles, agrupados en tres secciones
		 * (Alcance / Filtros / Cambios). Reemplaza al JSON crudo que se mostraba antes (decisión de
		 * Lucas, 4/10/2026).
		 *
		 * Forma de `criteria` (la arma empresa-api, MasiveUpdateHelper::encolar_actualizacion):
		 * {from_filter, used_filters: [{key, operator, value, type}], update_form: [{label, key,
		 * type, value, options?, store?, round?, cost_incluye_iva?}], models_id,
		 * resolved_models_id, filter_form}. Una reversión trae solo {revert_of_masive_update_id}.
		 * Las masivas que crea el asistente (asistente_ia/PropuestaActualizacionMasivaIaHelper)
		 * traen el update_form SIN label y pueden traer el filtro de imagen
		 * {key: 'imagen', operator: 'en_blanco'|'no_en_blanco', type: 'imagen'}.
		 *
		 * 🔴 Es un registro guardado: puede venir de una versión vieja o con una forma rara. Nada de
		 * esto puede romper la vista ni mostrar JSON o "[object Object]": cada renglón se arma por
		 * separado (renglones_de_filtros / renglones_de_cambios), el que no se puede leer se omite, y
		 * si no queda ninguno el template dice "Sin criterios registrados.".
		 *
		 * @returns {Array} [{clave, titulo, renglones: [String]}], solo las secciones con renglones.
		 */
		criterios_utilizados() {
			if (!this.detail_model) {
				return []
			}

			let criteria = this.detail_model.criteria
			if (typeof criteria == 'string') {
				try {
					criteria = JSON.parse(criteria)
				} catch (e) {
					criteria = null
				}
			}
			// Sin criteria legible se sigue con uno vacío: una reversión igual se reconoce por la
			// columna parent_masive_update_id (renglones_de_alcance), y nada más afirma algo.
			if (!criteria || typeof criteria != 'object' || Array.isArray(criteria)) {
				criteria = {}
			}

			let secciones = []
			try {
				let alcance = this.renglones_de_alcance(criteria)
				if (alcance.length) {
					secciones.push({ clave: 'alcance', titulo: 'Alcance', renglones: alcance })
				}
			} catch (e) {
				// Sin alcance legible se muestran igual los filtros y los cambios.
			}

			let filtros = this.renglones_de_filtros(criteria)
			if (filtros.length) {
				secciones.push({ clave: 'filtros', titulo: 'Filtros', renglones: filtros })
			}

			let cambios = this.renglones_de_cambios(criteria)
			if (cambios.length) {
				secciones.push({ clave: 'cambios', titulo: 'Cambios', renglones: cambios })
			}

			return secciones
		},
		/**
		 * Renglón de alcance de una masiva por filtro: "Artículos filtrados" o, para cualquier otro
		 * modelo, "Registros filtrados". No se arma con `plural(model_name)` porque los plurales de
		 * los modelos están escritos sin tilde ("Articulos").
		 *
		 * @returns {String}
		 */
		texto_alcance_filtrado() {
			if (this.model_name == 'article') {
				return 'Artículos filtrados'
			}
			return 'Registros filtrados'
		},
	},
	methods: {
		status_label(status) {
			if (status === 'completed') {
				return 'Completado'
			}
			if (status === 'reverted') {
				return 'Revertido'
			}
			if (status === 'failed') {
				return 'Error'
			}
			if (status === 'processing') {
				return 'Procesando'
			}
			return 'En proceso'
		},
		action_label(action) {
			if (action === 'revert') {
				return 'Reversión'
			}
			return 'Actualización'
		},
		employee_label(model) {
			if (model.user_id == model.employee_id) {
				return this.user.name
			}
			if (model.employee && model.employee.name) {
				return model.employee.name
			}
			return '—'
		},
		get_models() {
			this.loading = true
			this.$api.get('masive-update/' + this.model_name)
			.then(res => {
				this.loading = false
				this.models = res.data.models || []
			})
			.catch(() => {
				this.loading = false
				this.$toast.error('No se pudo cargar el historial de actualizaciones masivas', {
					duration: 4000,
				})
			})
		},
		open_detail(model) {
			this.detail_loading = true
			this.detail_model = null
			this.detail_articles = []
			this.$bvModal.show('masive-update-detail')

			this.$api.get('masive-update/detail/' + model.id)
			.then(res => {
				this.detail_loading = false
				this.detail_model = res.data.model
				this.build_detail_articles()
			})
			.catch(() => {
				this.detail_loading = false
				this.$toast.error('No se pudo cargar el detalle', { duration: 4000 })
			})
		},
		/**
		 * Label en español de una propiedad del modelo según su key.
		 *
		 * @param {String} prop_key
		 * @returns {String}
		 */
		get_prop_label(prop_key) {
			// Clave dinamica por lista (mision catalogo-por-lista-tienda): no es una propiedad del
			// modelo, asi que sin esto se veria "Visible en tienda lista 3".
			let label_por_lista = this.label_visible_en_tienda_lista(prop_key)
			if (label_por_lista) {
				return label_por_lista
			}
			let prop = this.propiedad_del_modelo(prop_key)
			if (prop) {
				return this.propText(prop)
			}
			return this.capitalize(String(prop_key).replaceAll('_', ' '))
		},
		/**
		 * Id de la lista de una clave `visible_en_tienda_lista_<id>`, o null si la clave no es de
		 * esas (mision catalogo-por-lista-tienda, 5/10/2026).
		 *
		 * Es la clave que arma opciones-filtrados-seleccion/Update.vue para habilitar o no un
		 * articulo en la tienda para una lista restringida (contrato C2), y con la que la API
		 * registra el cambio en el detalle de la masiva.
		 *
		 * @param {String} prop_key
		 * @returns {String|null}
		 */
		id_de_lista_visible_en_tienda(prop_key) {
			let coincidencia = String(prop_key).match(/^visible_en_tienda_lista_(\d+)$/)
			return coincidencia ? coincidencia[1] : null
		},
		/**
		 * "Visible en la tienda, lista <nombre>" para una clave `visible_en_tienda_lista_<id>`, o
		 * null para cualquier otra clave (que sigue su camino de siempre en get_prop_label).
		 *
		 * El nombre sale del store de listas, que esta cargado en toda la app; si la lista ya no
		 * existe (se borro despues de la masiva) se nombra por su numero.
		 *
		 * @param {String} prop_key
		 * @returns {String|null}
		 */
		label_visible_en_tienda_lista(prop_key) {
			let price_type_id = this.id_de_lista_visible_en_tienda(prop_key)
			if (price_type_id === null) {
				return null
			}
			let nombre = this.nombre_de_registro('price_type', price_type_id)
			return 'Visible en la tienda, lista '+(nombre ? nombre : '#'+price_type_id)
		},
		/**
		 * Valor viejo o nuevo de un cambio, como se muestra en la tabla del detalle.
		 *
		 * Para la clave por lista de la tienda se traduce a Sí / No: la API registra 1, 0 o null
		 * (no habia fila o nunca se habia tildado), y null significa "no habilitado", igual que 0
		 * (contrato C1: solo `= 1` habilita). Mostrado crudo, un null saldria como "—" y se leeria
		 * como "sin dato". Cualquier otra clave sigue por format_change_value, sin cambios.
		 *
		 * @param {String} prop_key
		 * @param {*} valor
		 * @returns {String}
		 */
		valor_de_cambio(prop_key, valor) {
			if (this.id_de_lista_visible_en_tienda(prop_key) !== null) {
				return this.es_verdadero(valor) ? 'Sí' : 'No'
			}
			return this.format_change_value(valor)
		},
		/**
		 * Texto legible de la operación aplicada en la actualización masiva.
		 *
		 * @param {String} operation
		 * @returns {String}
		 */
		operation_label_for_change(operation) {
			if (operation == 'decrement') {
				return 'Disminuir %'
			}
			if (operation == 'increment') {
				return 'Aumentar %'
			}
			if (operation == 'set') {
				return 'Setear'
			}
			if (operation == 'revert') {
				return 'Revertir'
			}
			return operation || '—'
		},
		build_detail_articles() {
			let articles = []
			let articles_detail = this.detail_model.articles_detail || []

			articles_detail.forEach(article => {
				let change_rows = []
				let changes = article.changes || {}
				Object.keys(changes).forEach(prop_key => {
					let change = changes[prop_key]
					change_rows.push({
						prop_label: this.get_prop_label(prop_key),
						operation: this.operation_label_for_change(change.operation),
						old_value: this.valor_de_cambio(prop_key, change.old),
						new_value: this.valor_de_cambio(prop_key, change.new),
					})
				})
				articles.push({
					id: article.id,
					name: article.name,
					num: article.num,
					change_rows: change_rows,
				})
			})

			this.detail_articles = articles
		},
		format_change_value(value) {
			if (value === null || typeof value === 'undefined') {
				return '—'
			}
			// 🔴 Por aca pasa el valor viejo y el nuevo de CUALQUIER propiedad: un costo, un
			// stock, un porcentaje y tambien texto (nombres, codigos, categorias). Solo se le
			// cambian los separadores a lo que es un numero; el resto sale tal cual.
			if (value === '' || typeof value === 'boolean' || isNaN(Number(value))) {
				return String(value)
			}
			/*
				🔴 No alcanza con "es un numero": un codigo de barras y un codigo de proveedor
				tambien lo son, y saldrian con puntos de miles. Mismo criterio que propertyText()
				en common-vue/mixins/generals.js: solo es una MEDIDA lo que trae punto decimal.
			*/
			if (String(value).indexOf('.') < 0) {
				return String(value)
			}
			return this.numero_es(String(value))
		},
		/**
		 * Propiedad del modelo con esa key, o null.
		 *
		 * @param {String} prop_key
		 * @returns {Object|null}
		 */
		propiedad_del_modelo(prop_key) {
			let prop = this.model_properties_for_labels.find(model_prop => {
				return model_prop && model_prop.key == prop_key
			})
			return prop || null
		},
		/**
		 * True para los valores con los que el backend guarda un "sí" (1, '1', true, 'true').
		 *
		 * @param {*} valor
		 * @returns {Boolean}
		 */
		es_verdadero(valor) {
			return valor === true || valor === 1 || valor === '1' || valor === 'true'
		},
		/**
		 * Texto de un valor guardado, o null si no hay nada mostrable.
		 *
		 * 🔴 Es el único lugar por donde un valor del registro se convierte en texto, y es el que
		 * garantiza que nunca salga "[object Object]": un objeto se muestra solo si trae un texto
		 * propio (text / label / name / nombre) y un array nunca. Con null, quien llama omite el
		 * renglón.
		 *
		 * @param {*} valor
		 * @returns {String|null}
		 */
		texto_escalar(valor) {
			if (valor === null || typeof valor == 'undefined') {
				return null
			}
			if (typeof valor == 'string') {
				return valor.trim() === '' ? null : valor.trim()
			}
			if (typeof valor == 'number') {
				return isFinite(valor) ? String(valor) : null
			}
			if (typeof valor == 'boolean') {
				return valor ? 'Sí' : 'No'
			}
			if (typeof valor == 'object' && !Array.isArray(valor)) {
				let campos = ['text', 'label', 'name', 'nombre']
				for (let i = 0; i < campos.length; i++) {
					let campo = valor[campos[i]]
					if ((typeof campo == 'string' && campo.trim() !== '') || (typeof campo == 'number' && isFinite(campo))) {
						return String(campo).trim()
					}
				}
			}
			return null
		},
		/**
		 * Un número para mostrar con los separadores en español.
		 *
		 * El N° del registro (`id` / `num`) va sin separador de miles: es un identificador y no una
		 * medida, "N° es 12.345" se leería como otra cosa. Lo que no es número sale tal cual.
		 *
		 * @param {String} texto Valor ya pasado por texto_escalar.
		 * @param {String} clave Key de la propiedad.
		 * @returns {String}
		 */
		texto_de_numero(texto, clave) {
			if (isNaN(Number(texto)) || clave == 'id' || clave == 'num') {
				return texto
			}
			return this.numero_es(texto)
		},
		/**
		 * Una fecha guardada como dato (AAAA-MM-DD...) en el formato de la app. Lo que no tenga esa
		 * forma sale tal cual, para no mostrar "Invalid date".
		 *
		 * @param {String} texto
		 * @returns {String}
		 */
		texto_de_fecha(texto) {
			if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
				return this.date(texto)
			}
			return texto
		},
		/**
		 * Texto de la opción de un select con opciones fijas, con el mismo criterio que getOptions
		 * (common-vue/mixins/generals.js) para que se lea igual que en el formulario.
		 *
		 * @param {Array} opciones
		 * @param {*} valor
		 * @returns {String|null}
		 */
		texto_de_opcion(opciones, valor) {
			let opcion = opciones.find(_opcion => {
				if (_opcion && typeof _opcion == 'object' && !Array.isArray(_opcion)) {
					return String(_opcion.value) === String(valor)
				}
				return String(_opcion) === String(valor)
			})
			if (typeof opcion == 'undefined' || opcion === null) {
				return null
			}
			if (typeof opcion == 'object') {
				return this.texto_escalar(opcion.text) || this.texto_escalar(opcion.label) || this.texto_escalar(opcion.value)
			}
			return String(opcion).replaceAll('_', ' ').toUpperCase()
		},
		/**
		 * Store del modelo relacionado a partir de la key ("category_id" -> "category"), o null.
		 *
		 * @param {String} clave
		 * @returns {String|null}
		 */
		store_de_la_clave(clave) {
			if (typeof clave == 'string' && clave.length > 3 && clave.substring(clave.length - 3) == '_id') {
				return clave.substring(0, clave.length - 3)
			}
			return null
		},
		/**
		 * Nombre del registro `id` en el store `store`, si está cargado. null si el store no
		 * existe, no tiene ese registro o el registro no tiene nombre.
		 *
		 * @param {String} store
		 * @param {*} id
		 * @returns {String|null}
		 */
		nombre_de_registro(store, id) {
			if (typeof store != 'string' || !store) {
				return null
			}
			let modulo = this.$store.state[store]
			if (!modulo || !Array.isArray(modulo.models)) {
				return null
			}
			let registro = modulo.models.find(model => {
				return model && model.id == id
			})
			if (!registro) {
				return null
			}
			return this.nombre_del_registro(store, registro)
		},
		/**
		 * El nombre con que se muestra un registro de `store`: el campo que usan los selects de ese
		 * modelo si declara uno, si no `name` o `nombre`.
		 *
		 * @param {String} store
		 * @param {Object} registro
		 * @returns {String|null}
		 */
		nombre_del_registro(store, registro) {
			let campo = null
			try {
				let prop_select = this.getPropToUseInSelect(store)
				if (prop_select) {
					campo = prop_select.key
				}
			} catch (e) {
				campo = null
			}

			return (campo ? this.texto_escalar(registro[campo]) : null)
				|| this.texto_escalar(registro.name)
				|| this.texto_escalar(registro.nombre)
		},
		/**
		 * Si existe el modelo `store` en src/models. Evita pedirle a la API un modelo que no existe
		 * cuando el store se dedujo de una key que no era de relación.
		 *
		 * @param {String} store
		 * @returns {Boolean}
		 */
		existe_el_modelo(store) {
			try {
				this.modelPropertiesFromName(store)
				return true
			} catch (e) {
				return false
			}
		},
		/**
		 * Store del modelo relacionado de una propiedad (su `store`, o la key sin `_id`), o null.
		 *
		 * @param {Object|null} prop
		 * @returns {String|null}
		 */
		store_de_la_prop(prop) {
			if (!prop || typeof prop.key != 'string') {
				return null
			}
			try {
				return this.modelNameFromRelationKey(prop)
			} catch (e) {
				return null
			}
		},
		/**
		 * Nombre del registro `id` de `store` pedido a la API, para cuando el store no lo tiene.
		 *
		 * 🔴 En el Listado los stores de las relaciones de búsqueda (proveedor, categoría, marca)
		 * NO están cargados: se cargan bajo demanda. Sin esto, "Proveedor es #1" (medido en vivo,
		 * 4/10/2026).
		 *
		 * Devuelve lo que ya se sabe: el nombre, o null mientras se pide o si no se pudo. La primera
		 * vez dispara el pedido; la respuesta llega a `nombres_de_relaciones` con $set, y como
		 * `criterios_utilizados` lee ese objeto, el renglón pasa solo de "#1" al nombre.
		 *
		 * @param {String} store
		 * @param {*} id
		 * @returns {String|null}
		 */
		nombre_por_api(store, id) {
			if (typeof store != 'string' || !store || !this.existe_el_modelo(store)) {
				return null
			}
			let clave = store + ':' + String(id)
			if (Object.prototype.hasOwnProperty.call(this.nombres_de_relaciones, clave)) {
				return this.nombres_de_relaciones[clave]
			}
			if (!this.nombres_pedidos[clave]) {
				this.nombres_pedidos[clave] = true
				this.pedir_nombre_a_la_api(store, id, clave)
			}
			return null
		},
		/**
		 * Pide el registro por id con el mismo `POST search/<modelo>` que usa ModelForm.vue: un
		 * filtro de columna number `igual_que` sobre `id`, que el backend acota al dueño
		 * (SearchController::search). Sin aviso global si falla: es un dato de más, no una acción
		 * del usuario, y el renglón queda en "#id".
		 *
		 * @param {String} store
		 * @param {*} id
		 * @param {String} clave Clave de `nombres_de_relaciones`.
		 * @returns {void}
		 */
		pedir_nombre_a_la_api(store, id, clave) {
			let self = this
			this.$api.post('search/' + this.routeString(store), {
				filters: [
					{ key: 'id', type: 'number', igual_que: id },
				],
			}, {
				skip_global_error_event: true,
			})
			.then(res => {
				let models = res && res.data ? res.data.models : null
				let registro = null
				if (Array.isArray(models)) {
					registro = models.find(model => {
						return model && model.id == id
					})
				}
				self.$set(self.nombres_de_relaciones, clave, registro ? self.nombre_del_registro(store, registro) : null)
			})
			.catch(err => {
				// Cancelado por navegación (main.js): no es una respuesta, se puede volver a pedir.
				if (err && err.__CANCEL__) {
					delete self.nombres_pedidos[clave]
					return
				}
				self.$set(self.nombres_de_relaciones, clave, null)
			})
		},
		/**
		 * Texto del valor de una relación (select o search), que se guarda como id: la opción fija
		 * si el select las tiene; si no, el nombre del registro en su store si está cargado, o el que
		 * devuelve la API (nombre_por_api); y si no, "#id".
		 *
		 * @param {String} clave Key de la propiedad.
		 * @param {*} valor Id guardado.
		 * @param {Array|null} opciones Opciones fijas del select, si las tiene.
		 * @param {String|null} store Store del modelo relacionado; sin él se deduce de la key.
		 * @returns {String|null}
		 */
		texto_de_relacion(clave, valor, opciones, store) {
			let texto = this.texto_escalar(valor)
			if (texto === null) {
				return null
			}
			// Un objeto con texto propio ya es el nombre: no hay id que buscar.
			if (typeof valor == 'object') {
				return texto
			}
			if (Array.isArray(opciones) && opciones.length) {
				let de_la_opcion = this.texto_de_opcion(opciones, valor)
				if (de_la_opcion) {
					return de_la_opcion
				}
			}
			let store_del_valor = store || this.store_de_la_clave(clave)
			let nombre = this.nombre_de_registro(store_del_valor, valor) || this.nombre_por_api(store_del_valor, valor)
			if (nombre) {
				return nombre
			}
			return '#' + texto
		},
		/**
		 * Renglones de la sección "Alcance": sobre qué registros corrió la masiva.
		 *
		 * @param {Object} criteria
		 * @returns {Array<String>}
		 */
		renglones_de_alcance(criteria) {
			// Sin el id en criteria (criteria nulo o vacío), la columna parent_masive_update_id: solo
			// la tiene una reversión.
			let id_revertida = criteria.revert_of_masive_update_id
			if (!id_revertida) {
				id_revertida = this.detail_model.parent_masive_update_id
			}
			if (id_revertida && (typeof id_revertida == 'number' || typeof id_revertida == 'string')) {
				// La revertida se busca en la lista del historial, que ya está cargada (el detalle se
				// abre desde ahí). Si no está (quedó fuera de las últimas 50), se nombra por su número.
				let revertida = this.models.find(model => {
					return model && model.id == id_revertida
				})
				if (revertida && revertida.created_at) {
					return ['Revierte la actualización del ' + this.date(revertida.created_at, true)]
				}
				return ['Revierte la actualización #' + id_revertida]
			}

			let from_filter = typeof criteria.from_filter != 'undefined' ? criteria.from_filter : this.detail_model.from_filter
			if (this.es_verdadero(from_filter)) {
				return [this.texto_alcance_filtrado]
			}

			// Una selección que el asistente resolvió por un criterio que no es una columna (los
			// artículos sin imagen) guarda ese criterio en used_filters en vez de la marca "Seleccion
			// manual" (MasiveUpdateHelper::encolar_actualizacion): no la tildó nadie a mano.
			if (this.hay_filtros_efectivos(criteria)) {
				return [this.texto_alcance_filtrado]
			}

			let cantidad = 0
			if (Array.isArray(criteria.resolved_models_id) && criteria.resolved_models_id.length) {
				cantidad = criteria.resolved_models_id.length
			} else if (Array.isArray(criteria.models_id) && criteria.models_id.length) {
				cantidad = criteria.models_id.length
			}
			if (cantidad) {
				return ['Selección manual (' + this.numero_es(cantidad) + ')']
			}

			// Sin ids, "Selección manual" se dice solo si el registro lo dice (from_filter en false
			// o la marca del backend). Un criteria vacío no afirma nada.
			if (criteria.from_filter === false || criteria.from_filter === 0 || criteria.from_filter === '0' || this.tiene_marca_de_seleccion_manual(criteria)) {
				return ['Selección manual']
			}
			return []
		},
		/**
		 * Si `used_filters` trae algún criterio que filtra (no el orden ni la marca "Seleccion
		 * manual").
		 *
		 * @param {Object} criteria
		 * @returns {Boolean}
		 */
		hay_filtros_efectivos(criteria) {
			if (!Array.isArray(criteria.used_filters)) {
				return false
			}
			return criteria.used_filters.some(filtro => {
				return !!filtro
					&& typeof filtro == 'object'
					&& !!filtro.operator
					&& filtro.operator != 'order_by'
					&& filtro.key != 'Seleccion manual'
			})
		},
		/**
		 * Si `used_filters` trae la marca que deja el backend en una selección manual.
		 *
		 * @param {Object} criteria
		 * @returns {Boolean}
		 */
		tiene_marca_de_seleccion_manual(criteria) {
			if (!Array.isArray(criteria.used_filters)) {
				return false
			}
			return criteria.used_filters.some(filtro => {
				return !!filtro && typeof filtro == 'object' && filtro.key == 'Seleccion manual'
			})
		},
		/**
		 * Renglones de la sección "Filtros", uno por filtro de columna aplicado.
		 *
		 * @param {Object} criteria
		 * @returns {Array<String>}
		 */
		renglones_de_filtros(criteria) {
			let renglones = []
			if (!Array.isArray(criteria.used_filters)) {
				return renglones
			}
			criteria.used_filters.forEach(filtro => {
				try {
					let renglon = this.renglon_de_filtro(filtro)
					if (renglon) {
						renglones.push(renglon)
					}
				} catch (e) {
					// Un filtro que no se puede leer se omite: no tumba el resto del detalle.
				}
			})
			return renglones
		},
		/**
		 * "<columna> <operador> <valor>" de un filtro de `used_filters`
		 * (Helpers/ColumnFiltersHelper.php de empresa-api), o null si no se muestra.
		 *
		 * @param {Object} filtro {key, operator, value, type}
		 * @returns {String|null}
		 */
		renglon_de_filtro(filtro) {
			if (!filtro || typeof filtro != 'object' || Array.isArray(filtro)) {
				return null
			}
			// Ordenar no es filtrar, y "Seleccion manual" es la marca que deja el backend cuando no
			// hubo filtro (eso ya lo dice el alcance).
			if (filtro.operator == 'order_by' || filtro.key == 'Seleccion manual') {
				return null
			}
			if (typeof filtro.key != 'string' || !filtro.key) {
				return null
			}

			let prop = this.propiedad_del_modelo(filtro.key)
			let columna = this.get_prop_label(filtro.key)
			let operador = filtro.operator
			let tipo = filtro.type || (prop ? prop.type : null)
			// `imagen` es el mismo filtro de presencia que arma el asistente
			// (PropuestaActualizacionMasivaIaHelper), con otra key y otro type.
			let es_de_imagenes = tipo == 'images' || tipo == 'imagen'

			// La columna de imágenes se filtra por presencia y el filtro la nombra así (EnBlanco.vue):
			// "Imagenes está vacío" no lo diría nadie.
			if (operador == 'en_blanco') {
				return es_de_imagenes ? 'Sin imágenes' : columna + ' está vacío'
			}
			if (operador == 'no_en_blanco') {
				return es_de_imagenes ? 'Con imágenes' : columna + ' no está vacío'
			}
			if (operador == 'checkbox') {
				if (this.es_verdadero(filtro.value)) {
					return columna + ': Sí'
				}
				if (filtro.value === 0 || filtro.value === '0' || filtro.value === false || filtro.value === 'false') {
					return columna + ': No'
				}
				return null
			}

			let valor = null
			if (tipo == 'select' || tipo == 'search') {
				valor = this.texto_de_relacion(filtro.key, filtro.value, prop ? prop.options : null, this.store_de_la_prop(prop))
			} else {
				valor = this.texto_escalar(filtro.value)
				if (valor !== null && tipo == 'date') {
					valor = this.texto_de_fecha(valor)
				} else if (valor !== null && tipo == 'number') {
					valor = this.texto_de_numero(valor, filtro.key)
				}
			}
			if (valor === null) {
				return null
			}

			let es_texto = tipo == 'text' || tipo == 'textarea'
			if (operador == 'que_contenga') {
				return columna + ' contiene "' + valor + '"'
			}
			if (operador == 'igual_que') {
				return columna + ' es ' + (es_texto ? '"' + valor + '"' : valor)
			}
			if (operador == 'menor_que') {
				return columna + ' menor que ' + valor
			}
			if (operador == 'mayor_que') {
				return columna + ' mayor que ' + valor
			}
			return columna + ': ' + valor
		},
		/**
		 * Renglones de la sección "Cambios", uno por ítem de `update_form`.
		 *
		 * @param {Object} criteria
		 * @returns {Array<String>}
		 */
		renglones_de_cambios(criteria) {
			let renglones = []
			let items = criteria.update_form
			// Un array asociativo de PHP llega como objeto: se toman sus valores.
			if (items && typeof items == 'object' && !Array.isArray(items)) {
				items = Object.keys(items).map(clave => {
					return items[clave]
				})
			}
			if (!Array.isArray(items)) {
				return renglones
			}
			items.forEach(item => {
				try {
					let renglon = this.renglon_de_cambio(item)
					if (renglon) {
						renglones.push(renglon)
					}
				} catch (e) {
					// Un ítem que no se puede leer se omite: no tumba el resto del detalle.
				}
			})
			return renglones
		},
		/**
		 * Label de un ítem de `update_form` que no lo trae (lo que crea el asistente y los registros
		 * viejos), armado como lo arma Update.vue: el verbo del prefijo más el nombre de la
		 * propiedad ("Setear el Costo base"), o solo el nombre para un select, search o checkbox.
		 *
		 * @param {Object} item
		 * @param {String} clave
		 * @returns {String|null}
		 */
		label_de_cambio(item, clave) {
			if (!clave) {
				return null
			}
			if (item.type == 'checkbox' || item.type == 'select' || item.type == 'search') {
				return this.get_prop_label(clave)
			}
			let prefijos = [
				{ prefijo: 'increment_', verbo: 'Aumentar el ' },
				{ prefijo: 'decrement_', verbo: 'Disminuir el ' },
				{ prefijo: 'set_', verbo: 'Setear el ' },
			]
			for (let i = 0; i < prefijos.length; i++) {
				if (clave.indexOf(prefijos[i].prefijo) === 0 && clave.length > prefijos[i].prefijo.length) {
					return prefijos[i].verbo + this.get_prop_label(clave.substring(prefijos[i].prefijo.length))
				}
			}
			return this.get_prop_label(clave)
		},
		/**
		 * Renglón de un ítem de `update_form` (lo arma build_flat_form de
		 * opciones-filtrados-seleccion/Update.vue). El `label` ya viene legible, p. ej. "Aumentar
		 * el Costo base (sobre el costo bruto, con IVA)"; acá solo se le suma el valor. Sin label
		 * (asistente, registros viejos) se arma con label_de_cambio.
		 *
		 * @param {Object} item {label?, key, type, value, options?, store?, round?}
		 * @returns {String|null}
		 */
		renglon_de_cambio(item) {
			if (!item || typeof item != 'object' || Array.isArray(item)) {
				return null
			}
			let clave = typeof item.key == 'string' ? item.key : ''
			let label = this.texto_escalar(item.label) || this.label_de_cambio(item, clave)
			if (!label) {
				return null
			}

			if (item.type == 'checkbox') {
				if (this.es_verdadero(item.value)) {
					return label + ': Activar'
				}
				if (item.value === 0 || item.value === '0' || item.value === false) {
					return label + ': Desactivar'
				}
				return null
			}
			if (item.type == 'select' || item.type == 'search') {
				// Lo que no trae el ítem (el asistente no manda ni opciones ni store) sale de la
				// propiedad del modelo.
				let prop = this.propiedad_del_modelo(clave)
				let opciones = Array.isArray(item.options) && item.options.length ? item.options : (prop ? prop.options : null)
				let store = typeof item.store == 'string' && item.store ? item.store : this.store_de_la_prop(prop)
				let relacion = this.texto_de_relacion(clave, item.value, opciones, store)
				if (relacion === null) {
					return null
				}
				return label + ': ' + relacion
			}

			let valor = this.texto_escalar(item.value)
			if (valor === null) {
				return null
			}
			if (clave.indexOf('increment_') === 0 || clave.indexOf('decrement_') === 0) {
				let renglon = label + ': ' + this.texto_de_numero(valor, clave) + ' %'
				if (this.es_verdadero(item.round)) {
					renglon += ' (redondeado)'
				}
				return renglon
			}
			if (clave.indexOf('set_') === 0) {
				return label + ': ' + this.texto_de_numero(valor, clave)
			}
			return label + ': ' + valor
		},
		clear_detail() {
			this.detail_model = null
			this.detail_articles = []
		},
		confirm_revert(model) {
			this.pending_revert_id = model.id
			this.$bvModal.show('confirm-revert-masive-update')
		},
		revert_masive_update() {
			if (!this.pending_revert_id) {
				return
			}
			let masive_update_id = this.pending_revert_id
			this.revert_loading_id = masive_update_id
			this.pending_revert_id = null

			this.$api.post('masive-update/' + masive_update_id + '/revert')
			.then(() => {
				this.revert_loading_id = null
				this.$toast.success('La reversión se está procesando en segundo plano. Te avisaremos cuando termine.', {
					duration: 5000,
				})
				this.get_models()
			})
			.catch(err => {
				this.revert_loading_id = null
				let message = 'No se pudo iniciar la reversión'
				if (err.response && err.response.data && err.response.data.message) {
					message = err.response.data.message
				}
				this.$toast.error(message, { duration: 4000 })
			})
		},
	},
}
</script>
<style scoped lang="sass">
// Panel de "Criterios utilizados": renglones con el mismo tamaño de letra que el resto del
// detalle (antes era un <pre> monoespaciado y más chico, con scroll propio).
.masive-update-criteria
	background: var(--bg-section, #f5f7fa)
	padding: 10px 12px
	border-radius: 6px

.masive-update-criteria__seccion + .masive-update-criteria__seccion
	margin-top: 8px

.masive-update-criteria__titulo
	font-weight: 600

.masive-update-criteria__lista
	margin: 2px 0 0
	padding-left: 18px

.masive-update-article-block
	border: 1px solid var(--color-border-secondary, #e8ecf0)
	border-radius: 6px
	padding: 10px
</style>
