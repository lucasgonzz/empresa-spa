<template>
	<div class="pdf-column-profile-editor m-t-10">
		<b-alert
		v-if="!model.model_name"
		show
		variant="warning">
			Seleccioná el tipo de modelo (Venta, Presupuesto, Pedido online o Artículo) para configurar las columnas.
		</b-alert>

		<template v-else>
			<div
			v-if="loading_catalog"
			class="text-center text-muted p-3">
				Cargando columnas...
			</div>

			<b-alert
			v-else-if="!pdf_config_rows.length"
			show
			variant="secondary">
				No se encontraron columnas para el catálogo "{{ model.model_name }}".
			</b-alert>

			<template v-else>
				<!--
					Diseñador de PDF (misión diseno-pdf-configurable, 1/10/2026): para los perfiles de
					comprobantes -- venta, presupuesto y pedido online -- arma la hoja entera con cajas
					(encabezado, zona de arriba de la tabla, la tabla, pie, hoja y margen). Los perfiles de
					artículo siguen con su propio diseñador, el del encabezado del catálogo (abajo).

					Desde la misión diseno-ticket-comandera (9/10/2026) la tabla de columnas también se arma
					en el diseñador, y en su lugar va la TARJETA con la miniatura del diseño (como las de
					Diseños de Vender): el nombre, si imprime con el diseño de siempre o con cajas y "Tocá
					para diseñarlo". Un clic (o Enter) abre el diseñador; el botón "Diseñar PDF"
					(data-testid="abrir-disenador-pdf") queda adentro de la tarjeta.
				-->
				<tarjeta-del-pdf
				v-if="tiene_disenador_de_pdf"
				class="m-b-10"
				:model="model"
				@abrir="abrir_disenador_de_pdf"></tarjeta-del-pdf>

				<!-- Diseñador del encabezado del catálogo (misión catalogo-pdf-encabezado):
				logo, nombre y datos del negocio del PDF tabla de artículos. -->
				<div
				v-if="model.model_name === 'article'"
				class="m-b-10">
					<b-button
					size="sm"
					variant="outline-primary"
					@click="open_catalog_header_designer">
						<i class="icon-configuration"></i>
						Diseñar encabezado
					</b-button>
				</div>

				<!--
					La tabla de columnas de siempre: solo para artículo. En venta, presupuesto y pedido
					online las columnas se arman en el diseñador (la tarjeta de arriba), pero este editor
					sigue cargando el catálogo y sincronizando model.pdf_column_options (el POST del ABM
					exige al menos una opción): ver build_rows y sync_rows_to_model.
				-->
				<pdf-columns-preferences-config-modal
				v-if="!tiene_disenador_de_pdf"
				:config_rows="pdf_config_rows"
				:paper_width_mm="local_paper_width_mm"
				:printable_width_mm="local_printable_width_mm"
				:margin_mm="local_margin_mm"
				:show_size_controls="false"
				:show_typography_columns="model.model_name === 'article'"
				:layout_table="true"></pdf-columns-preferences-config-modal>

				<b-alert
				v-if="!tiene_disenador_de_pdf && remaining_width_mm < 0"
				show
				variant="danger"
				class="m-t-10">
					La suma de anchos visibles supera el ancho disponible ({{ available_width_mm }}mm, imprimible menos márgenes) por {{ Math.abs(remaining_width_mm) }}mm.
				</b-alert>

				<!-- Diseñador de PDF (modal aparte): recibe el mismo model que edita este ABM y
				persiste page_layout, la hoja, la tabla (pdf_column_options), header_layout y logo_size_mm -->
				<disenador-pdf
				v-if="tiene_disenador_de_pdf"
				ref="disenador_de_pdf"
				:model="model"></disenador-pdf>

				<!-- Diseñador del encabezado del catálogo (modal aparte): recibe el mismo model
				que edita este ABM y persiste catalog_header_layout -->
				<catalog-header-designer
				v-if="model.model_name === 'article'"
				ref="catalog_header_designer"
				:model="model"></catalog-header-designer>
			</template>
		</template>
	</div>
</template>

