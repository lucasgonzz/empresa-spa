<template>
	<div>

		<!--
			Resumen del reporte: solo se muestra si ya hay un reporte calculado (evita "0 articulos"
			que seria informacion falsa).

			Vocabulario de chips del sistema (src/sass/_chips_totales.sass, el mismo de Ventas, Cajas
			y Comprobantes): antes era una `custom-card` con cuatro filas de etiqueta-valor apiladas,
			que en esta seccion competia con la tabla en vez de resumirla. Los chips envuelven solos,
			asi que en telefono se acomodan sin desbordar.
		-->
		<div
		v-if="inventory_performance"
		class="stock-minimo-resumen m-b-15">

			<div class="totales-chip totales-chip--principal">
				<div class="totales-chip__icon-wrap">
					<i class="bi bi-box-seam" aria-hidden="true"></i>
				</div>
				<div class="totales-chip__body">
					<span class="totales-chip__label">Bajo el mínimo</span>
					<span class="totales-chip__value">{{ numero_es(inventory_performance.stock_minimo) }}</span>
				</div>
			</div>

			<div class="totales-chip">
				<div class="totales-chip__icon-wrap">
					<i class="bi bi-dash-circle" aria-hidden="true"></i>
				</div>
				<div class="totales-chip__body">
					<span class="totales-chip__label">Sin stock</span>
					<span class="totales-chip__value">{{ numero_es(inventory_performance.sin_stock) }}</span>
				</div>
			</div>

			<!--
				El chip de stock negativo solo toma el acento de alerta cuando hay alguno: en cero es
				un dato mas y no tiene que gritar. La aclaracion de por que puede pasar acompana al
				chip como meta, y tambien solo si hay alguno.
			-->
			<div
			class="totales-chip"
			:class="{ 'totales-chip--negativo': inventory_performance.stock_negativo > 0 }">
				<div class="totales-chip__icon-wrap">
					<i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
				</div>
				<div class="totales-chip__body">
					<span class="totales-chip__label">Con stock negativo</span>
					<span class="totales-chip__value">{{ numero_es(inventory_performance.stock_negativo) }}</span>
					<span
					v-if="inventory_performance.stock_negativo > 0"
					class="totales-chip__meta">
						Suele ser una venta sin ingreso registrado, o un error de carga
					</span>
				</div>
			</div>

			<div class="totales-chip">
				<div class="totales-chip__icon-wrap">
					<i class="bi bi-cash-stack" aria-hidden="true"></i>
				</div>
				<div class="totales-chip__body">
					<span class="totales-chip__label">Costo de reposición</span>
					<span class="totales-chip__value">{{ price(inventory_performance.costo_reposicion_stock_minimo) }}</span>
					<!-- La aclaracion vive en el chip al que se refiere, no suelta al pie de la tarjeta. -->
					<span class="totales-chip__meta">
						Lo que costaría comprar lo que falta para llegar al mínimo, sin los artículos sin costo cargado
					</span>
				</div>
			</div>

		</div>

		<!--
			Aviso de regeneracion en background: el reporte sigue vigente, no se oculta la tabla.
			Mismo tratamiento que en el modal de inventario (mision 36): nota discreta con icono chico
			al lado del texto, en vez del cartel azul con el icono de 4em de la clase de textos vieja.
		-->
		<div
		v-if="inventory_performance && inventory_performance_generating"
		class="stock-minimo-aviso">
			<i class="bi bi-arrow-repeat stock-minimo-aviso__icono" aria-hidden="true"></i>
			<span>
				Estamos actualizando el reporte de inventario. Los datos de abajo van a refrescarse solos apenas termine.
			</span>
		</div>

		<!--
			Buscador + columnas configurables: solo tiene sentido si ya hay reporte.
			El buscador toma la metrica del sistema (--toolbar-control-h y el radio de la barra) y deja
			de ocupar el ancho completo de la pantalla; el boton de columnas queda a su lado, en la
			misma fila.
		-->
		<div
		v-if="inventory_performance"
		class="stock-minimo-barra m-b-10">

			<div class="stock-minimo-search">
				<i class="bi bi-search stock-minimo-search__lupa" aria-hidden="true"></i>
				<b-form-input
				v-model="search_input"
				@input="on_search_input"
				placeholder="Buscar por nombre, codigo de barras o codigo de proveedor"></b-form-input>
			</div>

			<props-to-show
			model_name="inventory_performance"></props-to-show>
		</div>

		<!-- Caso 1: todavia no hay ningun reporte generado (ni siquiera uno viejo) y se esta calculando el primero -->
		<empty-state
		v-if="sin_reporte_generando"
		icon_class="bi bi-hourglass-split"
		title="Estamos calculando el reporte de inventario"
		hint="Los datos van a aparecer solos en unos minutos, sin que tengas que recargar."></empty-state>

		<!--
			Caso 2: hay reporte pero la pagina actual vino vacia. Son dos situaciones distintas y por
			eso cambian el icono, el titulo y la pista: no encontrar nada buscando no es lo mismo que
			no tener ningun articulo bajo el minimo, que ademas es una buena noticia.
		-->
		<empty-state
		v-else-if="sin_resultados"
		:icon_class="hay_busqueda_activa ? 'bi bi-search' : 'bi bi-check2-circle'"
		:title="hay_busqueda_activa ? 'Ningún artículo coincide con la búsqueda' : 'No hay artículos con stock mínimo'"
		:hint="hay_busqueda_activa ? 'Probá con otro nombre, código de barras o código de proveedor.' : 'Ningún artículo está por debajo del mínimo que tenés configurado.'"></empty-state>

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
		EmptyState: () => import('@/common-vue/components/display/EmptyState'),
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
<style scoped lang="sass">
// Estilos propios de la seccion de stock minimo (mision 38). Van `scoped` a proposito: el
// vocabulario compartido --el chip-- vive en src/sass/_chips_totales.sass y NO se toca desde aca;
// lo de este bloque es solo como se acomodan las piezas en esta seccion.
//
// Todos los valores salen de tokens (--toolbar-control-h, --toolbar-btn-radius, --color-border,
// --bg-card, --bg-section, --color-text-secondary): un hexadecimal fijo deja la seccion blanca en
// modo oscuro, que es justo lo que le pasaba al cartel azul que esta mision viene a sacar.

