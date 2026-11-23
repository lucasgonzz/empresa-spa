<template>
<div>

	<!-- Carga: el indicador global ya avisa; acá queda el esqueleto de la tabla -->
	<b-skeleton-table
	v-if="loading"
	class="s-2 b-r-1 animate__animated animate__fadeIn"
	:rows="5"
	:columns="4"
	:table-props="{ bordered: true, striped: true }"
	></b-skeleton-table>

	<div
	v-else-if="items.length">

		<p class="text-muted">
			A qué costo tuvo este artículo cada proveedor cada vez que lo encontramos en una importación o en una compra, y qué hizo ese precio con tu artículo.
		</p>

		<!-- Filtro por proveedor: sólo si hay más de uno en el historial -->
		<b-form-select
		v-if="provider_options.length > 2"
		v-model="provider_filter"
		size="sm"
		class="m-b-10"
		:options="provider_options"></b-form-select>

		<b-table
		head-variant="dark"
		class="s-2 b-r-1 animate__animated animate__fadeIn"
		responsive
		stacked="sm"
		table-class="offer-history-table"
		:fields="fields"
		:items="items"
		:tbody-tr-class="row_class">

			<!-- Fecha, y cuándo se volvió a ver el mismo precio -->
			<template #cell(fecha)="data">
				<div>{{ data.item.fecha_texto }}</div>
				<small
				v-if="data.item.visto_texto"
				class="text-muted">
					{{ data.item.visto_texto }}
				</small>
			</template>

			<!-- Qué hizo ese precio con el artículo -->
			<template #cell(uso)="data">

				<!-- Fila anterior a esta versión: no se sabe qué hizo -->
				<span
				v-if="data.item.uso_desconocido"
				class="text-muted">
					Registro anterior a esta versión
				</span>

				<!-- No tocó el costo: "Sólo se registró el precio" o, si cambió el proveedor, "No cambió el costo" -->
				<div v-else-if="!data.item.uso_costo">
					<span>{{ data.item.sin_costo_texto }}</span>
					<small
					v-if="data.item.sin_costo_detalle"
					class="d-block text-muted">
						{{ data.item.sin_costo_detalle }}
					</small>
					<!-- Si el artículo cambió de proveedor y eso movió precios, también se puede ir a ver el cambio -->
					<b-button
					v-if="data.item.price_change_id"
					size="sm"
					variant="outline-primary"
					class="offer-history-link"
					@click="ver_cambio_de_precio(data.item)">Ver cambio de precio</b-button>
				</div>

				<!-- Actualizó el costo del artículo -->
				<div v-else>
					<span>{{ data.item.costo_texto }}</span>
					<small
					v-if="data.item.proveedor_texto"
					class="d-block text-muted">
						{{ data.item.proveedor_texto }}
					</small>
					<b-button
					v-if="data.item.price_change_id"
					size="sm"
					variant="outline-primary"
					class="offer-history-link"
					@click="ver_cambio_de_precio(data.item)">Ver cambio de precio</b-button>
					<small
					v-else
					class="d-block text-muted">
						los precios de venta no cambiaron
					</small>
				</div>

			</template>
		</b-table>
	</div>

	<p
	v-else
	class="text-with-icon">
		<i class="icon-eye-slash"></i>
		Todavía no hay historial de precios por proveedor para este artículo.
	</p>

</div>
</template>
<script>
/**
 * Pestaña "Historial de precios" del modal de proveedores del artículo (misión
 * historial-precios-proveedor). Muestra, por proveedor, a qué costo tuvo el artículo cada vez que una
 * importación o una compra lo encontró (GET provider-price-offer/article/{id}) y qué hizo ese precio:
 * sólo se registró, o actualizó el costo (y si el artículo cambió de proveedor, y qué cambio de precio
 * provocó, con el botón para ir a verlo).
 *
 * Contra una API vieja (sin el endpoint) el pedido da 404: se muestra el texto vacío, sin avisos.
 */