<script>
import PdfColumnsPreferencesConfigModal from '@/common-vue/components/pdf/PdfColumnsPreferencesConfigModal.vue'
/*
	El diseñador va importado de forma directa (no con () => import), como el editor de Diseños de
	Vender: se abre con this.$refs.disenador_de_pdf.abrir(), y un componente asíncrono no tiene ref
	hasta que termina de cargar. Este editor ya se carga diferido desde ModelForm.vue.
*/
import DisenadorPdf from '@/common-vue/components/pdf/disenador-pdf/Index.vue'
import TarjetaDelPdf from '@/common-vue/components/pdf/miniatura-pdf/TarjetaDelPdf.vue'
import {
	COLUMNAS_DE_LA_TABLA,
	MEDIAS_SUGERIDAS_EN_TICKET,
	columnas_sugeridas,
	poner_sugeridas,
	mm_a_columnas,
	mm_de_las_columnas,
} from '@/common-vue/components/pdf/disenador-pdf/tabla_del_disenador'
import { hoja_del_perfil, ancho_util, tiene_diseno } from '@/common-vue/components/pdf/disenador-pdf/estado_del_disenador'

/* Límites del margen para leer la hoja del perfil (los de DisenoDePaginaPdf: el catálogo acá no llega) */
const LIMITES_DEL_MARGEN = {
	margen_min: 0,
	margen_max: 20,
}
import CatalogHeaderDesigner from '@/common-vue/components/pdf/catalog-header-designer/Index.vue'

/**
 * Editor de columnas PDF para ABM de pdf_column_profile (ventas, presupuestos, pedidos online
 * o artículos).
 *
 * Recibe el modelo del perfil como prop y arma las filas con todas las columnas del catálogo,
 * mezclando el estado visible/ancho/orden de los pivots ya guardados. Para artículo las muestra (la
 * tabla de siempre); para venta, presupuesto y pedido online muestra la tarjeta del diseño y las
 * columnas se arman en el diseñador (misión diseno-ticket-comandera), pero las filas se siguen
 * armando y sincronizando a `model.pdf_column_options`, que es lo que lleva el POST/PUT del ABM.
 *
 * 🔴 Ida y vuelta con el diseñador, sin ciclos: cuando el diseñador cambia
 * `model.pdf_column_options` (perfil nuevo, o después de guardar), este editor rearma sus filas
 * desde el modelo (watcher de `model.pdf_column_options`). Lo que escribe el propio editor no
 * dispara ese rearmado: cada escritura anota su firma (`firma_sincronizada`) y el watcher la
 * reconoce. Y mientras build_rows asigna las filas, `_syncing` frena el watcher de las filas (que
 * correría en el tick siguiente): después de armar, la sincronización se hace una vez, a mano.
 */
