<template>
	<b-modal
	id="article-import-result-notification"
	size="md"
	hide-footer
	centered
	title="Importacion de Excel"
	:modal-class="modal_wrapper_class"
	body-class="article-import-result-modal__body"
	@show="on_modal_show"
	@hide="on_modal_hide">

		<!-- Cabecera con icono y mensaje principal -->
		<div
		class="article-import-result-modal__hero"
		:class="hero_variant_class">
			<div class="article-import-result-modal__hero-icon">
				<i :class="hero_icon_class"></i>
			</div>
			<div class="article-import-result-modal__hero-text">
				<p class="article-import-result-modal__hero-label">
					{{ hero_label }}
				</p>
				<h4 class="article-import-result-modal__hero-title">
					{{ message_text }}
				</h4>
			</div>
		</div>

		<!-- Estadísticas en tarjetas (éxito) -->
		<div
		v-if="is_success && stat_cards.length"
		class="article-import-result-modal__stats-grid m-t-20">
			<div
			v-for="(stat, index) in stat_cards"
			:key="index"
			class="article-import-result-modal__stat-card"
			data-testid="resultado-importacion-metrica"
			:data-metrica="stat.slug"
			:data-valor="stat.value"
			:style="{ '--stat-color': stat.color }">
				<div class="article-import-result-modal__stat-value">
					{{ format_stat_value(stat.value) }}
				</div>
				<div class="article-import-result-modal__stat-label">
					{{ stat.label }}
				</div>
				<div
				v-if="stat_bar_max_value > 0"
				class="article-import-result-modal__stat-bar-track m-t-8">
					<div
					class="article-import-result-modal__stat-bar-fill"
					:style="{ width: stat_bar_width(stat.value) }">
					</div>
				</div>
			</div>
		</div>

		<!-- Gráfico de barras horizontales (distribución relativa) -->
		<div
		v-if="is_success && stat_cards.length && stat_bar_max_value > 0"
		class="article-import-result-modal__chart m-t-20">
			<p class="article-import-result-modal__chart-title">
				Distribución de la importación
			</p>
			<div
			v-for="(stat, index) in stat_cards"
			:key="'chart-' + index"
			class="article-import-result-modal__chart-row">
				<span class="article-import-result-modal__chart-label">
					{{ stat.label }}
				</span>
				<div class="article-import-result-modal__chart-track">
					<div
					class="article-import-result-modal__chart-fill"
					:style="{ width: stat_bar_width(stat.value), background: stat.color }">
					</div>
				</div>
				<span class="article-import-result-modal__chart-value">
					{{ format_stat_value(stat.value) }}
				</span>
			</div>
		</div>

		<!-- Lista expandible de artículos creados con código repetido -->
		<div
		v-if="is_success && repeated_code_count > 0"
		class="article-import-result-modal__repeated m-t-15">
			<b-button
			variant="link"
			size="sm"
			class="p-0"
			@click="toggle_repeated_code_list">
				{{ show_repeated_code_list ? 'Ocultar' : 'Ver' }} los {{ numero_es(repeated_code_count) }} artículos creados con código repetido
			</b-button>
			<div v-if="show_repeated_code_list" class="m-t-10">
				<div v-if="loading_repeated_code_list" class="text-muted small">Cargando...</div>
				<div
				v-else-if="repeated_code_articles_error"
				class="text-danger small">
					No se pudo cargar la lista. Intentá de nuevo más tarde.
				</div>
				<ul v-else class="small article-import-result-modal__repeated-list">
					<li
					v-for="art in repeated_code_articles"
					:key="art.id">
						<strong>{{ art.name }}</strong>
						<span v-if="art.bar_code" class="text-muted"> · BC: {{ art.bar_code }}</span>
						<span v-if="art.provider_code" class="text-muted"> · CP: {{ art.provider_code }}</span>
					</li>
				</ul>
				<p
				v-if="!loading_repeated_code_list && !repeated_code_articles_error && hay_mas_repeated_code_articles"
				class="text-muted small m-t-5 m-b-0">
					y {{ numero_es(repeated_code_total - repeated_code_articles.length) }} más…
				</p>
			</div>
		</div>

		<!-- Sobrescrituras dentro del propio archivo (prompt 06, grupo 265): informativo, no un error -->
		<div
		v-if="sobrescrituras_a_mostrar.length > 0"
		class="article-import-result-modal__overwrites m-t-15">
			<p class="article-import-result-modal__overwrites-title">
				{{ numero_es(sobrescrituras_count) }} fila{{ sobrescrituras_count > 1 ? 's' : '' }} se resolv{{ sobrescrituras_count > 1 ? 'ieron' : 'ió' }} como repetida{{ sobrescrituras_count > 1 ? 's' : '' }}
			</p>
			<ul class="small article-import-result-modal__overwrites-list m-b-0">
				<li
				v-for="(item, index) in sobrescrituras_a_mostrar"
				:key="'overwrite-' + index">
					La fila {{ item.fila }} fue sobrescrita por la fila {{ item.fila_ganadora }}
				</li>
			</ul>
			<p
			v-if="hay_mas_sobrescrituras"
			class="text-muted small m-t-5 m-b-0">
				y {{ numero_es(sobrescrituras_count - sobrescrituras_a_mostrar.length) }} más — velas en el historial de importaciones.
			</p>
		</div>

		<!--
			Columnas de precio que no se aplicaron (misión 44): el artículo ya se maneja por
			la otra, así que la del Excel se salteó. Informativo, no un error: la fila se
			procesó bien y por eso tampoco suma a conflicts_count.
		-->
		<div
		v-if="hay_columnas_de_precio_ignoradas"
		class="article-import-result-modal__skipped-prices m-t-15">
			<p class="article-import-result-modal__skipped-prices-title">
				Columnas de precio que no se aplicaron
			</p>
			<p
			v-if="precios_manuales_ignorados > 0"
			class="article-import-result-modal__skipped-prices-text">
				En {{ numero_es(precios_manuales_ignorados) }} artículo{{ precios_manuales_ignorados > 1 ? 's' : '' }} no se aplicó el precio del Excel porque el artículo se maneja por margen de ganancia. Para fijarles el precio a mano, primero hay que sacarles el margen desde la ficha del artículo.
			</p>
			<p
			v-if="margenes_ignorados > 0"
			class="article-import-result-modal__skipped-prices-text">
				En {{ numero_es(margenes_ignorados) }} artículo{{ margenes_ignorados > 1 ? 's' : '' }} no se aplicó el margen del Excel porque el artículo tiene un precio manual cargado. Para pasarlos a margen, primero hay que borrarles el precio manual desde la ficha del artículo.
			</p>
			<ul
			v-if="columnas_de_precio_ignoradas_a_mostrar.length"
			class="small article-import-result-modal__skipped-prices-list m-b-0">
				<li
				v-for="(item, index) in columnas_de_precio_ignoradas_a_mostrar"
				:key="'skipped-price-' + index">
					Fila {{ item.fila }}<span v-if="item.nombre_excel"> · {{ item.nombre_excel }}</span> — {{ campo_de_precio_label(item.campo) }}
				</li>
			</ul>
			<!--
				A diferencia de las sobrescrituras, acá NO se manda al historial de
				importaciones: el botón que abre ese detalle está gateado en conflicts_count,
				y este tipo no suma ahí a propósito, así que una importación cuyo único
				"conflicto" sean columnas de precio salteadas no muestra el botón. Prometerlo
				sería mandar al usuario a una pantalla donde no hay nada que abrir.
			-->
			<p
			v-if="hay_mas_columnas_de_precio_ignoradas"
			class="text-muted small m-t-5 m-b-0">
				y {{ numero_es(columnas_de_precio_ignoradas_count - columnas_de_precio_ignoradas_a_mostrar.length) }} artículo{{ (columnas_de_precio_ignoradas_count - columnas_de_precio_ignoradas_a_mostrar.length) > 1 ? 's' : '' }} más.
			</p>
		</div>

		<!-- Configuración utilizada en la importación -->
		<div
		v-if="show_import_options"
		class="article-import-result-modal__config m-t-20">
			<p class="article-import-result-modal__config-title">
				Configuración utilizada
			</p>

			<div class="article-import-result-modal__config-grid">
				<div
				v-if="import_operacion_label"
				class="article-import-result-modal__config-item">
					<span class="article-import-result-modal__config-label">
						Operación
					</span>
					<span class="article-import-result-modal__config-value">
						{{ import_operacion_label }}
					</span>
				</div>

				<div
				v-if="import_row_range_label"
				class="article-import-result-modal__config-item">
					<span class="article-import-result-modal__config-label">
						Rango de filas
					</span>
					<span class="article-import-result-modal__config-value">
						{{ import_row_range_label }}
					</span>
				</div>

				<div
				v-if="import_provider_label"
				class="article-import-result-modal__config-item">
					<span class="article-import-result-modal__config-label">
						Proveedor
					</span>
					<span class="article-import-result-modal__config-value">
						{{ import_provider_label }}
					</span>
				</div>
			</div>

			<div
			v-if="import_advanced_options.length"
			class="article-import-result-modal__config-advanced m-t-12">
				<p class="article-import-result-modal__config-subtitle">
					Opciones avanzadas
				</p>
				<ul class="article-import-result-modal__config-list m-b-0">
					<li
					v-for="(option, index) in import_advanced_options"
					:key="'import-option-' + index"
					class="article-import-result-modal__config-list-item">
						<span class="article-import-result-modal__config-list-label">
							{{ option.label }}
						</span>
						<span
						class="article-import-result-modal__config-list-value"
						:class="import_option_value_class(option.value)">
							{{ option.value }}
						</span>
					</li>
				</ul>
			</div>
		</div>

		<!-- Detalle de error o texto legacy -->
		<div
		v-if="!is_success || extra_info_blocks.length"
		class="article-import-result-modal__details m-t-20">
			<div
			v-for="(info, index) in extra_info_blocks"
			:key="'info-' + index"
			class="article-import-result-modal__detail-block">
				<p
				v-if="info.title"
				class="article-import-result-modal__detail-title">
					{{ info.title }}
				</p>
				<div v-if="info.parrafos">
					<p
					v-for="(parrafo, p_index) in info.parrafos"
					:key="'p-' + p_index"
					class="article-import-result-modal__detail-text">
						{{ parrafo }}
					</p>
				</div>
				<p
				v-else-if="info.value"
				class="article-import-result-modal__detail-text article-import-result-modal__detail-text--mono">
					{{ info.value }}
				</p>
			</div>
		</div>

		<!-- Acciones -->
		<div class="article-import-result-modal__actions m-t-25">
			<b-button
			v-for="(action, index) in functions_to_execute"
			:key="'action-' + index"
			class="article-import-result-modal__action-btn"
			:variant="action.btn_variant || 'primary'"
			@click="call_action(action)">
				{{ action.btn_text }}
			</b-button>
		</div>

	</b-modal>
