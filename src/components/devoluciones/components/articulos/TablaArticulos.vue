<template>
	<!--
		Renglones a devolver. Tabla escrita a mano (no b-table) para controlar cada celda y que los
		inputs queden compactos y alineados a la derecha. En pantallas angostas scrollea en
		horizontal ADENTRO de su contenedor: la página nunca se ensancha.

		🔴 Los data-testid de venta se conservan con la misma forma que leen los specs
		(circuito-devolucion-afip.spec.js):
		- `devolucion-item-precio-<id>` en el <input> del precio (se lee con inputValue(), así que
			el valor es el número crudo, sin formato de moneda);
		- `devolucion-item-devueltas-<id>` en el <input> de la cantidad devuelta.
		En compra llevan el prefijo `devolucion-compra-item-…` (`costo` en vez de `precio`).

		🔴 El id del testid es `item.id`, que es el id del ARTICULO: store/devoluciones.js arma cada
		item con `{...article}`, o sea el artículo entero más los datos del pivote --no hay ningún
		`article_id`--. En venta, en la misma lista conviven servicios (`is_service`), que traen su
		propio id de otra tabla: si algún día un spec necesita distinguirlos, el discriminante son
		esos flags, no el id.
	-->
	<div class="dev-tabla-scroll">
		<table class="dev-tabla">
			<thead>
				<tr>
					<th>Código</th>
					<th>Nombre</th>
					<th class="dev-tabla__num">{{ es_compra ? 'Costo' : 'Precio' }}</th>
					<th
					v-if="!es_compra"
					class="dev-tabla__num">Desc.</th>
					<th v-if="muestra_variante">Variante</th>
					<th
					v-if="hay_comprobante"
					class="dev-tabla__num">{{ es_compra ? 'Comprada' : 'Vendida' }}</th>
					<th
					v-if="muestra_ya_devueltas"
					class="dev-tabla__num">Ya devueltas</th>
					<th
					class="dev-tabla__num"
					title="Total devuelto del renglón, contando lo que ya se había devuelto antes">Devuelta</th>
					<th
					v-if="!hay_comprobante"
					class="dev-tabla__accion"></th>
				</tr>
			</thead>
			<tbody>
				<tr
				v-for="(item, index) in items"
				:key="item.id+'-'+index">

					<td class="dev-tabla__codigo">
						{{ item.bar_code || item.provider_code || '—' }}
					</td>

					<td class="dev-tabla__nombre">
						{{ item.name }}
						<span
						v-if="item.is_service"
						class="dev-chip">Servicio</span>
					</td>

					<td class="dev-tabla__num">
						<input
						type="number"
						step="any"
						class="form-control dev-input-num"
						:data-testid="testid_precio(item)"
						@input="al_cambiar_precio(item)"
						@change="al_cambiar_precio(item)"
						v-model="item.price_vender">
					</td>

					<td
					v-if="!es_compra"
					class="dev-tabla__num dev-texto-secundario">
						{{ item.discount ? porcentaje_es(item.discount)+'%' : '—' }}
					</td>

					<td v-if="muestra_variante">
						<b-form-select
						v-if="item.is_article && item.article_variants && item.article_variants.length"
						class="dev-tabla__variante"
						:disabled="hay_comprobante"
						:options="article_variant_options(item)"
						v-model="item.article_variant_id"></b-form-select>
						<span
						v-else
						class="dev-texto-secundario">—</span>
					</td>

					<td
					v-if="hay_comprobante"
					class="dev-tabla__num">
						{{ numero_es(item.amount) }}
					</td>

					<td
					v-if="muestra_ya_devueltas"
					class="dev-tabla__num dev-texto-secundario">
						{{ item.ya_devueltas ? numero_es(item.ya_devueltas) : '—' }}
					</td>

					<td class="dev-tabla__num">
						<input
						type="number"
						step="any"
						class="form-control dev-input-num"
						:data-testid="testid_devueltas(item)"
						:min="minimo(item)"
						:max="item.amount"
						@input="recalcular"
						@change="recalcular"
						v-model="item.returned_amount">
					</td>

					<td
					v-if="!hay_comprobante"
					class="dev-tabla__accion">
						<b-button
						class="dev-btn-icono"
						variant="link"
						title="Quitar renglón"
						:data-testid="(es_compra ? 'devolucion-compra-item-quitar-' : 'devolucion-item-quitar-')+item.id"
						@click="remove_item(item)">
							<i class="bi bi-trash"></i>
						</b-button>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>