export default {
	components: {
		PdfColumnsPreferencesConfigModal,
		DisenadorPdf,
		TarjetaDelPdf,
		CatalogHeaderDesigner,
	},
	props: {
		/**
		 * Modelo del formulario ABM (pdf_column_profile).
		 */
		model: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			/**
			 * Catálogo completo de opciones disponibles para el model_name del perfil.
			 */
			pdf_column_options_catalog: [],
			/**
			 * Filas que se muestran y editan en el componente visual de columnas.
			 */
			pdf_config_rows: [],
			/**
			 * Estado de carga del catálogo remoto.
			 */
			loading_catalog: false,
			/**
			 * Valor local del ancho de hoja, sincronizado con el modelo.
			 */
			local_paper_width_mm: 297,
			/**
			 * Valor local del ancho imprimible, sincronizado con el modelo.
			 */
			local_printable_width_mm: 277,
			/**
			 * Firma (JSON normalizado) del último pdf_column_options que este editor escribió o leyó
			 * del modelo: el watcher de model.pdf_column_options no rearma las filas por un cambio que
			 * hizo el propio editor.
			 */
			firma_sincronizada: '',
		}
	},
	computed: {
		/**
		 * Si el perfil en edición es de un comprobante que se diseña con el diseñador de PDF:
		 * venta, presupuesto o pedido online (decisión de Lucas en la Fase 2 de la misión
		 * diseno-pdf-configurable). Los perfiles de artículo no: tienen su propio diseñador del
		 * encabezado del catálogo.
		 *
		 * @returns {boolean}
		 */
		tiene_disenador_de_pdf() {
			const model_name = this.model && this.model.model_name
			return model_name === 'sale' || model_name === 'budget' || model_name === 'order'
		},

		/**
		 * Suma de anchos de columnas visibles (mm).
		 *
		 * @returns {number}
		 */
		used_width_mm() {
			let sum = 0
			this.pdf_config_rows.forEach(function (row) {
				if (row && row.visible) {
					sum += Number(row.width || 0)
				}
			})
			return sum
		},
		/**
		 * Margen lateral por lado tomado del perfil en edición.
		 *
		 * @returns {number}
		 */
		local_margin_mm() {
			if (!this.model || this.model.margin_mm == null || this.model.margin_mm === '') {
				return 5
			}
			return Number(this.model.margin_mm || 0)
		},
		/**
		 * Ancho útil para columnas visibles (imprimible − márgenes izquierdo y derecho).
		 *
		 * @returns {number}
		 */
		available_width_mm() {
			const printable_width_mm = Number(this.local_printable_width_mm || 0)
			const margin_mm = this.local_margin_mm
			const available_width_mm = printable_width_mm - (margin_mm * 2)
			return available_width_mm > 0 ? available_width_mm : 0
		},
		/**
		 * Ancho disponible restante (mm).
		 *
		 * @returns {number}
		 */
		remaining_width_mm() {
			return this.available_width_mm - this.used_width_mm
		},
	},
	watch: {
		/**
		 * Al cambiar el perfil abierto, recargar catálogo y filas.
		 */
		'model.id'() {
			this.init()
		},
		/**
		 * Al cambiar el tipo de modelo del perfil, recargar catálogo.
		 */
		'model.model_name'() {
			this.apply_article_a4_defaults()
			this.init()
		},
		/**
		 * Sincronizar ancho de hoja local con el modelo.
		 */
		'model.paper_width_mm'(value) {
			this.local_paper_width_mm = Number(value || 297)
		},
		/**
		 * Sincronizar ancho imprimible local con el modelo.
		 */
		'model.printable_width_mm'(value) {
			this.local_printable_width_mm = Number(value || 277)
		},
		/**
		 * Cuando el usuario modifica filas en el editor, persistir en el modelo para el guardado.
		 */
		pdf_config_rows: {
			deep: true,
			handler() {
				if (this._syncing) {
					return
				}
				this.sync_rows_to_model()
			},
		},
		/**
		 * El diseñador de PDF cambió las columnas del modelo (perfil nuevo: las deja con $set; perfil
		 * guardado: copia las que devolvió la API): las filas se rearman desde el modelo, así el
		 * guardado del ABM no las pisa con las viejas. Si el cambio lo hizo este mismo editor (misma
		 * firma), no se hace nada.
		 *
		 * @param {Array} opciones
		 */
		'model.pdf_column_options'(opciones) {
			if (!this.pdf_column_options_catalog.length) {
				return
			}
			if (this.firma_de_opciones(opciones) === this.firma_sincronizada) {
				return
			}
			this.build_rows()
		},
	},
	created() {
		/*
			`_syncing`: cuando es true, los cambios en pdf_config_rows no se sincronizan al modelo
			(evita ciclos al cargar filas programáticamente). Va acá y no en data(): Vue no vuelve
			reactivas las claves que empiezan con "_" (y el lint las rechaza en data). Es una bandera
			común del componente: build_rows la prende y la apaga en el tick siguiente, después de que
			corrió el watcher de las filas.
		*/
		this._syncing = false
		if (this.model) {
			this.local_paper_width_mm = Number(this.model.paper_width_mm || 297)
			this.local_printable_width_mm = Number(this.model.printable_width_mm || 277)
		}
		this.init()
	},
	methods: {
		/**
		 * Inicializa el editor: descarga el catálogo y construye las filas.
		 *
		 * @return {void}
		 */
		init() {
			this.apply_article_a4_defaults()

			const model_name = this.model && this.model.model_name
			if (!model_name) {
				this.pdf_column_options_catalog = []
				this.pdf_config_rows = []
				return
			}

			this.loading_catalog = true

			// Catálogo de opciones PDF: dato decorativo, la pantalla arma igual sin él. No hace
			// falta el cartel global de conexión por esto (config `skip_global_error_event` del
			// interceptor de `main.js`).
			this.$api.get('pdf-column-options', {
				params: { model_name: model_name },
				skip_global_error_event: true,
			})
				.then((res) => {
					const models = res && res.data && Array.isArray(res.data.models)
						? res.data.models
						: []

					/* Filtrar solo las opciones del model_name correcto, ordenadas por order */
					this.pdf_column_options_catalog = models
						.filter((item) => item && item.id != null && item.model_name === model_name)
						.sort((a, b) => Number(a.order || 0) - Number(b.order || 0))

					this.build_rows()
				})
				.catch(() => {
					this.pdf_column_options_catalog = []
					this.pdf_config_rows = []
				})
				.finally(() => {
					this.loading_catalog = false
				})
		},
		/**
		 * Alinea perfiles A4 de artículo, presupuesto y pedido online: imprimible 210 mm y margen
		 * 5 mm por lado (200 mm para columnas). Para artículo, además corrige el valor legacy
		 * printable_width_mm=200 que el validador trataba como bruto.
		 *
		 * Presupuesto y pedido online se suman a la corrección de un perfil NUEVO: su PDF es una hoja
		 * A4 vertical de 210 mm, y con los defaults del formulario (297/277) el editor dejaría sumar
		 * columnas hasta 267 mm y el PDF se saldría de la hoja. La venta queda como estaba.
		 *
		 * @return {void}
		 */
		apply_article_a4_defaults() {
			const a4_model_names = ['article', 'budget', 'order']
			if (!this.model || a4_model_names.indexOf(this.model.model_name) === -1) {
				return
			}

			const paper_width_mm = Number(this.model.paper_width_mm || 0)
			const printable_width_mm = Number(this.model.printable_width_mm || 0)
			const margin_mm = Number(this.model.margin_mm == null || this.model.margin_mm === '' ? 5 : this.model.margin_mm)
			const is_legacy_net_printable = this.model.model_name === 'article' && paper_width_mm === 210 && printable_width_mm === 200 && margin_mm === 5
			const is_new_profile = !this.model.id

			if (!is_new_profile && !is_legacy_net_printable) {
				return
			}

			this.$set(this.model, 'paper_width_mm', 210)
			this.$set(this.model, 'printable_width_mm', 210)
			this.$set(this.model, 'margin_mm', 5)
			this.local_paper_width_mm = 210
			this.local_printable_width_mm = 210
		},
		/**
		 * Construye pdf_config_rows mezclando el catálogo con los pivots guardados en el perfil.
		 * Incluye TODAS las opciones del catálogo, no solo las ya configuradas.
		 *
		 * @return {void}
		 */
		build_rows() {
			const catalog = this.pdf_column_options_catalog
			if (!catalog.length) {
				this._syncing = true
				this.pdf_config_rows = []
				this._syncing = false
				return
			}

			/* Índice de pivots guardados en el perfil, por option id */
			const saved_by_id = {}
			const saved_options = this.model && Array.isArray(this.model.pdf_column_options)
				? this.model.pdf_column_options
				: []

			saved_options.forEach((opt) => {
				if (!opt || opt.id == null) {
					return
				}
				const pivot = opt.pivot || {}
				saved_by_id[opt.id] = {
					visible: this.as_bool(pivot.visible),
					order: Number(pivot.order || 0),
					width: Number(pivot.width || opt.default_width || 0),
					wrap_content: this.as_bool(pivot.wrap_content),
					font_size: pivot.font_size != null && pivot.font_size !== ''
						? Number(pivot.font_size)
						: 8,
					text_align: pivot.text_align || '',
					has_pivot: true,
				}
			})

			const rows = catalog.map((option, catalog_index) => {
				const saved = saved_by_id[option.id]
				return {
					key: option.id,
					name: option.name || option.label || '',
					label: option.label || option.name || '',
					value_resolver: option.value_resolver || '',
					visible: saved ? saved.visible : false,
					order: saved ? saved.order : catalog_index,
					width: saved ? saved.width : Number(option.default_width || 0),
					wrap_content: saved ? saved.wrap_content : false,
					font_size: saved ? saved.font_size : 8,
					text_align: saved ? saved.text_align : '',
				}
			})

			/* Ordenar por el order guardado en el pivot; las nuevas van al final en orden del catálogo */
			rows.sort((a, b) => Number(a.order) - Number(b.order))

			this.mark_suggested_columns(rows)

			/*
				Asignar sin disparar el watcher de las filas: corre en el tick siguiente, así que la
				bandera se apaga recién después (con $nextTick, que queda detrás de ese watcher). Y la
				sincronización al modelo se hace una vez, acá mismo: un perfil nuevo necesita sus
				opciones en el modelo para el POST, y sync_rows_to_model no escribe si no cambió nada.
			*/
			this._syncing = true
			this.pdf_config_rows = rows
			this.$nextTick(() => {
				this._syncing = false
			})
			this.sync_rows_to_model()
		},
		/**
		 * Perfil NUEVO de venta, presupuesto o pedido online sin ninguna columna visible: se prenden
		 * las sugeridas (las de `columnas_sugeridas` del diseñador, con su respaldo local), con el
		 * salto de línea en las que lo permiten. Desde la misión diseno-ticket-comandera la tabla no
		 * se ve en el formulario: sin esto, un diseño creado sin abrir el diseñador saldría con la
		 * tabla vacía. Un perfil guardado no se toca (el diseñador propone las sugeridas al abrirlo,
		 * como cambio sin guardar).
		 *
		 * Los anchos, con la MISMA regla que el diseñador (poner_sugeridas de tabla_del_disenador.js):
		 * - en medias columnas: en una hoja, el ancho por defecto de cada opción sobre el ancho útil;
		 *   en un ticket, las medias de los tickets por defecto de la API (9/3/6/6);
		 * - lo que sobra de las 24 medias va a la de salto de línea (el nombre), así la tabla llena el
		 *   ancho (en una A4 era 9/2/3/3 = 17 de 24);
		 * - y los milímetros contra el ancho útil ACTUAL del modelo (ancho_util_para_sugeridas): si el
		 *   formulario eligió un rollo antes de que llegara el catálogo de columnas, entran en mm del
		 *   rollo. Antes entraban en los de una A4 y el POST daba 422 (la suma no entraba en 80 mm).
		 *
		 * @param {Array} rows filas recién armadas (se modifican)
		 * @return {void}
		 */
		mark_suggested_columns(rows) {
			if (this.model.id || !this.tiene_disenador_de_pdf) {
				return
			}
			const any_visible = rows.some(function (row) {
				return row.visible
			})
			if (any_visible) {
				return
			}

			const self = this
			const allows_wrap = {}
			this.pdf_column_options_catalog.forEach(function (option) {
				allows_wrap[option.id] = self.as_bool(option.allow_wrap_content)
			})

			const util = this.ancho_util_para_sugeridas()

			/* Columnas de trabajo mínimas, como las de la tabla del diseñador, para poner_sugeridas */
			const columnas = []
			rows.forEach(function (row) {
				columnas.push({
					row: row,
					value_resolver: row.value_resolver,
					cols: mm_a_columnas(row.width, util, COLUMNAS_DE_LA_TABLA),
					permite_salto: !!allows_wrap[row.key],
					salto: false,
				})
			})

			const visibles = []
			const medias_fijas = this.es_rollo_del_modelo() ? MEDIAS_SUGERIDAS_EN_TICKET : null
			poner_sugeridas(columnas, visibles, columnas_sugeridas(this.model.model_name, null), COLUMNAS_DE_LA_TABLA, medias_fijas)

			const medias = []
			visibles.forEach(function (columna) {
				medias.push(columna.cols)
			})
			const milimetros = mm_de_las_columnas(medias, util, COLUMNAS_DE_LA_TABLA)

			visibles.forEach(function (columna, indice) {
				columna.row.visible = true
				columna.row.wrap_content = columna.salto
				columna.row.width = milimetros[indice]
			})
		},
		/**
		 * Si el tipo de hoja del formulario es un rollo de comandera: una venta con un tipo de hoja sin
		 * alto (D2). El selector "Hoja o comandera" deja el tipo en `model.sheet_type`.
		 *
		 * @return {boolean}
		 */
		es_rollo_del_modelo() {
			const tipo = this.model ? this.model.sheet_type : null
			return !!(this.model && this.model.model_name === 'sale' && tipo && typeof tipo === 'object' && tipo.height === null)
		},
		/**
		 * El ancho útil (mm) contra el que se calculan los milímetros de las sugeridas: el ancho del
		 * rollo en un ticket; en una hoja, el de la hoja con que la ve el diseñador (la A4 de siempre,
		 * 200 mm, si el perfil no tiene diseño con cajas).
		 *
		 * @return {number}
		 */
		ancho_util_para_sugeridas() {
			if (this.es_rollo_del_modelo()) {
				const ancho = Number(this.model.sheet_type.width || this.model.paper_width_mm || 0)
				return ancho > 0 ? ancho : 80
			}
			const hoja = hoja_del_perfil(this.model, tiene_diseno(this.model.page_layout), LIMITES_DEL_MARGEN)
			const util = ancho_util(hoja)
			return util > 0 ? util : 200
		},
		/**
		 * Firma de un pdf_column_options: lo que importa de cada opción (id y pivot normalizado), en
		 * su orden. Dos listas con la misma firma guardan lo mismo.
		 *
		 * @param {Array} opciones
		 * @return {string}
		 */
		firma_de_opciones(opciones) {
			const firma = []
			;(Array.isArray(opciones) ? opciones : []).forEach((opcion) => {
				if (!opcion || opcion.id == null) {
					return
				}
				const pivot = opcion.pivot || {}
				firma.push([
					opcion.id,
					this.as_bool(pivot.visible),
					Number(pivot.order || 0),
					Number(pivot.width || 0),
					this.as_bool(pivot.wrap_content),
					this.normalize_font_size(pivot.font_size),
					this.normalize_text_align(pivot.text_align),
				])
			})
			return JSON.stringify(firma)
		},
		/**
		 * Normaliza un valor a boolean (1/'1'/true → true, todo lo demás → false).
		 *
		 * @param {*} value
		 * @return {boolean}
		 */
		as_bool(value) {
			return value === true || value === 1 || value === '1'
		},
		/**
		 * Normaliza tamaño de letra al rango permitido por la API (4–24 pt).
		 *
		 * @param {*} value
		 * @return {number|null}
		 */
		normalize_font_size(value) {
			const font_size = Number(value || 0)
			if (font_size >= 4 && font_size <= 24) {
				return font_size
			}
			return null
		},
		/**
		 * Normaliza alineación horizontal; cadena vacía → null (automática en backend).
		 *
		 * @param {*} value
		 * @return {string|null}
		 */
		normalize_text_align(value) {
			if (value === 'left' || value === 'center' || value === 'right') {
				return value
			}
			return null
		},
		/**
		 * Copia el estado actual de pdf_config_rows a model.pdf_column_options
		 * con la estructura de pivots que espera el backend.
		 *
		 * @return {void}
		 */
		sync_rows_to_model() {
			if (!this.model || !this.model.model_name) {
				return
			}
			if (!this.pdf_column_options_catalog.length) {
				return
			}

			const catalog_by_id = {}
			this.pdf_column_options_catalog.forEach((opt) => {
				catalog_by_id[opt.id] = opt
			})

			const payload = []
			this.pdf_config_rows.forEach((row, index) => {
				if (!row || row.key == null) {
					return
				}
				const catalog_opt = catalog_by_id[row.key]
				if (!catalog_opt) {
					return
				}
				payload.push({
					id: catalog_opt.id,
					name: catalog_opt.name,
					label: catalog_opt.label,
					value_resolver: catalog_opt.value_resolver,
					default_width: catalog_opt.default_width,
					pivot: {
						visible: this.as_bool(row.visible),
						order: index,
						width: Number(row.width || 0),
						wrap_content: this.as_bool(row.wrap_content),
						font_size: this.normalize_font_size(row.font_size),
						text_align: this.normalize_text_align(row.text_align),
					},
				})
			})

			/*
				Se anota la firma ANTES de escribir: el watcher de model.pdf_column_options la reconoce
				y no rearma las filas por este cambio. Si el modelo ya tiene lo mismo, no se escribe.
			*/
			const firma = this.firma_de_opciones(payload)
			this.firma_sincronizada = firma
			if (firma === this.firma_de_opciones(this.model.pdf_column_options)) {
				return
			}
			this.$set(this.model, 'pdf_column_options', payload)
		},
		/**
		 * Abre el diseñador de PDF para el perfil actual (venta, presupuesto o pedido online).
		 *
		 * @return {void}
		 */
		abrir_disenador_de_pdf() {
			if (this.$refs.disenador_de_pdf) {
				this.$refs.disenador_de_pdf.abrir()
			}
		},
		/**
		 * Abre el diseñador del encabezado del catálogo (perfiles de artículo).
		 *
		 * @return {void}
		 */
		open_catalog_header_designer() {
			if (this.$refs.catalog_header_designer) {
				this.$refs.catalog_header_designer.open()
			}
		},
	},
}
</script>

<style lang="sass" scoped>
.pdf-column-profile-editor
	width: 100%
	max-width: 100%

</style>
