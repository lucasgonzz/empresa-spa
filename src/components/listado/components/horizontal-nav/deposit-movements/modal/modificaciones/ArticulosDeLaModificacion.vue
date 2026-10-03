<template>
	<!--
		Detalle de UNA modificacion de articulos de un movimiento de deposito (mision
		movimientos-deposito-auditoria, 3/10/2026): los articulos como estaban antes y como quedaron
		despues. Mismos colores que el detalle de ventas
		(ventas/modals/sale-modifications/ArticlesInfo.vue):
		- verde: articulo agregado (esta despues y no antes);
		- rojo: articulo quitado (estaba antes y no despues);
		- amarillo: le cambio la cantidad.

		A diferencia de ventas, aca un articulo se reconoce por articulo + variante: el movimiento
		admite el mismo articulo dos veces con variantes distintas (`check_ya_esta_agregado: false`
		en src/models/deposit_movement.js), y cada variante es una fila propia.
	-->
	<b-modal
	hide-footer
	size="lg"
	:title="titulo"
	:id="id">
		<p
		class="text-muted">
			En verde, lo que se agregó; en rojo, lo que se quitó; en amarillo, lo que cambió de cantidad.
		</p>

		<p
		class="m-b-5">
			Artículos antes de la modificación
		</p>
		<b-table
		head-variant="dark"
		responsive
		small
		show-empty
		empty-text="No había artículos."
		:fields="fields"
		:items="items_antes"></b-table>

		<p
		class="m-b-5 m-t-15">
			Artículos después de la modificación
		</p>
		<b-table
		head-variant="dark"
		responsive
		small
		show-empty
		empty-text="No quedó ningún artículo."
		:fields="fields"
		:items="items_despues"></b-table>
	</b-modal>
</template>
<script>
import moment from 'moment'
export default {
	props: {
		/**
		 * Id del b-modal (lo arma el historial: su propio id mas '-articulos').
		 */
		id: {
			type: String,
			required: true,
		},
		/**
		 * La modificacion elegida en el historial: trae `user`, `created_at`, `articulos_antes` y
		 * `articulos_despues` (cada articulo con su `pivot.amount`, `pivot.article_variant_id` y
		 * sus `article_variants`).
		 */
		modificacion: {
			type: Object,
			default: null,
		},
	},
	computed: {
		/**
		 * Titulo con quien hizo la modificacion y cuando.
		 *
		 * @returns {String}
		 */
		titulo() {
			if (!this.modificacion) {
				return ''
			}
			let titulo = 'Modificación del ' + moment(this.modificacion.created_at).format('DD/MM/YYYY HH:mm')
			if (this.modificacion.user && this.modificacion.user.name) {
				titulo += ' por ' + this.modificacion.user.name
			}
			return titulo
		},
		/**
		 * Columnas de las dos tablas.
		 *
		 * @returns {Array}
		 */
		fields() {
			return [
				{
					key: 'codigo',
					label: 'Código',
				},
				{
					key: 'nombre',
					label: 'Nombre',
				},
				{
					key: 'variante',
					label: 'Variante',
				},
				{
					key: 'cantidad',
					label: 'Cantidad',
				},
			]
		},
		/**
		 * Articulos de antes de la modificacion.
		 *
		 * @returns {Array}
		 */
		articulos_antes() {
			if (this.modificacion && Array.isArray(this.modificacion.articulos_antes)) {
				return this.modificacion.articulos_antes
			}
			return []
		},
		/**
		 * Articulos de despues de la modificacion.
		 *
		 * @returns {Array}
		 */
		articulos_despues() {
			if (this.modificacion && Array.isArray(this.modificacion.articulos_despues)) {
				return this.modificacion.articulos_despues
			}
			return []
		},
		/**
		 * Filas de la tabla de ANTES: en rojo lo que ya no esta despues, en amarillo lo que cambio
		 * de cantidad.
		 *
		 * @returns {Array}
		 */
		items_antes() {
			let items = []
			this.articulos_antes.forEach(article => {
				let item = this.fila(article)
				let en_despues = this.buscar_mismo_articulo(this.articulos_despues, article)
				if (!en_despues) {
					item._rowVariant = 'danger'
				} else if (this.cantidad_de(en_despues) != this.cantidad_de(article)) {
					item._rowVariant = 'warning'
				}
				items.push(item)
			})
			return items
		},
		/**
		 * Filas de la tabla de DESPUES: en verde lo que no estaba antes, en amarillo lo que cambio
		 * de cantidad.
		 *
		 * @returns {Array}
		 */
		items_despues() {
			let items = []
			this.articulos_despues.forEach(article => {
				let item = this.fila(article)
				let en_antes = this.buscar_mismo_articulo(this.articulos_antes, article)
				if (!en_antes) {
					item._rowVariant = 'success'
				} else if (this.cantidad_de(en_antes) != this.cantidad_de(article)) {
					item._rowVariant = 'warning'
				}
				items.push(item)
			})
			return items
		},
	},
	methods: {
		/**
		 * Variante guardada en el pivot de un articulo, normalizada: null, '' y 0 valen 0 (sin
		 * variante). Mismo criterio que la comparacion del backend (DepositMovementHelper).
		 *
		 * @param {Object} article
		 * @returns {Number}
		 */
		variante_de(article) {
			if (!article.pivot) {
				return 0
			}
			return Number(article.pivot.article_variant_id) || 0
		},
		/**
		 * Cantidad guardada en el pivot de un articulo, como numero (el backend la manda como
		 * texto decimal, "5.00").
		 *
		 * @param {Object} article
		 * @returns {Number}
		 */
		cantidad_de(article) {
			if (!article.pivot) {
				return 0
			}
			return Number(article.pivot.amount) || 0
		},
		/**
		 * Busca en una lista el mismo articulo con la misma variante.
		 *
		 * @param {Array} lista articulos de la otra foto (antes o despues).
		 * @param {Object} article articulo a buscar.
		 * @returns {Object|undefined}
		 */
		buscar_mismo_articulo(lista, article) {
			let variante = this.variante_de(article)
			return lista.find(otro => otro.id == article.id && this.variante_de(otro) == variante)
		},
		/**
		 * Fila de la tabla para un articulo de la foto.
		 *
		 * @param {Object} article
		 * @returns {Object}
		 */
		fila(article) {
			return {
				codigo: article.bar_code || article.provider_code || '-',
				nombre: article.name,
				variante: this.descripcion_de_variante(article),
				cantidad: article.pivot ? article.pivot.amount : '',
			}
		},
		/**
		 * Descripcion de la variante del pivot, buscandola entre las variantes del articulo.
		 *
		 * @param {Object} article
		 * @returns {String} la descripcion, o '-' si no tiene variante.
		 */
		descripcion_de_variante(article) {
			let variante_id = this.variante_de(article)
			if (!variante_id || !Array.isArray(article.article_variants)) {
				return '-'
			}
			let variante = article.article_variants.find(variant => variant.id == variante_id)
			if (variante) {
				return variante.variant_description
			}
			return '-'
		},
	},
}
</script>
