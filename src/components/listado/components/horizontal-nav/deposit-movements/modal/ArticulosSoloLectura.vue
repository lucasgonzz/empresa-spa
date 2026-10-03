<template>
	<!--
		Articulos de un movimiento de deposito en SOLO LECTURA (mision movimientos-deposito-auditoria,
		3/10/2026). Reemplaza al buscador + la tabla editable del formulario cuando los articulos
		quedan bloqueados: el stock ya se movio, o el usuario no tiene el permiso
		`deposit_movement.update_articles`.

		Existe porque la tabla de la relacion del formulario generico
		(common-vue/components/model/form/BelongsToManyTable.vue + display/table/PivotProp.vue) no
		tiene modo de solo lectura: sus cantidades y variantes son inputs siempre. Lo monta el slot
		`#articles` del modal del listado y del de alertas.
	-->
	<div
	class="articulos-solo-lectura"
	data-testid="articulos-bloqueados-deposito">
		<b-alert
		show
		variant="warning">
			{{ aviso }}
		</b-alert>

		<b-table
		head-variant="dark"
		responsive
		small
		show-empty
		empty-text="Este movimiento no tiene artículos."
		:fields="fields"
		:items="items"></b-table>
	</div>
</template>
<script>
export default {
	props: {
		/**
		 * El movimiento de deposito del formulario (el que reenvia el slot `#articles`).
		 */
		model: {
			type: Object,
			required: true,
		},
	},
	computed: {
		/**
		 * Por que los articulos no se pueden tocar. Si el stock ya se movio, ese es el motivo (aunque
		 * el usuario ademas no tenga el permiso): es el que no cambia nunca mas.
		 *
		 * @returns {String}
		 */
		aviso() {
			if (this.model.stock_moved_at) {
				return 'El stock de este movimiento ya se movió ' + this.deposit_movement_stock_movido_texto(this.model)
					+ '. Los artículos quedan bloqueados: no se pueden agregar, quitar ni cambiar cantidades.'
			}
			return 'No tenés permiso para cambiar los artículos de un movimiento de depósito.'
		},
		/**
		 * Si algun articulo del movimiento tiene una variante elegida. La columna "Variante" se
		 * muestra solo en ese caso: en un comercio que no usa variantes seria una columna vacia.
		 *
		 * @returns {Boolean}
		 */
		hay_variantes() {
			let hay = false
			this.articulos.forEach(article => {
				if (article.pivot && Number(article.pivot.article_variant_id)) {
					hay = true
				}
			})
			return hay
		},
		/**
		 * Columnas de la tabla.
		 *
		 * @returns {Array}
		 */
		fields() {
			let fields = [
				{
					key: 'codigo',
					label: 'Código',
				},
				{
					key: 'nombre',
					label: 'Nombre',
				},
			]
			if (this.hay_variantes) {
				fields.push({
					key: 'variante',
					label: 'Variante',
				})
			}
			fields.push({
				key: 'cantidad',
				label: 'Cantidad',
			})
			return fields
		},
		/**
		 * Los articulos del movimiento, o una lista vacia si el modelo no los trae.
		 *
		 * @returns {Array}
		 */
		articulos() {
			if (Array.isArray(this.model.articles)) {
				return this.model.articles
			}
			return []
		},
		/**
		 * Filas de la tabla: codigo (el de barras, o el del proveedor si no tiene), nombre,
		 * variante elegida en el pivot y cantidad.
		 *
		 * @returns {Array}
		 */
		items() {
			let items = []
			this.articulos.forEach(article => {
				let pivot = article.pivot ? article.pivot : {}
				items.push({
					codigo: article.bar_code || article.provider_code || '-',
					nombre: article.name,
					variante: this.descripcion_de_variante(article, pivot.article_variant_id),
					cantidad: pivot.amount,
				})
			})
			return items
		},
	},
	methods: {
		/**
		 * Descripcion de la variante elegida para un articulo del movimiento, buscandola entre las
		 * variantes del articulo (vienen en `article.article_variants`).
		 *
		 * @param {Object} article el articulo de la fila.
		 * @param {Number|null} article_variant_id la variante guardada en el pivot.
		 * @returns {String} la descripcion, o '-' si no hay variante elegida.
		 */
		descripcion_de_variante(article, article_variant_id) {
			if (!Number(article_variant_id) || !Array.isArray(article.article_variants)) {
				return '-'
			}
			let variante = article.article_variants.find(variant => variant.id == article_variant_id)
			if (variante) {
				return variante.variant_description
			}
			return '-'
		},
	},
}
</script>
