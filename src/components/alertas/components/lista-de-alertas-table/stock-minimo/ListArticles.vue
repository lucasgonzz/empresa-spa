<template>
	<div>

		<div
		v-if="articles_stock_minimo.length"
		class="d-flex justify-content-end m-b-5">
			<props-to-show
			model_name="inventory_performance"></props-to-show>
		</div>

		<b-table
		v-if="articles_stock_minimo.length"
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

		<div
		v-else
		class="text-with-icon">
			No hay articulos con stock minimo
			<i class="icon-eye-slash"></i>
		</div>

	</div>

</template>
<script>
export default {
	components: {
		PropsToShow: () => import('@/common-vue/components/view/header/props-to-show/Index'),
		TableThumbnailImages: () => import('@/common-vue/components/display/table/TableThumbnailImages'),
	},
	computed: {
		/**
		 * Articulos con stock minimo de la alerta activa: modelos Article completos con
		 * su pivot (address_id, stock_address, stock_min_address) cuando la alerta es por deposito.
		 *
		 * @returns {Array}
		 */
		articles_stock_minimo() {
			if (this.$store.state.inventory_performance.models[0]) {

				return this.$store.state.inventory_performance.models[0].articles_stock_minimo
			}

			return []
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
}
</script>
