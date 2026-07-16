<template>
	<div>

		<!-- Resumen del reporte: solo se muestra si ya hay un reporte calculado (evita "0 articulos" que seria informacion falsa) -->
		<div
		v-if="inventory_performance"
		class="custom-card m-b-15">
			<div class="header">
				Resumen de stock minimo
			</div>

			<div class="body">

				<div class="info">
					<p class="nombre">
						Articulos bajo el minimo
					</p>
					<p class="valor">
						{{ inventory_performance.stock_minimo }}
					</p>
				</div>

				<div class="info">
					<p class="nombre">
						Sin stock
					</p>
					<p class="valor">
						{{ inventory_performance.sin_stock }}
					</p>
				</div>

				<div
				class="info"
				:class="{ 'text-danger': inventory_performance.stock_negativo > 0 }">
					<p class="nombre">
						Con stock negativo
					</p>
					<p class="valor">
						{{ inventory_performance.stock_negativo }}
					</p>
				</div>

				<!-- Aclaracion sobre el stock negativo: solo tiene sentido mostrarla si hay al menos uno -->
				<div
				v-if="inventory_performance.stock_negativo > 0"
				class="info">
					<p class="aclaracion">
						Un stock negativo suele indicar ventas sin ingreso de mercaderia registrado o un error de carga
					</p>
				</div>

				<div class="info">
					<p class="nombre">
						Costo estimado de reposicion
					</p>
					<p class="valor">
						{{ price(inventory_performance.costo_reposicion_stock_minimo) }}
					</p>
				</div>

				<div class="info">
					<p class="aclaracion">
						Lo que costaria comprar lo que falta para llegar al minimo, sin contar los articulos sin costo cargado
					</p>
				</div>

			</div>
		</div>

		<!-- Aviso de regeneracion en background: el reporte sigue vigente, no se oculta la tabla -->
		<div
		v-if="inventory_performance && inventory_performance_generating"
		class="text-with-icon m-b-15">
			Estamos actualizando el reporte de inventario. Los datos de abajo van a refrescarse solos apenas termine.
			<i class="icon-refresh"></i>
		</div>

		<!-- Buscador + columnas configurables: solo tiene sentido si ya hay reporte -->
		<div
		v-if="inventory_performance"
		class="d-flex justify-content-between align-items-center flex-wrap m-b-10">

			<b-form-input
			v-model="search_input"
			@input="on_search_input"
			placeholder="Buscar por nombre, codigo de barras o codigo de proveedor"
			class="stock-minimo-search m-b-5"></b-form-input>

			<props-to-show
			model_name="inventory_performance"></props-to-show>
		</div>

		<!-- Caso 1: todavia no hay ningun reporte generado (ni siquiera uno viejo) y se esta calculando el primero -->
		<div
		v-if="sin_reporte_generando"
		class="text-with-icon">
			Estamos calculando el reporte de inventario. Los datos van a aparecer solos en unos minutos.
			<i class="icon-eye-slash"></i>
		</div>

		<!-- Caso 2: hay reporte pero la pagina actual vino vacia (sin stock minimo, o sin coincidencias de busqueda) -->
		<div
		v-else-if="sin_resultados"
		class="text-with-icon">
			{{ hay_busqueda_activa ? 'Ningun articulo coincide con la busqueda' : 'No hay articulos con stock minimo' }}
			<i class="icon-eye-slash"></i>
		</div>

		<!-- Caso 3: hay reporte y filas para mostrar -->
		<template v-else-if="inventory_performance">

			<!-- Spinner de carga: se muestra arriba de la tabla sin ocultar las filas de la pagina anterior -->
			<div
			v-if="loading_articles"
			class="d-flex justify-content-center m-b-10">
				<span class="spinner-border spinner-border-sm text-primary" aria-hidden="true"></span>
			</div>

			<b-table
			:key="fields_signature"
			head-variant="dark"
			responsive
			:fields="fields"
			:items="table_items">
				<!-- Columnas de tipo imagen: slot dinamico por cada una elegida por el usuario -->
				<template
				v-for="prop in image_fields"
				v-slot:[cell_slot_name(prop.key)]="data">
					<table-thumbnail-images
					:key="'thumb-'+articles_stock_minimo[data.index].id+'-'+prop.key"
					:model="resolve_pivot_model(articles_stock_minimo[data.index], prop)"
					:prop="prop"></table-thumbnail-images>
				</template>
			</b-table>

			<b-pagination
			v-if="total_stock_minimo > per_page"
			v-model="current_page"
			pills
			:total-rows="total_stock_minimo"
			:per-page="per_page"
			:disabled="loading_articles"></b-pagination>

		</template>

	</div>