<script>
import set_total from '@/mixins/devoluciones/set_total'
export default {
	mixins: [set_total],
	computed: {
		/**
		 * @returns {Boolean} true si el módulo está en modo Compra.
		 */
		es_compra() {
			return this.$store.state.devoluciones.tipo == 'compra'
		},
		/**
		 * ¿Hay venta/compra cargada? Define si se muestran la cantidad original y el botón de
		 * quitar renglón (solo en una nota libre).
		 *
		 * @returns {Boolean}
		 */
		hay_comprobante() {
			let state = this.$store.state.devoluciones
			if (this.es_compra) {
				return !!state.provider_order
			}
			return !!state.sale
		},
		/**
		 * Variantes: solo en venta y con la extensión (las compras no cargan variante).
		 *
		 * @returns {Boolean}
		 */
		muestra_variante() {
			return !this.es_compra && this.hasExtencion('article_variants')
		},
		/**
		 * "Ya devueltas" aparece cuando aporta: con comprobante y algún renglón con devoluciones
		 * anteriores. Explica por qué la cantidad devuelta no puede bajar de cierto número (su
		 * mínimo es lo ya devuelto).
		 *
		 * @returns {Boolean}
		 */
		muestra_ya_devueltas() {
			if (!this.hay_comprobante) {
				return false
			}
			// En compra va siempre: es lo que explica el tope de lo que se le puede devolver al
			// proveedor (plan §4.3).
			if (this.es_compra) {
				return true
			}
			return this.items.some(item => Number(item.ya_devueltas) > 0)
		},
	},
	methods: {
		/**
		 * @param {Object} item Renglón.
		 * @returns {String} data-testid del input de precio/costo.
		 */
		testid_precio(item) {
			if (this.es_compra) {
				return 'devolucion-compra-item-costo-'+item.id
			}
			return 'devolucion-item-precio-'+item.id
		},
		/**
		 * @param {Object} item Renglón.
		 * @returns {String} data-testid del input de cantidad devuelta.
		 */
		testid_devueltas(item) {
			if (this.es_compra) {
				return 'devolucion-compra-item-devueltas-'+item.id
			}
			return 'devolucion-item-devueltas-'+item.id
		},
		/**
		 * Quita un renglón (solo en una nota libre) y recalcula el total.
		 *
		 * @param {Object} item Renglón a quitar.
		 */
		remove_item(item) {
			this.$store.commit('devoluciones/remove_item', item)
			this.set_total_devolucion()
		},
		/**
		 * Mínimo de la cantidad devuelta: lo que ya se devolvió antes (la cantidad es acumulada).
		 *
		 * @param {Object} item Renglón.
		 * @returns {Number}
		 */
		minimo(item) {
			if (item.ya_devueltas) {
				return item.ya_devueltas
			}
			return 0
		},
		/**
		 * Cambio del precio (venta) o costo (compra) de un renglón.
		 *
		 * 🔴 En compra, `costo_real` se iguala a `price_vender`: es el costo con el que la API
		 * valúa la mercadería que sale, y si quedaba el de la compra, el costo editado a mano se
		 * veía en el total pero no en el costo de lo devuelto. En venta `costo_real` es el costo
		 * del artículo, no el precio, y no se toca.
		 *
		 * @param {Object} item Renglón editado.
		 */
		al_cambiar_precio(item) {
			if (this.es_compra) {
				item.costo_real = item.price_vender
			}
			this.recalcular()
		},
		/**
		 * Recalcula el total de la devolución con set_total.js (misma fórmula de siempre).
		 */
		recalcular() {
			this.set_total_devolucion()
		},
		/**
		 * Opciones del select de variante de un renglón.
		 *
		 * @param {Object} item Renglón con `article_variants`.
		 * @returns {Array} [{value, text}]
		 */
		article_variant_options(item) {
			let options = [{
				value: 0,
				text: 'Seleccione Variante'
			}]

			item.article_variants.forEach(variant => {
				options.push({
					value: variant.id,
					text: variant.variant_description
				})
			})

			return options
		},
	},
}
</script>
<style lang="sass">
.devoluciones-modulo
	// Scroll horizontal ADENTRO de la tarjeta: en teléfono la tabla es más ancha que la pantalla
	// y es esta caja la que scrollea, no la página.
	.dev-tabla-scroll
		width: 100%
		overflow-x: auto
		-webkit-overflow-scrolling: touch

	// 🔴 Los selectores llevan dos clases (.devoluciones-modulo .dev-tabla) a propósito: el tema
	// oscuro pinta cualquier tabla con `html.dark-mode table thead th` (una clase y cuatro
	// elementos). Con dos clases este gana por especificidad, sin !important.
	.dev-tabla
		width: 100%
		margin: 0
		border-collapse: separate
		border-spacing: 0

		thead th
			padding: 0 12px 10px
			font-size: 0.75rem
			font-weight: 600
			letter-spacing: 0.02em
			text-align: left
			white-space: nowrap
			color: var(--color-text-secondary)
			background-color: transparent
			border: none
			border-bottom: 1px solid var(--color-border-secondary)

		tbody td
			padding: 10px 12px
			font-size: 0.9375rem
			vertical-align: middle
			color: var(--color-text-primary)
			border: none
			border-bottom: 1px solid var(--color-border-secondary)

		tbody tr:last-child td
			border-bottom: none

		// El primer y el último renglón pegados al borde de la tarjeta, sin sangría de más.
		th:first-child,
		td:first-child
			padding-left: 0

		th:last-child,
		td:last-child
			padding-right: 0

		// Modificadores de celda adentro de .dev-tabla: así suman una clase más que las reglas de
		// thead th / tbody td de arriba y les ganan sin !important.
		.dev-tabla__num
			text-align: right
			font-variant-numeric: tabular-nums

		.dev-texto-secundario
			color: var(--color-text-secondary)

		.dev-tabla__codigo
			font-size: 0.8125rem
			color: var(--color-text-secondary)
			font-variant-numeric: tabular-nums

		// El nombre es lo único que puede partir en dos líneas: el resto de las celdas son cifras.
		.dev-tabla__nombre
			min-width: 180px
			white-space: normal
			font-weight: 500

			.dev-chip
				margin-left: 6px

		.dev-tabla__variante
			min-width: 160px

		.dev-tabla__accion
			width: 1%
			text-align: right
</style>
