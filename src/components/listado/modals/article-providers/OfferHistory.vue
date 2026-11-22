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
		}
	},
	computed: {
		// Artículo abierto en el modal.
		article() {
			return this.$store.state.article.model
		},
		// Columnas de la tabla; sin permiso de costos no hay columna de costo.
		fields() {
			let fields = [
				{ key: 'fecha', label: 'Fecha' },
				{ key: 'provider_name', label: 'Proveedor' },
				{ key: 'provider_code', label: 'Código' },
			]
			if (this.can_see_cost) {
				fields.push({ key: 'costo', label: 'Costo' })
			}
			fields.push({ key: 'origen', label: 'Origen' })
			fields.push({ key: 'uso', label: 'Qué hizo' })
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
		this.load_history()
	},
	beforeDestroy() {
		this.$root.$off('provider-offers:highlight', this.set_highlight)
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
				price_change_id: uso_costo ? offer.price_change_id : null,
			}
		},
	},
}
</script>
