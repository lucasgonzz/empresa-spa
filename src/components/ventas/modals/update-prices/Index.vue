<template>
<b-modal
v-if="sale.articles"
title="Actualizar precios"
hide-footer
size="lg"
id="update-prices"
@show="build_table_items"
class="update-prices-modal">
	<div class="update-prices-modal__body">

		<!-- Resumen de cambios detectados respecto al precio vendido -->
		<p class="update-prices-modal__intro text-muted">
			Compará el precio vendido con el precio actual del artículo. Los renglones resaltados indican diferencias antes de confirmar.
		</p>

		<!-- Venta con los recargos adentro de los precios: el precio propuesto ya los trae -->
		<p
		v-if="factor_recargos_de_la_venta !== null"
		data-testid="update-prices-aviso-recargos"
		class="update-prices-modal__intro text-muted">
			{{ texto_aviso_recargos }}
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
				<!-- La variante del renglon: con el mismo articulo en dos variantes hay dos renglones con el mismo nombre -->
				<span
				v-if="data.item.variant_description"
				class="update-prices-modal__variant">{{ data.item.variant_description }}</span>
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
			data-testid="btn-confirmar-actualizar-precios"
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
import { factor_de_recargos, numero_o_null, precio_sin_recargos_guardado, comprobante_con_recargos_en_precios_sin_registro, redondear_a_centavos } from '@/utils/recargos_en_precios'
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
		/**
		 * Factor de los recargos GUARDADOS de la venta (Π(1 + p/100) con el porcentaje del
		 * pivot, no el vigente del catálogo) si la venta tiene la opción "Aplicar los recargos
		 * directamente a los precios" prendida; null si no la tiene o si no tiene recargos.
		 *
		 * Hasta la misión recargos-en-precios-editable (28/9/2026) este modal proponía el
		 * final_price del catálogo SIN recargo aunque la venta tuviera la opción prendida: el
		 * renglón perdía el recargo y, como el pie tampoco lo suma con la opción prendida, la
		 * venta dejaba de cobrarlo.
		 *
		 * @returns {Number|null}
		 */
		factor_recargos_de_la_venta() {
			if (!this.sale || !Number(this.sale.aplicar_recargos_directo_a_items)) {
				return null
			}

			let recargos = Array.isArray(this.sale.surchages) ? this.sale.surchages : []

			return factor_de_recargos(recargos.map(surchage => {
				return surchage.pivot ? surchage.pivot.percentage : surchage.percentage
			}))
		},
		/**
		 * Venta LEGADO: guardada con la opción prendida antes de que los renglones registraran su
		 * precio sin recargos (misma regla que VENDER, utils/recargos_en_precios.js). En esa venta
		 * no se manda precio sin recargos: la venta sigue bloqueada, que es el modo de falla
		 * seguro.
		 *
		 * @returns {Boolean}
		 */
		venta_con_recargos_en_precios_sin_registro() {
			return comprobante_con_recargos_en_precios_sin_registro(this.sale)
		},
		/**
		 * Aviso de que el precio va con los recargos adentro. Distingue los servicios porque solo
		 * los llevan con "recargos en servicios": decirle al vendedor que escriba el precio de un
		 * servicio con recargos cuando la venta no se los cobra lo haría cobrar de más.
		 *
		 * @returns {String}
		 */
		texto_aviso_recargos() {
			if (this.sale && Number(this.sale.surchages_in_services)) {
				return 'Esta venta tiene los recargos aplicados directamente a los precios de los artículos y de los servicios: el precio actual que se propone ya los incluye. Si escribís un precio a mano, escribilo con los recargos incluidos.'
			}
			return 'Esta venta tiene los recargos aplicados directamente a los precios de los artículos (los servicios no llevan recargos): el precio actual que se propone para cada artículo ya los incluye. Si escribís a mano el precio de un artículo, escribilo con los recargos incluidos.'
		},
	},
	methods: {
		/**
		 * Arma la lista editable de artículos y servicios de la venta.
		 *
		 * La dispara el @show del propio <b-modal> (show, no shown: los renglones tienen que estar
		 * antes del primer pintado, si no el modal entra un instante vacío y salta).
		 *
		 * Antes colgaba de un this.$root.$on('bv::modal::show') registrado en mounted y nunca
		 * desenganchado: el bus global vive toda la sesión, así que cada montaje del componente
		 * dejaba otro listener vivo y la apertura N del modal rearmaba la tabla N veces.
		 *
		 * @returns {void}
		 */
		build_table_items() {
			// Acumulador de renglones para la tabla
			let items = []
			// Renglon temporal que se reutiliza en cada iteración
			let item

			// Factor de los recargos de la venta si van adentro de los precios; null si no
			let factor = this.factor_recargos_de_la_venta

			this.sale.articles.forEach(article => {

				/*
					Con la opción prendida, el precio actual que se propone es el del catálogo CON
					los recargos de la venta adentro, igual que lo calcularía VENDER: si no, el
					renglón perdería el recargo (el pie no lo suma con la opción prendida).
				*/
				let lleva_recargos = factor !== null
				let catalog_price = parseFloat(article.final_price) || 0

				// Precio del catálogo SIN recargos: la base exacta si el vendedor no toca el propuesto
				let catalog_price_sin_recargos = null

				if (lleva_recargos) {
					catalog_price_sin_recargos = catalog_price

					/*
						🔴 Redondeado a centavos, igual que en VENDER: la API guarda el precio del
						renglón con 2 decimales y recalcula total y factura sumando renglones (el
						detalle, con los números medidos, en generals.js::getPriceVender()).
					*/
					catalog_price = redondear_a_centavos(catalog_price * factor)
				}

				/*
					Variante del renglon (mision variantes-mismo-articulo-en-vender, 8/10/2026).
					sale.articles trae UNA entrada por fila del pivot, asi que el mismo articulo
					vendido en dos variantes ya son dos renglones aca; lo que faltaba era decirle a la
					API de cual se trata: con solo el id, la API escribia el precio en TODAS las filas
					del articulo y la ultima pisaba a las demas. article_variant_id viaja siempre en
					los articulos (0 = sin variante, que para la API nueva es "solo las filas sin
					variante"); la API vieja no la lee y hace lo de siempre.
				*/
				let article_variant_id = Number(article.pivot.article_variant_id || 0)

				item = {
					is_article: true,
					id: article.id,
					name: article.name,
					article_variant_id: article_variant_id,
					variant_description: article_variant_id ? this.descripcion_de_variante_del_pivot(article, article_variant_id) : null,
					// Precio numérico con el que se vendió el artículo
					sold_price_raw: parseFloat(article.pivot.price) || 0,
					actual_price: this.price(article.pivot.price),
					// Precio actual del catálogo, editable antes de confirmar
					catalog_price_raw: catalog_price,
					catalog_price_display: this.price(catalog_price),
					// Si el precio de este renglón lleva los recargos de la venta adentro
					lleva_recargos: lleva_recargos,
					// Precio sin recargos que el renglón tiene guardado (null si no tiene)
					precio_sin_recargos_guardado: precio_sin_recargos_guardado(article.pivot),
					// Precio propuesto (redondeado) y su base sin redondear, para no perder decimales
					precio_propuesto: lleva_recargos ? catalog_price : null,
					precio_propuesto_sin_recargos: catalog_price_sin_recargos,
				}
				item.price_vender = lleva_recargos ? catalog_price : article.final_price
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
					/*
						El servicio propone su propio precio vendido, que ya trae el recargo
						adentro si le correspondía: solo lo lleva con "recargos en servicios".
					*/
					lleva_recargos: factor !== null && Boolean(Number(this.sale.surchages_in_services)),
					precio_sin_recargos_guardado: precio_sin_recargos_guardado(service.pivot),
				}
				item.price_vender = service.pivot.price
				items.push(item)
			})

			this.table_items = items
		},
		/**
		 * El precio sin recargos de un renglón para `PUT sale/update-prices` (clave
		 * `price_vender_sin_recargos`), o null si el precio nuevo no tiene recargos adentro.
		 *
		 * Lo escrito en el input es el precio FINAL, con los recargos adentro (lo dice el aviso del
		 * modal), así que la base es precio / factor. Pero si el precio es uno que el modal ya
		 * conocía, se manda la base exacta en vez de dividir un precio redondeado a centavos (eso
		 * correría la base sin que nadie la cambie):
		 *   - el precio vendido sin tocar: la base que el renglón ya tenía guardada (6 decimales);
		 *   - el precio actual propuesto sin tocar: el precio del catálogo sin recargos, sin
		 *     redondear (igual que VENDER, que divide el precio antes de redondearlo).
		 *
		 * 🔴 En una venta legado va null siempre, aunque el precio lleve recargos: no se sabe la
		 * base de los otros renglones (combos, promociones) y un solo renglón con base no la
		 * des-bloquea. Y la clave viaja SIEMPRE: la API guarda null cuando falta.
		 *
		 * @param {Object} item Renglón de table_items.
		 * @returns {Number|null}
		 */
		precio_sin_recargos_para_actualizar(item) {
			let factor = this.factor_recargos_de_la_venta

			if (
				factor === null
				|| factor === 0
				|| !item.lleva_recargos
				|| this.venta_con_recargos_en_precios_sin_registro
			) {
				return null
			}

			let precio = numero_o_null(item.price_vender)

			if (precio === null) {
				return null
			}

			if (
				precio === item.sold_price_raw
				&& item.precio_sin_recargos_guardado !== null
			) {
				return item.precio_sin_recargos_guardado
			}

			if (
				item.precio_propuesto !== null
				&& typeof item.precio_propuesto != 'undefined'
				&& precio === item.precio_propuesto
				&& item.precio_propuesto_sin_recargos !== null
			) {
				return item.precio_propuesto_sin_recargos
			}

			return precio / factor
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

			// Cada renglón viaja con su precio sin recargos (null si el precio no los tiene adentro)
			let items = this.table_items.map(item => {
				return {
					...item,
					price_vender_sin_recargos: this.precio_sin_recargos_para_actualizar(item),
				}
			})

			this.$api.put('sale/update-prices/'+this.sale.id, {
				items: items
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
		color: var(--color-text-primary, #343a40)

	&__variant
		margin-left: 6px
		color: var(--color-text-secondary, #6c757d)

	&__type-badge
		margin-left: 8px
		font-size: 0.72rem
		vertical-align: middle

	&__sold-price
		font-weight: 600
		color: var(--color-text-primary, #495057)
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
		color: var(--color-text-danger-strong, #c82333)

	&__diff--decrease
		color: var(--color-text-success-strong, #1e7e34)

	&__diff--unchanged
		font-weight: 500

	&__footer
		display: flex
		justify-content: flex-end
		padding-top: 16px
		margin-top: 8px
		border-top: 1px solid var(--color-border-secondary, #e9ecef)
</style>