export default {
	props: {
		// Oferta a destacar al abrir (cuando se llega desde "Cambios de precios"); null = ninguna.
		initial_highlight_id: {
			default: null,
		},
	},
	data() {
		return {
			// True mientras se pide el historial.
			loading: false,
			// Ofertas tal como las devuelve la API (más nuevas primero).
			offers: [],
			// False si el usuario no tiene el permiso de costos: la API omite los importes.
			can_see_cost: true,
			// Proveedor elegido en el filtro (null = todos).
			provider_filter: null,
			// Id de la oferta destacada (null = ninguna).
			highlighted_offer_id: this.initial_highlight_id,
			// Timer del próximo reintento del scroll a la fila destacada (null = ninguno) y cuántos intentos van.
			scroll_timer: null,
			scroll_attempts: 0,
			// Instante (ms) hasta el cual, tras bv::modal::shown, el chequeo sigue vivo aunque la fila ya se
			// vea: bootstrap-vue puede pisar el scroll con focusFirst() un rato después de shown. 0 = sin ventana.
			settle_until: 0,
		}
	},
	computed: {
		// Artículo abierto en el modal.
		article() {
			return this.$store.state.article.model
		},
		// Columnas de la tabla; sin permiso de costos no hay columna de costo. Cada una lleva un ancho
		// mínimo (thStyle) para que en tablet la tabla scrollee dentro del modal en vez de comprimirse, y
		// fecha y costo llevan la clase que impide partir fechas e importes (tdClass).
		fields() {
			let fields = [
				{ key: 'fecha', label: 'Fecha', thStyle: { minWidth: '120px' }, tdClass: 'offer-history-nowrap' },
				{ key: 'provider_name', label: 'Proveedor', thStyle: { minWidth: '140px' } },
				{ key: 'provider_code', label: 'Código', thStyle: { minWidth: '100px' } },
			]
			if (this.can_see_cost) {
				fields.push({ key: 'costo', label: 'Costo', thStyle: { minWidth: '110px' }, tdClass: 'offer-history-nowrap' })
			}
			fields.push({ key: 'origen', label: 'Origen', thStyle: { minWidth: '170px' } })
			fields.push({ key: 'uso', label: 'Qué hizo', thStyle: { minWidth: '240px' } })
			return fields
		},
		// Opciones del filtro: "Todos" y cada proveedor presente en el historial (sin repetir).
		provider_options() {
			let options = [{ value: null, text: 'Todos los proveedores' }]
			let vistos = {}
			this.offers.forEach(offer => {
				if (!vistos[offer.provider_id]) {
					vistos[offer.provider_id] = true
					options.push({ value: offer.provider_id, text: offer.provider_name || 'Proveedor eliminado' })
				}
			})
			return options
		},
		// Filas de la tabla: las ofertas del filtro, con los textos ya armados.
		items() {
			let items = []
			this.offers.forEach(offer => {
				if (this.provider_filter !== null && offer.provider_id !== this.provider_filter) {
					return
				}
				items.push(this.build_item(offer))
			})
			return items
		},
	},
	created() {
		this.$root.$on('provider-offers:highlight', this.set_highlight)
		// Cuando el modal termina de pintarse hay que reintentar el scroll a la fila destacada.
		this.$root.$on('bv::modal::shown', this.on_modal_shown)
		this.load_history()
	},
	beforeDestroy() {
		this.$root.$off('provider-offers:highlight', this.set_highlight)
		this.$root.$off('bv::modal::shown', this.on_modal_shown)
		this.cancel_scroll_retry()
	},
	methods: {
		/**
		 * Pide el historial del artículo. Con éxito guarda las ofertas; ante un 404 (API sin el
		 * endpoint) o cualquier otro error queda la lista vacía y el texto "Todavía no hay historial".
		 * El pedido va con skip_global_error_event para que el aviso no salga dos veces: un 404 no avisa
		 * nada y cualquier otro error avisa una sola vez con el toast propio. El indicador global de
		 * carga se apaga en .then y en .catch.
		 * @return {void}
		 */
		load_history() {
			if (!this.article || !this.article.id) {
				return
			}
			let self = this
			self.loading = true
			self.$store.commit('auth/setMessage', 'Cargando el historial de precios por proveedor')
			self.$store.commit('auth/setLoading', true)
			// skip_global_error_event: el interceptor de main.js no avisa ni dispara el evento de error; el
			// catch de abajo decide (404 de una API vieja = vacío sin aviso, otro error = un solo aviso).
			self.$api.get('provider-price-offer/article/' + self.article.id, { skip_global_error_event: true })
			.then(function(res) {
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				self.loading = false
				let data = res && res.data ? res.data : {}
				self.offers = Array.isArray(data.models) ? data.models : []
				self.can_see_cost = data.can_see_cost !== false
				// Los datos llegan de forma asíncrona: recién ahora existe la fila destacada.
				self.scroll_to_highlight()
			})
			.catch(function(err) {
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				self.loading = false
				self.offers = []
				let status = err && err.response ? err.response.status : null
				if (status !== 404) {
					self.$toast.error('No se pudo cargar el historial de precios por proveedor')
				}
			})
		},
		/**
		 * Marca una oferta como destacada (evento 'provider-offers:highlight' del modal de cambios
		 * de precios). Si el filtro la esconde, se vuelve a "Todos".
		 * @param {Number} offer_id Id de la oferta.
		 * @return {void}
		 */
		set_highlight(offer_id) {
			this.highlighted_offer_id = offer_id
			this.provider_filter = null
			this.scroll_to_highlight()
		},
		/**
		 * Evento 'bv::modal::shown' de bootstrap-vue: el modal ya está pintado y con su tamaño final.
		 * Si es el modal de proveedores del artículo, reintenta llegar a la fila destacada; como bootstrap-vue
		 * vuelve el scroll a 0 justo después de este evento, el reintento acotado lo corrige.
		 * @param {Object} bv_event Evento de bootstrap-vue (no se usa).
		 * @param {String} modal_id Id del modal que se mostró.
		 * @return {void}
		 */
		on_modal_shown(bv_event, modal_id) {
			if (modal_id === 'article-providers') {
				// Ventana acotada de asentamiento (800 ms): ver try_scroll_to_highlight.
				this.settle_until = Date.now() + 800
				this.scroll_to_highlight()
			}
		},
		/**
		 * Lleva la vista hasta la fila destacada (la oferta a la que se llegó desde "Cambios de
		 * precios"), con reintentos acotados. Se llama cuando cambia el destacado, cuando llegan los
		 * datos del servidor y cuando el modal termina de mostrarse. Reinicia la cuenta de intentos y
		 * arranca el primero en el siguiente ciclo de render.
		 * @return {void}
		 */
		scroll_to_highlight() {
			this.cancel_scroll_retry()
			this.scroll_attempts = 0
			this.$nextTick(this.try_scroll_to_highlight)
		},
		/**
		 * Un intento de llevar la vista a la fila destacada. bootstrap-vue pisa el scroll: después de
		 * emitir shown, focusFirst() deja modal.scrollTop = 0. Por eso, mientras la fila no esté a la
		 * vista y queden intentos, se vuelve a intentar cada pocos milisegundos; apenas la fila está a la
		 * vista termina (no se le roba el scroll al usuario). Sin destacada o sin fila todavía, no scrollea.
		 * scrollIntoView mueve el contenedor con scroll más cercano (el propio modal).
		 * @return {void}
		 */
		try_scroll_to_highlight() {
			this.scroll_timer = null
			if (this.highlighted_offer_id === null || typeof this.highlighted_offer_id == 'undefined') {
				return
			}
			if (!this.$el || typeof this.$el.querySelector != 'function') {
				return
			}
			// Fila marcada por row_class.
			let row = this.$el.querySelector('.offer-history-row--highlight')
			if (row) {
				if (this.is_row_in_view(row)) {
					// A la vista: se corta, salvo dentro de la ventana posterior a shown, donde se sigue
					// vigilando por si focusFirst() de bootstrap-vue la saca de vista. Pasada la ventana
					// no se le pelea el scroll al usuario.
					if (Date.now() >= this.settle_until) {
						return
					}
				} else if (typeof row.scrollIntoView == 'function') {
					row.scrollIntoView({ block: 'center', behavior: 'auto' })
				}
			}
			this.scroll_attempts++
			if (this.scroll_attempts < 15) {
				this.scroll_timer = setTimeout(this.try_scroll_to_highlight, 150)
			}
		},
		/**
		 * True si la fila está completa dentro de la pantalla. Sin medidas (no hay getBoundingClientRect
		 * o window) se asume que no se ve, y se scrollea.
		 * @param {Object} row Elemento de la fila.
		 * @return {Boolean}
		 */
		is_row_in_view(row) {
			if (typeof row.getBoundingClientRect != 'function' || typeof window == 'undefined') {
				return false
			}
			let rect = row.getBoundingClientRect()
			return rect.top >= 0 && rect.bottom <= window.innerHeight
		},
		/**
		 * Corta el reintento pendiente del scroll, si lo hay.
		 * @return {void}
		 */
		cancel_scroll_retry() {
			if (this.scroll_timer) {
				clearTimeout(this.scroll_timer)
				this.scroll_timer = null
			}
		},
		/**
		 * Clase de cada fila de la tabla: la destacada lleva un marco.
		 * @param {Object} item Fila de la tabla.
		 * @return {String}
		 */
		row_class(item) {
			return item && item.id === this.highlighted_offer_id ? 'offer-history-row--highlight' : ''
		},
		/**
		 * Va al cambio de precio que provocó la oferta: avisa cuál destacar y abre el modal de
		 * cambios de precios (cerrando éste, para no apilar modales).
		 * @param {Object} item Fila de la tabla con price_change_id.
		 * @return {void}
		 */
		ver_cambio_de_precio(item) {
			this.$root.$emit('price-changes:highlight', item.price_change_id)
			this.$bvModal.hide('article-providers')
			this.$bvModal.show('price-changes')
		},
		/**
		 * Importe con el símbolo de su moneda; vacío si no hay importe (sin permiso de costos).
		 * @param {Number|null} value Importe.
		 * @param {Number} currency_id Moneda de la oferta (2 = dólares).
		 * @return {String}
		 */
		money(value, currency_id) {
			if (value === null || typeof value == 'undefined') {
				return ''
			}
			return (Number(currency_id) === 2 ? 'US' : '') + this.price(value, false)
		},
		/**
		 * Día y mes de una fecha 'AAAA-MM-DD ...' como 'dd/mm'.
		 * @param {String} value Fecha.
		 * @return {String}
		 */
		short_date(value) {
			let parts = String(value || '').slice(0, 10).split('-')
			return parts.length === 3 ? parts[2] + '/' + parts[1] : ''
		},
		/**
		 * Rótulo del origen de la oferta: el que arma la API ("Importación del 21/11/2026",
		 * "Compra N° 12") o, si no vino, uno genérico según el origen.
		 * @param {Object} offer Oferta de la API.
		 * @return {String}
		 */
		origin_label(offer) {
			if (offer.reference_label) {
				return offer.reference_label
			}
			let names = { importacion: 'Importación', compra: 'Compra', manual: 'Carga manual' }
			return names[offer.origen] || 'Dato rescatado'
		},
		/**
		 * Arma la fila de la tabla: textos del costo, del uso y del titular, y los datos para el vínculo.
		 * @param {Object} offer Oferta de la API.
		 * @return {Object} Fila para b-table.
		 */
		build_item(offer) {
			let costo_nuevo = this.money(offer.cost, offer.moneda_id)
			let costo_anterior = this.money(offer.previous_article_cost, offer.moneda_id)
			// Titular del artículo antes de la operación, si es otro proveedor que el de la oferta.
			let titular_distinto = offer.previous_article_provider_name && offer.previous_article_provider_id !== offer.provider_id
				? offer.previous_article_provider_name
				: ''
			let uso_costo = Number(offer.updated_article_cost) === 1

			// "Actualizó el costo: $1.000 → $1.200"; sin permiso de costos no hay importes.
			let costo_texto = 'Actualizó el costo'
			if (costo_anterior && costo_nuevo) {
				costo_texto += ': ' + costo_anterior + ' → ' + costo_nuevo
			} else if (costo_nuevo) {
				costo_texto += ' a ' + costo_nuevo
			}

			// Qué pasó con el proveedor del artículo.
			let proveedor_texto = ''
			if (Number(offer.changed_article_provider) === 1) {
				proveedor_texto = 'el artículo pasó a ser de ' + (offer.provider_name || 'este proveedor')
			} else if (titular_distinto) {
				proveedor_texto = 'el artículo siguió siendo de ' + titular_distinto
			}

			// Sin tocar el costo hay dos verdades posibles: sólo se registró el precio (el artículo sigue
			// siendo de su titular) o el artículo pasó a ser de este proveedor igual (compra o importación
			// con "pasar al proveedor" y sin actualizar costos): ahí no hay que decir que "sólo" se registró.
			let sin_costo_texto = 'Sólo se registró el precio'
			let sin_costo_detalle = titular_distinto ? 'el artículo es de ' + titular_distinto : ''
			if (Number(offer.changed_article_provider) === 1) {
				sin_costo_texto = 'No cambió el costo'
				sin_costo_detalle = proveedor_texto
			}

			return {
				id: offer.id,
				fecha_texto: this.date(offer.fecha),
				visto_texto: offer.last_seen_at ? 'visto por última vez ' + this.short_date(offer.last_seen_at) : '',
				provider_name: offer.provider_name || 'Proveedor eliminado',
				provider_code: offer.provider_code || '-',
				costo: costo_nuevo,
				origen: this.origin_label(offer),
				// null o ausente = fila anterior a esta versión.
				uso_desconocido: offer.updated_article_cost === null || typeof offer.updated_article_cost == 'undefined',
				uso_costo: uso_costo,
				costo_texto: costo_texto,
				proveedor_texto: proveedor_texto,
				titular_texto: titular_distinto,
				sin_costo_texto: sin_costo_texto,
				sin_costo_detalle: sin_costo_detalle,
				// El cambio de precio sólo existe si usó el costo o si el artículo cambió de proveedor.
				price_change_id: (uso_costo || Number(offer.changed_article_provider) === 1) ? offer.price_change_id : null,
			}
		},
	},
}
</script>
<style lang="sass">
// Tablet y escritorio (la tabla no está apilada): fecha e importes no se parten. La regla general del
// modal (article-providers/Index.vue) parte cualquier palabra en cualquier punto; ésta la pisa
// con más especificidad sólo en las celdas de fecha y costo. Si no entran, scrollea el contenedor
// responsive de la tabla, dentro del modal.
@media (min-width: 576px)
	#article-providers .table.offer-history-table > tbody > tr > td.offer-history-nowrap
		white-space: nowrap
		overflow-wrap: normal
</style>