</template>
<script>
import inventory_performance from '@/mixins/inventory_performance'
export default {
	mixins: [inventory_performance],
	components: {
		PropsToShow: () => import('@/common-vue/components/view/header/props-to-show/Index'),
		TableThumbnailImages: () => import('@/common-vue/components/display/table/TableThumbnailImages'),
	},
	data() {
		return {
			// Texto tipeado en el buscador. Vive local hasta que el debounce lo confirma contra
			// el store: evita disparar una request al backend por cada tecla presionada.
			search_input: this.$store.state.inventory_performance.search,
			// Timer del debounce del buscador (se reinicia en cada tecla).
			search_debounce_timer: null,
		}
	},
	created() {
		// Pide la pagina actual de articulos bajo el minimo (el reporte de contadores ya lo
		// pide quien contenga a este componente: modal de inicio, modulo de Alertas o modal de Inventario).
		this.fetch_articles()
	},
	computed: {
		/**
		 * Pagina actual de articulos con stock minimo (ya no la lista completa: viene paginada
		 * desde el backend a partir del prompt 393/394).
		 *
		 * @returns {Array}
		 */
		articles_stock_minimo() {
			return this.$store.state.inventory_performance.articles_stock_minimo
		},
		/**
		 * true mientras se esta pidiendo la pagina actual al backend.
		 *
		 * @returns {Boolean}
		 */
		loading_articles() {
			return this.$store.state.inventory_performance.loading_articles
		},
		/**
		 * Total real de articulos bajo el minimo (para la paginacion), no la cantidad de filas de esta pagina.
		 *
		 * @returns {Number}
		 */
		total_stock_minimo() {
			return this.$store.state.inventory_performance.total_stock_minimo
		},
		/**
		 * Cantidad de filas por pagina configurada en el store.
		 *
		 * @returns {Number}
		 */
		per_page() {
			return this.$store.state.inventory_performance.per_page
		},
		/**
		 * Pagina solicitada al backend. Al cambiarla (b-pagination) vuelve a pedir la pagina nueva.
		 */
		current_page: {
			get() {
				return this.$store.state.inventory_performance.page
			},
			set(value) {
				this.$store.commit('inventory_performance/set_page', value)
				this.fetch_articles()
			},
		},
		/**
		 * true si hay un texto de busqueda aplicado (para diferenciar el mensaje de "vacio").
		 *
		 * @returns {Boolean}
		 */
		hay_busqueda_activa() {
			return !!this.$store.state.inventory_performance.search
		},
		/**
		 * Caso "todavia no hay ningun reporte": se esta generando el primero en background y no
		 * hay ningun dato previo para mostrar (ni tabla ni resumen).
		 *
		 * @returns {Boolean}
		 */
		sin_reporte_generando() {
			return this.inventory_performance_generating && !this.inventory_performance
		},
		/**
		 * Caso "hay reporte pero la pagina actual vino vacia": ya sea porque no hay articulos
		 * bajo el minimo, o porque la busqueda aplicada no encontro coincidencias.
		 *
		 * @returns {Boolean}
		 */
		sin_resultados() {
			return !!this.inventory_performance && !this.loading_articles && !this.articles_stock_minimo.length
		},
		/**
		 * Columnas configurables (props_to_show del store), ya resueltas por el usuario
		 * (orden, visibilidad, ancho, salto de linea). No hay columnas fijas en este modulo
		 * — es una tabla de solo lectura, sin edicion ni acciones por fila.
		 *
		 * @returns {Array}
		 */
		dynamic_fields() {
			return this.$store.state.inventory_performance.props_to_show || []
		},
		fields() {
			let self = this
			let fields = []

			this.dynamic_fields.forEach(function (prop) {
				fields.push({
					key: prop.key,
					label: self.propText(prop, true, true),
					tdClass: prop.table_wrap_content ? '' : 'text-nowrap',
					thStyle: prop.table_width ? { minWidth: prop.table_width + 'px' } : {},
				})
			})

			return fields
		},
		/**
		 * Firma de la configuracion de columnas (key + ancho + salto de linea) usada como :key
		 * del b-table. BootstrapVue no siempre recalcula el layout de columnas cuando solo
		 * cambian propiedades internas de `fields` (ej. thStyle) sin que cambie la instancia del
		 * componente — forzar el remount con este key es lo que hace que el ancho se vea
		 * actualizado apenas se guarda, sin necesidad de recargar la pagina.
		 *
		 * @returns {string}
		 */
		fields_signature() {
			return this.fields
				.map(function (field) {
					let width = field.thStyle && field.thStyle.minWidth ? field.thStyle.minWidth : ''
					return field.key + ':' + width + ':' + (field.tdClass || '')
				})
				.join('|')
		},
		/**
		 * Subconjunto de dynamic_fields de tipo imagen: necesitan el slot dedicado
		 * (table-thumbnail-images) en vez de texto plano vía propertyText.
		 *
		 * @returns {Array}
		 */
		image_fields() {
			return this.dynamic_fields.filter(prop => this.isImageProp(prop))
		},
		/**
		 * Filas para b-table: valor de cada columna resuelto con propertyText (relaciones,
		 * fechas, booleanos, etc.) — mismo mecanismo que usa cualquier tabla ABM del sistema.
		 * Las columnas de imagen quedan sin resolver aca (las resuelve el slot dedicado).
		 *
		 * @returns {Array}
		 */
		table_items() {
			let self = this
			let items = []

			this.articles_stock_minimo.forEach(function (article) {
				let computed_item = {}

				self.dynamic_fields.forEach(function (prop) {
					if (self.isImageProp(prop)) {
						return
					}
					let model = self.resolve_pivot_model(article, prop)
					computed_item[prop.key] = self.propertyText(model, prop)
				})

				items.push(computed_item)
			})

			return items
		},
	},
	methods: {
		/**
		 * Pide al backend la pagina actual de articulos bajo el minimo (page/per_page/search
		 * salen del store del modulo).
		 *
		 * @returns {Promise}
		 */
		fetch_articles() {
			return this.$store.dispatch('inventory_performance/get_articles_stock_minimo')
		},
		/**
		 * Maneja cada tecla del buscador con debounce (~400ms): recien despues de esa pausa
		 * confirma el texto contra el store, vuelve a la pagina 1 y pide de nuevo.
		 */
		on_search_input() {
			clearTimeout(this.search_debounce_timer)
			this.search_debounce_timer = setTimeout(() => {
				this.$store.commit('inventory_performance/set_search', this.search_input)
				this.$store.commit('inventory_performance/set_page', 1)
				this.fetch_articles()
			}, 400)
		},
		/**
		 * Resuelve si una propiedad debe leerse del pivot (depósito/stock del depósito) o
		 * del articulo directamente.
		 *
		 * @param {Object} article
		 * @param {Object} prop
		 * @returns {Object}
		 */
		resolve_pivot_model(article, prop) {
			if (prop.from_pivot) {
				return article.pivot || {}
			}
			return article
		},
		/**
		 * Nombre de slot dinamico de b-table para una columna de imagen configurable.
		 *
		 * @param {string} key
		 * @returns {string}
		 */
		cell_slot_name(key) {
			return 'cell(' + key + ')'
		},
	},
	watch: {
		/**
		 * Cuando llega un reporte nuevo (broadcast del job en background, escuchado por quien
		 * contenga a este componente), se vuelve a pedir la pagina actual para reflejar los
		 * numeros recalculados sin esperar a que el usuario cambie de pagina.
		 */
		'inventory_performance.created_at'() {
			this.fetch_articles()
		},
	},
}
</script>