</template>

<script>
import global_notification_functions from '@/mixins/global_notification_functions'

export default {

	mixins: [global_notification_functions],

	data() {
		return {
			/* Controla si la lista expandible de artículos con código repetido está visible. */
			show_repeated_code_list: false,

			/* True mientras se está cargando la lista desde la API. */
			loading_repeated_code_list: false,

			/* True si la carga de la lista falló. */
			repeated_code_articles_error: false,

			/* Artículos traídos por el endpoint repeated-code-articles. */
			repeated_code_articles: [],

			/*
			 * Prompt 05 (grupo 291): total real de artículos con código repetido, según el
			 * endpoint acotado (repeated_code_articles.length siempre da como mucho el
			 * limit pedido). Null hasta que la respuesta llega.
			 */
			repeated_code_total: null,

			/*
			 * Prompt 06 (grupo 265): sobrescrituras (import_conflicts tipo 'fila_sobrescrita')
			 * de esta importación, traídas del historial cuando import_stats no las trae ya
			 * armadas. Cada item: { fila, fila_ganadora }.
			 */
			sobrescrituras: [],

			/*
			 * Prompt 05 (grupo 291): total real de sobrescrituras, según el endpoint acotado
			 * (?tipo=fila_sobrescrita&limit=5) -- sobrescrituras.length ya no sirve para el
			 * conteo porque ahora el backend devuelve como mucho 5. Null hasta que llega.
			 */
			sobrescrituras_total: null,

			/*
			 * Misión 44: filas donde una columna de precio del Excel no se aplicó porque el
			 * artículo ya se maneja por la otra (import_conflicts tipo
			 * 'columna_de_precio_ignorada'). Se piden acotadas al endpoint: un Excel de
			 * 20.000 filas puede generar 20.000 de estas y el modal no las puede traer todas.
			 */
			columnas_de_precio_ignoradas: [],

			/* Total real del tipo, según el agregado SQL del endpoint (no .length). */
			columnas_de_precio_ignoradas_total: null,

			/*
			 * Desglose por campo, del `resumen` del endpoint (agregado SQL sobre el total
			 * del historial). Hace falta separado porque cada campo tiene su propio mensaje
			 * y su propio "qué hacer".
			 */
			columnas_de_precio_ignoradas_por_campo: {},
		}
	},

	computed: {

		/*
		 * Texto principal de la notificación (store global_notification).
		 */
		message_text() {
			return this.$store.state.global_notification.message_text || ''
		},

		color_variant() {
			return this.$store.state.global_notification.color_variant || 'info'
		},

		functions_to_execute() {
			return this.$store.state.global_notification.functions_to_execute || []
		},

		info_to_show() {
			return this.$store.state.global_notification.info_to_show || []
		},

		import_stats() {
			return this.$store.state.global_notification.import_stats
		},

		/*
		 * Configuración de la importación enviada por el backend (paso 3 + rango).
		 */
		import_options() {
			return this.$store.state.global_notification.import_options
		},

		/*
		 * True si hay datos de configuración para mostrar en el modal.
		 */
		show_import_options() {
			if (!this.import_options || typeof this.import_options !== 'object') {
				return false
			}

			if (this.import_operacion_label || this.import_row_range_label || this.import_provider_label) {
				return true
			}

			return this.import_advanced_options.length > 0
		},

		/*
		 * Texto de operación (solo actualizar vs crear y actualizar).
		 */
		import_operacion_label() {
			let options = this.import_options

			if (!options || !options.operacion_a_realizar) {
				return ''
			}

			return this.format_operacion_a_realizar(options.operacion_a_realizar)
		},

		/*
		 * Rango de filas importadas (desde / hasta).
		 */
		import_row_range_label() {
			let options = this.import_options

			if (!options) {
				return ''
			}

			let start_row = options.start_row
			let finish_row = options.finish_row

			if (start_row === null || start_row === '' || typeof start_row === 'undefined') {
				return ''
			}

			if (finish_row === null || finish_row === '' || typeof finish_row === 'undefined') {
				return 'Desde la fila ' + start_row
			}

			return 'Desde la fila ' + start_row + ' hasta la fila ' + finish_row
		},

		/*
		 * Nombre del proveedor del archivo, si aplica.
		 */
		import_provider_label() {
			let options = this.import_options

			if (!options || !options.provider_name) {
				return ''
			}

			return options.provider_name
		},

		/*
		 * Checkboxes del paso 3 (códigos repetidos, otro proveedor, etc.).
		 */
		import_advanced_options() {
			let options = this.import_options

			if (!options || !Array.isArray(options.advanced_options)) {
				return []
			}

			return options.advanced_options
		},

		/*
		 * True si la notificación es de éxito (importación OK).
		 */
		is_success() {
			return this.color_variant === 'success'
		},

		hero_label() {
			if (this.is_success) {
				return 'Importación completada'
			}
			return 'Importación con problemas'
		},

		hero_icon_class() {
			if (this.is_success) {
				return 'icon-check-circle'
			}
			return 'icon-alert-triangle'
		},

		hero_variant_class() {
			return 'article-import-result-modal__hero--' + (this.color_variant || 'info')
		},

		modal_wrapper_class() {
			return 'article-import-result-modal-wrapper'
		},

		/*
		 * Tarjetas de métricas a partir de import_stats o, en fallback, info_to_show.
		 * Si hay artículos creados con código repetido (> 0), se agrega un 5to card en rojo.
		 */
		stat_cards() {
			let stats = this.import_stats

			if (stats && typeof stats === 'object') {
				/* Construir el array base con los 4 contadores siempre presentes. */
				let cards = [
					{
						label: 'Filas procesadas',
						slug: 'filas_procesadas',
						value: stats.filas_procesadas,
						color: '#6f42c1',
					},
					{
						label: 'Artículos creados',
						slug: 'creados',
						value: stats.articulos_creados,
						color: '#28a745',
					},
					{
						label: 'Artículos macheados',
						slug: 'macheados',
						value: stats.articulos_macheados,
						color: '#17a2b8',
					},
					{
						label: 'Artículos actualizados',
						slug: 'actualizados',
						value: stats.articulos_actualizados,
						color: '#007bff',
					},
				]

				/* Solo mostrar el 5to card cuando haya artículos con código repetido. */
				if (this.repeated_code_count > 0) {
					cards.push({
						label: 'Creados con código repetido',
						slug: 'codigo_repetido',
						value: this.repeated_code_count,
						color: '#dc3545',
					})
				}

				return cards
			}

			return this.parse_stats_from_info_to_show()
		},

		/*
		 * Cantidad de artículos creados cuyo bar_code o provider_code ya existía en BD.
		 * Proviene de import_stats.articulos_creados_con_codigo_repetido.
		 */
		repeated_code_count() {
			return ((this.import_stats || {}).articulos_creados_con_codigo_repetido) || 0
		},

		/*
		 * Prompt 06 (grupo 265): lista de sobrescrituras si import_stats ya la trae armada
		 * (preparado para cuando el backend la sume al payload de la notificación), o null
		 * si hay que pedirla al historial (ver fetch_sobrescrituras()).
		 */
		sobrescrituras_de_import_stats() {
			let stats = this.import_stats

			if (stats && Array.isArray(stats.sobrescrituras)) {
				return stats.sobrescrituras
			}

			return null
		},

		/*
		 * Total de sobrescrituras: el conteo de import_stats.sobrescrituras_count si vino;
		 * si no, el total real que devolvió el endpoint acotado (prompt 05, grupo 291); si
		 * no, la cantidad de la lista (ya sea la de import_stats o la pedida al historial).
		 * sobrescrituras.length YA NO alcanza sola porque el endpoint devuelve como mucho 5.
		 */
		sobrescrituras_count() {
			let stats = this.import_stats

			if (stats && typeof stats.sobrescrituras_count === 'number') {
				return stats.sobrescrituras_count
			}

			if (!this.sobrescrituras_de_import_stats && typeof this.sobrescrituras_total === 'number') {
				return this.sobrescrituras_total
			}

			return (this.sobrescrituras_de_import_stats || this.sobrescrituras).length
		},

		/*
		 * Primeras 5 sobrescrituras para el texto de la sección; el resto queda resumido
		 * en "y N más — velas en el historial de importaciones".
		 */
		sobrescrituras_a_mostrar() {
			return (this.sobrescrituras_de_import_stats || this.sobrescrituras).slice(0, 5)
		},

		/*
		 * True si hay más de 5 sobrescrituras y hay que mostrar el resumen de las restantes.
		 */
		hay_mas_sobrescrituras() {
			return this.sobrescrituras_count > this.sobrescrituras_a_mostrar.length
		},

		/*
		 * Misión 44: cantidad de artículos a los que no se les aplicó el PRECIO del Excel
		 * porque se manejan por margen de ganancia. Sale del `resumen` del endpoint
		 * (agregado SQL), no de la lista traída, que viene cortada en 5.
		 */
		precios_manuales_ignorados() {
			return this.columnas_de_precio_ignoradas_por_campo.price || 0
		},

		/*
		 * Misión 44: cantidad de artículos a los que no se les aplicó el MARGEN del Excel
		 * porque tienen un precio manual cargado.
		 */
		margenes_ignorados() {
			return this.columnas_de_precio_ignoradas_por_campo.percentage_gain || 0
		},

		/*
		 * Total de columnas de precio salteadas: el total real del endpoint si llegó, y si
		 * no la suma del desglose por campo. Nunca la longitud de la lista.
		 */
		columnas_de_precio_ignoradas_count() {
			if (typeof this.columnas_de_precio_ignoradas_total === 'number') {
				return this.columnas_de_precio_ignoradas_total
			}

			return this.precios_manuales_ignorados + this.margenes_ignorados
		},

		/*
		 * True si hay algo que mostrar en la sección. Se mira el conteo y no la lista: los
		 * dos mensajes con los totales valen aunque la lista de ejemplo venga vacía.
		 */
		hay_columnas_de_precio_ignoradas() {
			return this.columnas_de_precio_ignoradas_count > 0
		},

		/* Primeras 5 filas como ejemplo; el resto queda resumido. */
		columnas_de_precio_ignoradas_a_mostrar() {
			return this.columnas_de_precio_ignoradas.slice(0, 5)
		},

		hay_mas_columnas_de_precio_ignoradas() {
			return this.columnas_de_precio_ignoradas_count > this.columnas_de_precio_ignoradas_a_mostrar.length
		},

		/*
		 * Prompt 05 (grupo 291): true si el endpoint acotado de artículos con código
		 * repetido devolvió menos artículos que el total real, para avisar que la lista
		 * está truncada.
		 */
		hay_mas_repeated_code_articles() {
			return this.repeated_code_total > this.repeated_code_articles.length
		},

		/*
		 * Bloques de info extra (errores o compatibilidad).
		 */
		extra_info_blocks() {
			if (!this.is_success) {
				return this.info_to_show
			}

			/* En éxito solo mostramos info_to_show si no hay stats estructurados. */
			if (this.import_stats) {
				return []
			}

			return this.info_to_show
		},

		/*
		 * Valor máximo para calcular anchos de barras relativas.
		 */
		stat_bar_max_value() {
			let max = 0

			this.stat_cards.forEach(function(stat) {
				let value = Number(stat.value) || 0
				if (value > max) {
					max = value
				}
			})

			return max
		},

	},

	methods: {

		/*
		 * Ejecuta la acción del botón (mixin global_notification_functions).
		 */
		call_action(action) {
			if (action.function_name && typeof this[action.function_name] === 'function') {
				this[action.function_name]()
			}
			if (action.link) {
				window.open(action.link)
			}
			this.close_modal()
		},

		close_modal() {
			this.$bvModal.hide('article-import-result-notification')
		},

		on_modal_show() {
			/* Prompt 06 (grupo 265): pedir las sobrescrituras si import_stats no las trae ya. */
			this.fetch_sobrescrituras()

			/* Misión 44: columnas de precio que no se aplicaron. */
			this.fetch_columnas_de_precio_ignoradas()
		},

		on_modal_hide() {
			/* Limpiar estado de la lista expandible al cerrar el modal. */
			this.show_repeated_code_list = false
			this.loading_repeated_code_list = false
			this.repeated_code_articles_error = false
			this.repeated_code_articles = []
			this.repeated_code_total = null
			this.sobrescrituras = []
			this.sobrescrituras_total = null
			this.columnas_de_precio_ignoradas = []
			this.columnas_de_precio_ignoradas_total = null
			this.columnas_de_precio_ignoradas_por_campo = {}
		},

		/*
		 * Alterna visibilidad de la lista de artículos con código repetido.
		 * Dispara la carga desde la API si aún no se hizo y la lista está vacía.
		 */
		toggle_repeated_code_list() {
			this.show_repeated_code_list = !this.show_repeated_code_list

			if (this.show_repeated_code_list && this.repeated_code_articles.length === 0) {
				this.fetch_repeated_code_articles()
			}
		},

		/*
		 * Llama al endpoint para traer los artículos creados con código repetido.
		 * Usa el import_history_id provisto en import_stats.
		 */
		fetch_repeated_code_articles() {
			let import_history_id = (this.import_stats || {}).import_history_id

			if (!import_history_id) {
				return
			}

			this.loading_repeated_code_list = true
			this.repeated_code_articles_error = false

			/*
			 * Prompt 05 (grupo 291): el endpoint ahora acota con limit/offset y devuelve
			 * { articles, total } en vez del array pelado de antes. Pedimos 50 (el
			 * componente los muestra todos en la lista expandible).
			 */
			this.$api.get('import-history/repeated-code-articles/' + import_history_id + '?limit=50')
			.then(res => {
				this.repeated_code_articles = res.data.articles || []
				this.repeated_code_total = typeof res.data.total === 'number'
					? res.data.total
					: this.repeated_code_articles.length
			})
			.catch(() => {
				this.repeated_code_articles_error = true
			})
			.finally(() => {
				this.loading_repeated_code_list = false
			})
		},

		/*
		 * Prompt 06 (grupo 265): trae las sobrescrituras (import_conflicts tipo
		 * 'fila_sobrescrita') del historial, sin cambiar el contrato de la notificación.
		 * No hace falta si import_stats ya las trae armadas (sobrescrituras_de_import_stats).
		 * Reutiliza el mismo endpoint de conflictos que usa el historial de importaciones.
		 */
		fetch_sobrescrituras() {
			if (!this.is_success || this.sobrescrituras_de_import_stats) {
				return
			}

			let import_history_id = (this.import_stats || {}).import_history_id

			if (!import_history_id) {
				return
			}

			/*
			 * Prompt 05 (grupo 291): filtramos por tipo del lado del backend en vez de traer
			 * TODOS los conflictos del historial y filtrar acá -- con Excel grandes y códigos
			 * repetidos, fila_sobrescrita se registra una vez por cada fila pisada, así que
			 * podían viajar miles de filas por la red para mostrar 5. limit=5 porque el
			 * componente ya solo muestra 5; el conteo real sale de res.data.total (agregado
			 * SQL del backend), no de sobrescrituras.length.
			 */
			this.$api.get('import-history/' + import_history_id + '/conflicts?tipo=fila_sobrescrita&limit=5')
			.then(res => {
				this.sobrescrituras = res.data.conflicts || []
				this.sobrescrituras_total = typeof res.data.total === 'number'
					? res.data.total
					: this.sobrescrituras.length
			})
			.catch(() => {
				/* Silencioso: es informativo, no bloquea nada del resultado de la importación. */
			})
		},

		/*
		 * Misión 44: trae las columnas de precio que la importación salteó
		 * (import_conflicts tipo 'columna_de_precio_ignorada').
		 *
		 * Se pide con limit=5 y el conteo sale del `resumen` del backend (agregado SQL
		 * agrupado por tipo y campo), no de la longitud de la lista: un Excel de 20.000
		 * filas puede generar un conflicto por fila y el modal solo muestra 5 ejemplos.
		 * El desglose por campo es lo que decide cuál de los dos mensajes se muestra.
		 */
		fetch_columnas_de_precio_ignoradas() {
			if (!this.is_success) {
				return
			}

			let import_history_id = (this.import_stats || {}).import_history_id

			if (!import_history_id) {
				return
			}

			this.$api.get('import-history/' + import_history_id + '/conflicts?tipo=columna_de_precio_ignorada&limit=5')
			.then(res => {
				this.columnas_de_precio_ignoradas = res.data.conflicts || []

				this.columnas_de_precio_ignoradas_total = typeof res.data.total === 'number'
					? res.data.total
					: this.columnas_de_precio_ignoradas.length

				let por_campo = {}

				let resumen = res.data.resumen || []

				resumen.forEach(function(item) {
					if (item.tipo === 'columna_de_precio_ignorada') {
						por_campo[item.campo] = (por_campo[item.campo] || 0) + Number(item.total || 0)
					}
				})

				this.columnas_de_precio_ignoradas_por_campo = por_campo
			})
			.catch(() => {
				/* Silencioso: es informativo, no bloquea nada del resultado de la importación. */
			})
		},

		/*
		 * Misión 44: nombre visible de la columna salteada.
		 */
		campo_de_precio_label(campo) {
			if (campo === 'price') {
				return 'no se aplicó el precio del Excel'
			}

			if (campo === 'percentage_gain') {
				return 'no se aplicó el margen del Excel'
			}

			return campo
		},

		/*
		 * Texto alineado al paso 3 del modal de importación.
		 */
		format_operacion_a_realizar(operacion) {
			let text = String(operacion || '').trim()

			if (text === 'Crear y actualizar') {
				return 'Cargar nuevos artículos y editar existentes'
			}

			if (text === 'Solo actualizar') {
				return 'Solo editar artículos existentes'
			}

			return text
		},

		/*
		 * Clase visual para valores Sí/No de opciones avanzadas.
		 */
		import_option_value_class(value) {
			let text = String(value || '').trim().toLowerCase()

			if (text === 'sí' || text === 'si') {
				return 'article-import-result-modal__config-list-value--yes'
			}

			if (text === 'no') {
				return 'article-import-result-modal__config-list-value--no'
			}

			return ''
		},

		/*
		 * Formatea números grandes con separador de miles.
		 */
		format_stat_value(value) {
			let number = Number(value) || 0
			return number.toLocaleString('es-AR')
		},

		/*
		 * Ancho de barra en porcentaje respecto al máximo.
		 */
		stat_bar_width(value) {
			let number = Number(value) || 0
			let max = this.stat_bar_max_value

			if (max <= 0) {
				return '0%'
			}

			let percent = Math.round((number / max) * 100)
			if (percent < 4 && number > 0) {
				percent = 4
			}

			return percent + '%'
		},

		/*
		 * Fallback: extrae números de parrafos legacy ("123 filas procesadas").
		 */
		parse_stats_from_info_to_show() {
			let cards = []
			let colors = ['#6f42c1', '#28a745', '#17a2b8', '#007bff']
			let color_index = 0

			this.info_to_show.forEach(function(info) {
				if (!info.parrafos) {
					return
				}

				info.parrafos.forEach(function(parrafo) {
					let match = String(parrafo).match(/^(\d+)\s+(.+)$/)
					if (match) {
						cards.push({
							label: match[2],
							value: parseInt(match[1], 10),
							color: colors[color_index % colors.length],
						})
						color_index++
					}
				})
			})

			return cards
		},

	},

}
</script>