// --- Resumen en chips -------------------------------------------------------------------------
// Antes era una `custom-card` con las cuatro filas apiladas. Ahora es una fila de chips que
// envuelve sola: en telefono se acomodan en dos o cuatro renglones sin desbordar.
.stock-minimo-resumen
	display: flex
	flex-direction: row
	flex-wrap: wrap
	gap: var(--toolbar-btn-gap)

	// 🔴 El meta de los chips es `white-space: nowrap` en el vocabulario compartido, donde son textos
	// cortos ("3 ventas", "USD"). Acá son dos frases explicativas, y medido en telefono (375px) el
	// chip de costo de reposicion se salia de la pantalla: `document.body.scrollWidth` daba mas que
	// `window.innerWidth`. Se deja envolver SOLO en esta seccion en vez de tocar _chips_totales.sass,
	// que lo comparten Ventas, Cajas y Comprobantes: ahi el nowrap esta bien y no es problema de ellos.
	::v-deep .totales-chip__meta
		white-space: normal

	// El chip de stock negativo con datos: mismo acento de alerta que el resto del sistema usa para
	// un numero que hay que mirar. En cero se queda neutro, porque no hay nada que senalar.
	::v-deep .totales-chip--negativo
		.totales-chip__icon-wrap
			background: var(--totales-acento-principal-bg)
			color: var(--totales-acento-principal)

		.totales-chip__value
			color: var(--totales-acento-principal)

// --- Aviso de regeneracion --------------------------------------------------------------------
// Mismo tratamiento que el aviso del modal de inventario (mision 36): nota discreta con el icono
// chico al lado del texto. Alla vive anidado bajo el id del modal, asi que no se puede reusar la
// clase desde aca sin sacarla a un partial compartido --y eso toca un archivo fuera del alcance de
// esta mision--. Se copia el LENGUAJE (tokens, no valores sueltos), no el archivo. Queda anotado
// como deuda en el informe.
.stock-minimo-aviso
	display: flex
	flex-direction: row
	align-items: flex-start
	gap: 8px
	margin: 0 0 14px
	padding: 8px 12px
	border-radius: var(--toolbar-btn-radius)
	border: 1px solid var(--color-border)
	background: var(--bg-section)
	font-size: 0.8125rem
	line-height: 1.35
	color: var(--color-text-secondary)

	&__icono
		flex-shrink: 0
		// El icono acompana a la PRIMERA linea del texto: con align-items: flex-start y el mismo
		// line-height que el parrafo queda a su altura, en vez de flotar en el medio cuando el
		// texto entra en dos renglones, que es lo que pasa en telefono.
		line-height: 1.35
		animation: stock-minimo-aviso-girar 1.6s linear infinite

// --- Barra: buscador + boton de columnas ------------------------------------------------------
.stock-minimo-barra
	display: flex
	flex-direction: row
	align-items: center
	flex-wrap: wrap
	gap: var(--toolbar-btn-gap)

.stock-minimo-search
	position: relative
	display: flex
	align-items: center
	// Deja de ocupar el ancho completo de la pantalla --que es lo que hacia un b-form-input suelto,
	// que es width: 100%-- pero sigue siendo el control mas ancho de la fila y se achica solo
	// cuando no entra.
	flex: 1 1 320px
	max-width: 420px
	min-width: 0

	&__lupa
		position: absolute
		left: 12px
		font-size: 0.875rem
		color: var(--color-text-secondary)
		pointer-events: none

	::v-deep input.form-control
		// Metrica del sistema: la misma altura que todo lo que vive en una barra, y el radio del
		// pill del buscador general, que es altura / 2.
		height: var(--toolbar-control-h)
		border-radius: calc(var(--toolbar-control-h) / 2)
		padding-left: 34px
		padding-right: 12px
		font-size: 0.875rem
		box-shadow: var(--toolbar-btn-shadow)

@keyframes stock-minimo-aviso-girar
	from
		transform: rotate(0deg)
	to
		transform: rotate(360deg)

// Quien pidio menos movimiento en su sistema operativo ve la nota quieta: el aviso no depende de
// la animacion para entenderse.
@media (prefers-reduced-motion: reduce)
	.stock-minimo-aviso__icono
		animation: none
</style>
