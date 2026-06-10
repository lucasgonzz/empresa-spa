<template>
<b-modal
v-if="sale.articles"
title="Actualizar precios"
hide-footer
size="lg"
id="update-prices"
class="update-prices-modal">
	<div class="update-prices-modal__body">

		<!-- Resumen de cambios detectados respecto al precio vendido -->
		<p class="update-prices-modal__intro text-muted">
			Compará el precio vendido con el precio actual del artículo. Los renglones resaltados indican diferencias antes de confirmar.
		</p>

		<div class="update-prices-modal__legend">
			<b-badge variant="danger" class="update-prices-modal__badge">
				<i class="icon-arrow-up"></i>
				Subió: {{ count_by_status('increase') }}
			</b-badge>
			<b-badge variant="success" class="update-prices-modal__badge">
				<i class="icon-arrow-down"></i>
				Bajó: {{ count_by_status('decrease') }}
			</b-badge>
			<b-badge variant="secondary" class="update-prices-modal__badge">
				<i class="icon-check"></i>
				Sin cambio: {{ count_by_status('unchanged') }}
			</b-badge>
		</div>

		<b-table
		class="update-prices-modal__table s-2 b-r-1"
		head-variant="dark"
		striped
		hover
		small
		responsive
		:fields="fields"
		:items="table_items"
		:tbody-tr-class="row_class">
			<template #cell(name)="data">
				<span class="update-prices-modal__article-name">{{ data.item.name }}</span>
				<b-badge
				v-if="data.item.is_service"
				variant="light"
				class="update-prices-modal__type-badge">
					Servicio
				</b-badge>
			</template>

			<template #cell(actual_price)="data">
				<span class="update-prices-modal__sold-price">
					{{ data.item.actual_price }}
				</span>
			</template>

			<template #cell(price_vender)="data">
				<div class="update-prices-modal__price-cell">
					<b-form-input
					type="number"
					size="sm"
					placeholder="Nuevo precio"
					v-model="table_items[data.index].price_vender"
					:class="input_class(data.item)"></b-form-input>
					<small class="update-prices-modal__catalog-price text-muted">
						Precio actual: {{ data.item.catalog_price_display }}
					</small>
				</div>
			</template>

			<template #cell(diff)="data">
				<span
				v-if="get_price_change_status(data.item) !== 'unchanged'"
				:class="diff_class(data.item)">
					{{ format_diff(data.item) }}
				</span>
				<span
				v-else
				class="update-prices-modal__diff update-prices-modal__diff--unchanged text-muted">
					=
				</span>
			</template>
		</b-table>

		<div class="update-prices-modal__footer">
			<btn-loader
			@clicked="update"
			:loader="loading"
			text="Actualizar"></btn-loader>
		</div>
	</div>