<style lang="sass">
.article-import-result-modal-wrapper .modal-content
	border: none
	border-radius: 16px
	overflow: hidden
	box-shadow: 0 20px 50px rgba(0, 0, 0, 0.18)

.article-import-result-modal__body
	padding: 0 24px 24px

.article-import-result-modal__hero
	display: flex
	align-items: center
	gap: 16px
	margin: -1px -24px 0
	padding: 22px 24px
	color: #fff

	&--success
		background: linear-gradient(135deg, #28a745 0%, #20c997 100%)

	&--danger
		background: linear-gradient(135deg, #dc3545 0%, #e83e8c 100%)

	&--warning
		background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)
		color: #212529

	&--info
		background: linear-gradient(135deg, #007bff 0%, #6610f2 100%)

.article-import-result-modal__hero-icon
	font-size: 42px
	line-height: 1
	opacity: 0.95

.article-import-result-modal__hero-label
	margin: 0 0 4px
	font-size: 12px
	text-transform: uppercase
	letter-spacing: 0.06em
	opacity: 0.9

.article-import-result-modal__hero-title
	margin: 0
	font-size: 20px
	font-weight: 700
	line-height: 1.3

.article-import-result-modal__stats-grid
	display: grid
	grid-template-columns: repeat(2, 1fr)
	gap: 12px

@media (max-width: 576px)
	.article-import-result-modal__stats-grid
		grid-template-columns: 1fr

.article-import-result-modal__stat-card
	background: #f8f9fb
	border-radius: 12px
	padding: 14px 16px
	border-left: 4px solid var(--stat-color, #007bff)

.article-import-result-modal__stat-value
	font-size: 28px
	font-weight: 800
	color: #212529
	line-height: 1.1

.article-import-result-modal__stat-label
	font-size: 13px
	color: #6c757d
	margin-top: 4px

.article-import-result-modal__stat-bar-track
	height: 6px
	background: rgba(0, 0, 0, 0.06)
	border-radius: 4px
	overflow: hidden

.article-import-result-modal__stat-bar-fill
	height: 100%
	background: var(--stat-color, #007bff)
	border-radius: 4px
	transition: width 0.4s ease

.article-import-result-modal__chart
	background: #fff
	border: 1px solid rgba(0, 0, 0, 0.06)
	border-radius: 12px
	padding: 14px 16px

.article-import-result-modal__chart-title
	font-size: 13px
	font-weight: 600
	color: #495057
	margin: 0 0 12px

.article-import-result-modal__chart-row
	display: grid
	grid-template-columns: 120px 1fr 48px
	align-items: center
	gap: 10px
	margin-bottom: 8px

	&:last-child
		margin-bottom: 0

.article-import-result-modal__chart-label
	font-size: 12px
	color: #6c757d

.article-import-result-modal__chart-track
	height: 10px
	background: #eef1f5
	border-radius: 6px
	overflow: hidden

.article-import-result-modal__chart-fill
	height: 100%
	border-radius: 6px
	min-width: 2px
	transition: width 0.45s ease

.article-import-result-modal__chart-value
	font-size: 12px
	font-weight: 700
	text-align: right
	color: #343a40

// Sobrescrituras dentro del propio archivo (prompt 06, grupo 265): dato informativo,
// mismo tono neutro que la configuración utilizada — a propósito, no es un error.
.article-import-result-modal__overwrites
	background: #f8f9fb
	border: 1px solid rgba(0, 0, 0, 0.06)
	border-radius: 12px
	padding: 14px 16px

.article-import-result-modal__overwrites-title
	font-size: 14px
	font-weight: 700
	color: #343a40
	margin: 0 0 8px

.article-import-result-modal__overwrites-list
	list-style: none
	padding: 0
	margin: 0
	color: #495057

	li
		padding: 3px 0

// Columnas de precio que no se aplicaron (misión 44): mismo tono neutro que las
// sobrescrituras — es información, no un error.
.article-import-result-modal__skipped-prices
	background: #f8f9fb
	border: 1px solid rgba(0, 0, 0, 0.06)
	border-radius: 12px
	padding: 14px 16px

.article-import-result-modal__skipped-prices-title
	font-size: 14px
	font-weight: 700
	color: #343a40
	margin: 0 0 8px

.article-import-result-modal__skipped-prices-text
	font-size: 13px
	color: #495057
	margin: 0 0 8px

.article-import-result-modal__skipped-prices-list
	list-style: none
	padding: 0
	margin: 0
	color: #495057

	li
		padding: 3px 0

.article-import-result-modal__config
	background: #f8f9fb
	border: 1px solid rgba(0, 0, 0, 0.06)
	border-radius: 12px
	padding: 14px 16px

.article-import-result-modal__config-title
	font-size: 14px
	font-weight: 700
	color: #343a40
	margin: 0 0 12px

.article-import-result-modal__config-subtitle
	font-size: 12px
	font-weight: 600
	color: #6c757d
	margin: 0 0 8px
	text-transform: uppercase
	letter-spacing: 0.04em

.article-import-result-modal__config-grid
	display: grid
	grid-template-columns: 1fr
	gap: 10px

.article-import-result-modal__config-item
	display: flex
	flex-direction: column
	gap: 2px

.article-import-result-modal__config-label
	font-size: 12px
	color: #6c757d

.article-import-result-modal__config-value
	font-size: 14px
	font-weight: 600
	color: #212529

.article-import-result-modal__config-list
	list-style: none
	padding: 0
	margin: 0

.article-import-result-modal__config-list-item
	display: flex
	justify-content: space-between
	align-items: flex-start
	gap: 12px
	padding: 6px 0
	border-bottom: 1px solid rgba(0, 0, 0, 0.05)
	font-size: 13px

	&:last-child
		border-bottom: none
		padding-bottom: 0

.article-import-result-modal__config-list-label
	color: #495057
	flex: 1

.article-import-result-modal__config-list-value
	font-weight: 600
	flex-shrink: 0

	&--yes
		color: #28a745

	&--no
		color: #6c757d

.article-import-result-modal__detail-block
	background: #fff8f8
	border: 1px solid rgba(220, 53, 69, 0.15)
	border-radius: 10px
	padding: 12px 14px
	margin-bottom: 10px

.article-import-result-modal__detail-title
	font-weight: 600
	margin: 0 0 6px
	color: #343a40

.article-import-result-modal__detail-text
	margin: 0 0 4px
	font-size: 14px
	color: #495057

	&--mono
		font-family: monospace
		font-size: 13px
		white-space: pre-wrap

.article-import-result-modal__actions
	display: flex
	flex-wrap: wrap
	justify-content: center
	gap: 10px

.article-import-result-modal__action-btn
	min-width: 140px
	font-weight: 600

.article-import-result-modal__repeated-list
	padding-left: 16px
	margin: 0

	li
		padding: 3px 0
		border-bottom: 1px solid rgba(0, 0, 0, 0.05)

		&:last-child
			border-bottom: none
</style>
