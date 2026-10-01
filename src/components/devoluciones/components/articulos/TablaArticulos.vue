<template>
	<!--
		Renglones a devolver. Tabla escrita a mano (no b-table) para controlar cada celda.

		Tres anchos, UNA sola estructura (solo CSS, ver el <style>):
		- Escritorio (>= 1200): tabla normal.
		- Tablet (768-1199): la misma tabla, apretada para entrar entera en 768 sin scroll: nombre
			flexible con salto de línea, inputs de 88px y menos sangría.
		- Teléfono (< 768): cada renglón es una tarjeta: nombre (y código) arriba, el botón de
			quitar arriba a la derecha y debajo una grilla de 2 columnas con etiqueta + dato. La
			etiqueta sale de `data-etiqueta` de cada celda (::before).
		🔴 Es la MISMA tabla en los tres anchos a propósito: hay un solo <input> por data-testid en
		el DOM. Dos vistas (tabla + tarjetas) duplicarían los testids y el spec no sabría cuál tocar.

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
					<th v-if="muestra_codigo">Código</th>
					<th>Nombre</th>
					<th class="dev-tabla__num">{{ etiqueta_precio }}</th>
					<th
					v-if="!es_compra"
					class="dev-tabla__num">Desc.</th>
					<th v-if="muestra_variante">Variante</th>
					<th
					v-if="hay_comprobante"
					class="dev-tabla__num">{{ etiqueta_cantidad }}</th>
					<th
					v-if="muestra_ya_devueltas"
					class="dev-tabla__num">Ya devueltas</th>
					<th
					class="dev-tabla__num"
					:title="titulo_devuelta">{{ etiqueta_devuelta }}</th>
					<th
					v-if="!hay_comprobante"
					class="dev-tabla__accion"></th>
				</tr>
			</thead>
			<tbody>
				<tr
				v-for="(item, index) in items"
				:key="item.id+'-'+index"
				:class="{'dev-tabla__fila--quitable': !hay_comprobante}">

					<td
					v-if="muestra_codigo"
					class="dev-tabla__codigo">
						{{ item.bar_code || item.provider_code || '—' }}
					</td>

					<td class="dev-tabla__nombre">
						{{ item.name }}
						<span
						v-if="item.is_service"
						class="dev-chip">Servicio</span>
					</td>

					<td
					class="dev-tabla__num"
					:data-etiqueta="etiqueta_precio">
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
					class="dev-tabla__num dev-texto-secundario"
					data-etiqueta="Desc.">
						{{ item.discount ? porcentaje_es(item.discount)+'%' : '—' }}
					</td>

					<td
					v-if="muestra_variante"
					class="dev-tabla__celda-variante"
					data-etiqueta="Variante">
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
					class="dev-tabla__num"
					:data-etiqueta="etiqueta_cantidad">
						{{ numero_es(item.amount) }}
					</td>

					<td
					v-if="muestra_ya_devueltas"
					class="dev-tabla__num dev-texto-secundario"
					data-etiqueta="Ya devueltas">
						{{ item.ya_devueltas ? numero_es(item.ya_devueltas) : '—' }}
					</td>

					<td
					class="dev-tabla__num dev-tabla__celda-devuelta"
					:data-etiqueta="etiqueta_devuelta">
						<!--
							Compra: "A devolver" = unidades de ESTA nota (arranca vacío, de 0 a lo
							pendiente). Internamente se mantiene returned_amount = ya_devueltas +
							a_devolver, así set_total.js y el POST (unidades_devueltas) no cambian.
							Venta: la cantidad ACUMULADA de siempre (mínimo = lo ya devuelto).
							Uno u otro (v-if): un solo <input> por data-testid.
						-->
						<input
						v-if="es_compra"
						type="number"
						step="any"
						min="0"
						class="form-control dev-input-num"
						placeholder="0"
						:data-testid="testid_devueltas(item)"
						:max="pendientes(item)"
						@input="al_cambiar_a_devolver(item)"
						@change="al_cambiar_a_devolver(item)"
						v-model="item.a_devolver">
						<input
						v-else
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
		 * @returns {String} Título de la columna de precio: "Costo" en compra, "Precio" en venta.
		 */
		etiqueta_precio() {
			return this.es_compra ? 'Costo' : 'Precio'
		},
		/**
		 * @returns {String} Título de la cantidad original del comprobante.
		 */
		etiqueta_cantidad() {
			return this.es_compra ? 'Comprada' : 'Vendida'
		},
		/**
		 * @returns {String} Título de la columna de cantidad: en compra son las unidades de esta
		 *                   nota; en venta, la cantidad devuelta acumulada de siempre.
		 */
		etiqueta_devuelta() {
			return this.es_compra ? 'A devolver' : 'Devuelta'
		},
		/**
		 * @returns {String} Ayuda (title) del título de la columna de cantidad.
		 */
		titulo_devuelta() {
			if (this.es_compra) {
				return 'Unidades que le devolvés al proveedor con esta nota de crédito'
			}
			return 'Total devuelto del renglón, contando lo que ya se había devuelto antes'
		},
		/**
		 * La columna Código se oculta si NINGÚN renglón tiene código (de barras o de proveedor):
		 * una columna entera de guiones solo le quita lugar al nombre y a la cantidad devuelta.
		 *
		 * @returns {Boolean}
		 */
		muestra_codigo() {
			return this.items.some(item => item.bar_code || item.provider_code)
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
		 * Unidades que todavía se le pueden devolver al proveedor de un renglón de compra:
		 * comprada - ya devueltas. Sin compra de origen (nota libre) no hay tope.
		 *
		 * @param {Object} item Renglón de compra.
		 * @returns {Number|null} Tope, o null si no hay.
		 */
		pendientes(item) {
			if (item.amount === '' || item.amount === null || typeof item.amount == 'undefined') {
				return null
			}
			let pendientes = Number(item.amount) - Number(item.ya_devueltas || 0)
			return pendientes > 0 ? pendientes : 0
		},
		/**
		 * Cambio de "A devolver" en compra: traduce las unidades de esta nota a la cantidad
		 * acumulada que usan set_total.js y la API (returned_amount = ya_devueltas + a_devolver).
		 *
		 * 🔴 Por qué no se edita returned_amount directo en compra: era acumulado, y con 4 ya
		 * devueltas, para devolver 7 había que escribir 11. El usuario escribe 7.
		 *
		 * @param {Object} item Renglón de compra editado.
		 */
		al_cambiar_a_devolver(item) {
			let a_devolver = Number(item.a_devolver) || 0
			item.returned_amount = Number(item.ya_devueltas || 0) + a_devolver
			this.recalcular()
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
	// Red de seguridad: si algún caso raro no entra (p. ej. venta con variantes en tablet), scrollea
	// ADENTRO de la tarjeta y la página no se ensancha. En el caso normal no hace falta: ver los tres
	// anchos más abajo.
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

		// El primer y el último renglón pegados al borde de la tarjeta, sin sangría de más. Solo en
		// modo tabla: en teléfono cada celda es un bloque de la tarjeta y no lleva sangría.
		@media screen and (min-width: 768px)
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

	// --- Tablet (768-1199): la misma tabla, apretada -----------------------------------------
	// Medido el 1/10/2026 con una compra de 3 renglones: a 768px la tabla medía 667px en un
	// contenedor de 610 y "Devuelta" --el campo principal-- quedaba fuera de vista. Con esto entra
	// entera: menos sangría (6px por lado), inputs de 88px, el nombre flexible desde 96px, los
	// títulos pueden partir en dos líneas ("Ya / devueltas") y el código corta donde haga falta.
	@media screen and (min-width: 768px) and (max-width: 1199px)
		.dev-tabla
			thead th
				padding: 0 6px 8px
				white-space: normal
				vertical-align: bottom

			tbody td
				padding: 8px 6px

			.dev-tabla__nombre
				min-width: 96px

			.dev-tabla__codigo
				max-width: 88px
				white-space: normal
				overflow-wrap: anywhere

			.dev-tabla__variante
				min-width: 120px

			.dev-input-num
				width: 88px

	// --- Teléfono (< 768): cada renglón es una tarjeta ------------------------------------------
	// Misma estructura de tabla, otro display: el <thead> se esconde y cada <td> muestra su propia
	// etiqueta con `data-etiqueta` (::before). Arriba el nombre (y el código chico), el botón de
	// quitar arriba a la derecha, y debajo una grilla de 2 columnas con los datos.
	@media screen and (max-width: 767px)
		.dev-tabla-scroll
			overflow-x: visible

		.dev-tabla
			display: block

			thead
				display: none

			tbody
				display: flex
				flex-direction: column
				gap: 12px

			// El fondo del renglón lo fija _tables.sass con !important (blanco / --bg-card en
			// oscuro), que es el mismo de la tarjeta: el contorno va con un box-shadow interno.
			tbody tr
				position: relative
				display: grid
				grid-template-columns: repeat(2, minmax(0, 1fr))
				align-items: start
				gap: 12px 16px
				padding: 14px 16px
				border-radius: 12px
				box-shadow: inset 0 0 0 1px var(--color-border-secondary)
				white-space: normal

			// Cada celda es un bloque etiqueta-arriba / dato-abajo, desde arriba (no desde abajo:
			// con flex-end, una celda con input y otra con texto arrancaban a distinta altura).
			tbody td
				display: flex
				flex-direction: column
				justify-content: flex-start
				min-width: 0
				padding: 0
				border: none
				text-align: left
				white-space: normal

			// 🔴 td.dev-tabla__num lleva una clase y un elemento más que `.dev-tabla
			// .dev-tabla__num` (text-align: right, el de la tabla): sin esto las etiquetas y las
			// cifras de la tarjeta salían alineadas a la derecha.
			// El dato de solo lectura (Comprada, Ya devueltas, Desc.) va con line-height de 36px,
			// el mismo alto que un input (--toolbar-control-h): así las dos columnas de cada fila
			// de la grilla quedan parejas.
			tbody td.dev-tabla__num,
			tbody td.dev-tabla__celda-variante
				text-align: left
				line-height: var(--toolbar-control-h, 36px)

			tbody td[data-etiqueta]::before
				content: attr(data-etiqueta)
				display: block
				margin-bottom: 4px
				font-size: 0.75rem
				font-weight: 500
				line-height: 1.3
				text-align: left
				color: var(--color-text-secondary)

			.dev-tabla__nombre
				grid-column: 1 / -1
				order: -2
				min-width: 0
				font-size: 1rem

			// Lugar para el botón de quitar, que va arriba a la derecha.
			.dev-tabla__fila--quitable .dev-tabla__nombre
				padding-right: 40px

			.dev-tabla__codigo
				grid-column: 1 / -1
				order: -1
				margin-top: -8px

			.dev-tabla__accion
				position: absolute
				top: 8px
				right: 8px
				width: auto

			.dev-tabla__variante
				min-width: 0
				width: 100%

			.dev-input-num
				width: 100%
				margin-left: 0
</style>