</b-modal>
</template>
<script>
import previus_sale from '@/mixins/vender/previus_sale/index'
import BtnLoader from '@/common-vue/components/BtnLoader'
export default {
	mixins: [previus_sale],
	components: {
		BtnLoader,
	},
	data() {
		return {
			// Indica si la petición de actualización está en curso
			loading: false,
			// Renglones editables del modal, inicializados al abrir
			table_items: [],
		}
	},
	computed: {
		/**
		 * Venta cargada en el store del detalle de venta.
		 *
		 * @returns {Object}
		 */
		sale() {
			return this.$store.state.sale.model 
		},
		/**
		 * Columnas visibles en la tabla de actualización de precios.
		 *
		 * @returns {Array}
		 */
		fields() {
			return [
				{label: 'Artículo', key: 'name'},
				{label: 'Precio vendido', key: 'actual_price'},
				{label: 'Nuevo precio', key: 'price_vender'},
				{label: 'Diferencia', key: 'diff', thClass: 'text-center', tdClass: 'text-center'},
			]
		},
	},
	mounted() {
		// Al abrir el modal se reconstruyen los renglones con los datos actuales de la venta
		this.$root.$on('bv::modal::show', (bvEvent, modal_id) => {
			if (modal_id == 'update-prices') {
				this.build_table_items()
			}
		})
	},
	methods: {
		/**
		 * Arma la lista editable de artículos y servicios de la venta.
		 *
		 * @returns {void}
		 */
		build_table_items() {
			// Acumulador de renglones para la tabla
			let items = []
			// Renglon temporal que se reutiliza en cada iteración
			let item

			this.sale.articles.forEach(article => {
				item = {
					is_article: true,
					id: article.id,
					name: article.name,
					// Precio numérico con el que se vendió el artículo
					sold_price_raw: parseFloat(article.pivot.price) || 0,
					actual_price: this.price(article.pivot.price),
					// Precio actual del catálogo, editable antes de confirmar
					catalog_price_raw: parseFloat(article.final_price) || 0,
					catalog_price_display: this.price(article.final_price),
				}
				item.price_vender = article.final_price
				items.push(item)
			})

			this.sale.services.forEach(service => {
				item = {
					is_service: true,
					id: service.id,
					name: service.name,
					sold_price_raw: parseFloat(service.pivot.price) || 0,
					actual_price: this.price(service.pivot.price),
					catalog_price_raw: parseFloat(service.pivot.price) || 0,
					catalog_price_display: this.price(service.pivot.price),
				}
				item.price_vender = service.pivot.price
				items.push(item)
			})

			this.table_items = items
		},
		/**
		 * Determina si el nuevo precio subió, bajó o se mantuvo respecto al vendido.
		 *
		 * @param {Object} item
		 * @returns {string} increase | decrease | unchanged
		 */
		get_price_change_status(item) {
			// Precio con el que se vendió el renglón
			let sold_price = parseFloat(item.sold_price_raw) || 0
			// Precio nuevo ingresado o tomado del catálogo
			let new_price = parseFloat(item.price_vender) || 0

			if (new_price > sold_price) {
				return 'increase'
			}
			if (new_price < sold_price) {
				return 'decrease'
			}
			return 'unchanged'
		},
		/**
		 * Clase de fila para resaltar aumentos y disminuciones de precio.
		 *
		 * @param {Object} item
		 * @returns {string}
		 */
		row_class(item) {
			if (!item) {
				return ''
			}

			let status = this.get_price_change_status(item)

			if (status == 'increase') {
				return 'update-prices-row--increase'
			}
			if (status == 'decrease') {
				return 'update-prices-row--decrease'
			}
			return 'update-prices-row--unchanged'
		},
		/**
		 * Clase del input según la dirección del cambio de precio.
		 *
		 * @param {Object} item
		 * @returns {string}
		 */
		input_class(item) {
			let status = this.get_price_change_status(item)

			if (status == 'increase') {
				return 'update-prices-modal__input--increase'
			}
			if (status == 'decrease') {
				return 'update-prices-modal__input--decrease'
			}
			return ''
		},
		/**
		 * Clase visual para la columna de diferencia.
		 *
		 * @param {Object} item
		 * @returns {string}
		 */
		diff_class(item) {
			let status = this.get_price_change_status(item)
			return 'update-prices-modal__diff update-prices-modal__diff--' + status
		},
		/**
		 * Formatea la diferencia numérica entre precio vendido y nuevo precio.
		 *
		 * @param {Object} item
		 * @returns {string}
		 */
		format_diff(item) {
			// Diferencia absoluta entre el precio nuevo y el vendido
			let diff_value = (parseFloat(item.price_vender) || 0) - (parseFloat(item.sold_price_raw) || 0)
			// Prefijo visual según si subió o bajó
			let prefix = diff_value > 0 ? '+' : ''

			return prefix + this.price(diff_value)
		},
		/**
		 * Cuenta renglones según el estado de cambio de precio.
		 *
		 * @param {string} status
		 * @returns {number}
		 */
		count_by_status(status) {
			let count = 0

			this.table_items.forEach(item => {
				if (this.get_price_change_status(item) == status) {
					count++
				}
			})

			return count
		},
		/**
		 * Envía los precios editados al backend y recarga la venta en vender.
		 *
		 * @returns {void}
		 */
		update() {
			this.loading = true 
			this.$api.put('sale/update-prices/'+this.sale.id, {
				items: this.table_items 
			})
			.then(res => {
				this.loading = false 
				this.setPreviusSale(this.sale)
			})
			.catch(err => {
				console.log(err)
				this.loading = false 
				this.$toast.error('Error al actualizar precios')
			})
		}
	}
}
</script>
<style lang="sass">
.update-prices-modal
	&__body
		padding: 4px 2px 0

	&__intro
		font-size: 0.9rem
		margin-bottom: 14px
		line-height: 1.45

	&__legend
		display: flex
		flex-wrap: wrap
		gap: 8px
		margin-bottom: 16px

	&__badge
		padding: 7px 10px
		font-size: 0.82rem
		font-weight: 600

	&__table
		margin-bottom: 0

		::v-deep thead th
			font-size: 0.82rem
			letter-spacing: 0.02em
			white-space: nowrap

		::v-deep tbody td
			vertical-align: middle

		::v-deep tr.update-prices-row--increase
			background-color: rgba(220, 53, 69, 0.08) !important
			box-shadow: inset 3px 0 0 #dc3545

		::v-deep tr.update-prices-row--decrease
			background-color: rgba(40, 167, 69, 0.08) !important
			box-shadow: inset 3px 0 0 #28a745

		::v-deep tr.update-prices-row--unchanged
			background-color: transparent

	&__article-name
		font-weight: 600
		color: #343a40

	&__type-badge
		margin-left: 8px
		font-size: 0.72rem
		vertical-align: middle

	&__sold-price
		font-weight: 600
		color: #495057
		white-space: nowrap

	&__price-cell
		min-width: 150px

	&__catalog-price
		display: block
		margin-top: 4px
		font-size: 0.78rem

	&__input--increase
		border-color: rgba(220, 53, 69, 0.55)
		background-color: rgba(220, 53, 69, 0.04)

	&__input--decrease
		border-color: rgba(40, 167, 69, 0.55)
		background-color: rgba(40, 167, 69, 0.04)

	&__diff
		font-size: 0.85rem
		font-weight: 700
		white-space: nowrap

	&__diff--increase
		color: #c82333

	&__diff--decrease
		color: #1e7e34

	&__diff--unchanged
		font-weight: 500

	&__footer
		display: flex
		justify-content: flex-end
		padding-top: 16px
		margin-top: 8px
		border-top: 1px solid #e9ecef
</style>
