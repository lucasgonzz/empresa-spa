<template>
	<b-row>
		<b-col
		cols="12">
			<!-- Barra de acciones en línea, agrupada por función -->
			<div
			class="sale-details-buttons">
				<!-- Grupo: impresión y WhatsApp -->
				<div
				class="sale-details-buttons__group sale-details-buttons__group--print">
					<sale-print-buttons
					:sale="sale_details"></sale-print-buttons>
				</div>

				<span
				v-if="show_acopios_actions"
				class="sale-details-buttons__divider"
				aria-hidden="true"></span>

				<!-- Grupo: acopios -->
				<b-button-group
				v-if="show_acopios_actions"
				size="sm"
				class="sale-details-buttons__group">
					<b-button
					@click="printDeliveredArticles"
					variant="outline-secondary"
					title="Imprimir unidades entregadas">
						<i class="bi bi-printer"></i>
					</b-button>
					<b-button
					@click="show_unidades_entregadas"
					variant="outline-secondary"
					title="Unidades entregadas">
						<i class="bi bi-list-check"></i>
						U. entregadas
					</b-button>
				</b-button-group>

				<span
				v-if="can_edit_sale"
				class="sale-details-buttons__divider"
				aria-hidden="true"></span>

				<!-- Grupo: edición de la venta -->
				<b-button-group
				v-if="can_edit_sale"
				size="sm"
				class="sale-details-buttons__group">
					<!--
						Este boton no abre un formulario: CARGA la venta en Vender como
						`previus_sale`, que es el unico camino para editarla. Ver
						SaleHelper::motivo_por_el_que_no_se_puede_editar() para cuando se puede.
					-->
					<btn-loader
					data-testid="btn-actualizar-venta"
					data-tour="ventas.boton_editar_venta"
					dusk="btn_actualizar_venta"
					text="Actualizar venta"
					icon_class="bi bi-pencil-square"
					size="sm"
					variant="outline-primary"
					:block="false"
					:loader="loading_index"
					@clicked="setPreviusSale(sale_details)" />

					<btn-actualizar-precios-actuales></btn-actualizar-precios-actuales>
				</b-button-group>

				<span
				class="sale-details-buttons__divider"
				aria-hidden="true"></span>

				<!-- Grupo: facturación -->
				<b-button-group
				size="sm"
				class="sale-details-buttons__group">
					<btn-facturar></btn-facturar>
					<btn-nota-credito></btn-nota-credito>
				</b-button-group>
			</div>
		</b-col>
		<b-col 
		cols="12">
			<div
			class="m-t-15"
			v-if="sale_details.order">
				<p
				class="m-b-0 m-t-15">
					Pertenece al pedido online N° {{ sale_details.order.num }}
				</p>
				<p
				v-if="sale_details.order.cupon"
				class="m-b-0 m-t-15">
					<span
					v-if="sale_details.order.cupon.percentage">
						Cupon del {{ porcentaje_es(sale_details.order.cupon.percentage) }}%
					</span>
					<span
					v-else>
						Cupon de {{ price(sale_details.order.cupon.amount) }}
					</span>
				</p>
			</div>
			<div
			class="m-t-15"
			v-if="sale_details.discounts.length">
				<p
				class="m-b-0"
				v-for="discount in sale_details.discounts"
				:key="'dis-'+discount.id">
					- {{ porcentaje_es(discount.pivot.percentage) }}% {{ discount.name }}
				</p>
				<p
				v-if="sale_details.services.length && sale_details.discounts_in_services">
					Se aplican descuentos en los servicios
				</p>
				<p
				v-if="sale_details.services.length && !sale_details.discounts_in_services">
					No se aplican descuentos en los servicios
				</p>
			</div>
			<div
			class="m-t-15"
			v-if="sale_details.surchages.length">
				<p
				class="m-b-0"
				v-for="surchage in sale_details.surchages"
				:key="'sur-'+surchage.id">
					+ {{ porcentaje_es(surchage.pivot.percentage) }}% {{ surchage.name }}
				</p>
				<p
				v-if="sale_details.services.length && sale_details.surchages_in_services">
					Se aplican recargos en los servicios
				</p>
				<p
				v-if="sale_details.services.length && !sale_details.surchages_in_services">
					No se aplican recargos en los servicios
				</p>
			</div>
		</b-col>
		<div 
		class="m-t-15 m-l-15"
		v-if="sale_details.omitir_en_cuenta_corriente && sale_details.client">
			<p>
				Esta venta no genero movimiento en la cuenta corriente de {{ sale_details.client.name }}
			</p>
		</div>

		<!-- Aviso cuando esta venta fue incluida en una consolidación de facturación -->
		<b-alert
		show
		variant="info"
		class="m-t-15 m-l-15 m-r-15"
		v-if="sale_details.consolidacion_facturacion_id">
			<strong>
				<i class="icon-clipboard"></i>
				Esta venta está incluida en una consolidación
			</strong>
			<br>
			<b-button
			v-if="consolidada"
			size="sm"
			variant="link"
			class="p-0 text-left"
			:disabled="cargando_venta_vinculada"
			@click="abrir_venta_vinculada(consolidada.id)">
				{{ texto_consolidada }}
			</b-button>
			<span v-else-if="cargando_vinculos" role="status">Cargando factura consolidada…</span>
			<span v-else>El detalle de la factura consolidada no está disponible.</span>
		</b-alert>

		<!-- Aviso cuando esta venta ES la consolidadora -->
		<b-alert
		show
		variant="warning"
		class="m-t-15 m-l-15 m-r-15"
		v-if="sale_details.is_consolidacion_facturacion">
			<strong>
				<i class="icon-layers"></i>
				Esta es una venta de consolidación de facturación
			</strong>
			<br>
			No representa una venta real: fue creada para agrupar varias ventas en un único comprobante AFIP.
			No genera movimientos en cuenta corriente ni descuenta stock.
			<div class="m-t-10">
				<strong>Ventas de origen</strong>
				<ul v-if="ventas_de_origen.length" class="mb-0 pl-3">
					<li v-for="venta in ventas_de_origen" :key="venta.id">
						<b-button
						size="sm"
						variant="link"
						class="p-0 text-left"
						:disabled="cargando_venta_vinculada"
						@click="abrir_venta_vinculada(venta.id)">
							Abrir venta N° {{ venta.num || venta.id }}
						</b-button>
					</li>
				</ul>
				<p v-else-if="cargando_vinculos" class="mb-0" role="status">Cargando ventas de origen…</p>
				<p v-else class="mb-0">El detalle de las ventas de origen no está disponible.</p>
			</div>
		</b-alert>
	</b-row>
</template>
<script>
import previus_sale from '@/mixins/vender/previus_sale/index'
import se_puede_actualizar from '@/mixins/vender/previus_sale/se_puede_actualizar'
import print_sale from '@/mixins/print_sale'
import { env } from '@/runtime_config'
export default {
	mixins: [previus_sale, print_sale, se_puede_actualizar],
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
		SalePrintButtons: () => import('@/components/common/SalePrintButtons'),
		BtnFacturar: () => import('@/components/ventas/modals/details/BtnFacturar'),
		BtnNotaCredito: () => import('@/components/ventas/modals/details/BtnNotaCredito'),
		BtnActualizarPreciosActuales: () => import('@/components/ventas/modals/details/BtnActualizarPreciosActuales'),
	},
	data() {
		return {
			loading: false,
			vinculos_consolidacion: {},
			cargando_vinculos: false,
			cargando_venta_vinculada: false,
		}
	},
	computed: {
		/**
		 * Venta cargada en el store del modal de detalle.
		 *
		 * @returns {Object}
		 */
		sale_details() {
			return this.$store.state.sale.model 
		},
		consolidada() {
			return this.vinculos_consolidacion.consolidada
		},
		ventas_de_origen() {
			return this.vinculos_consolidacion.ventas_de_origen || []
		},
		texto_consolidada() {
			const comprobante = (this.consolidada.afip_tickets || []).find(ticket => ticket.cbte_numero)
			return comprobante
				? 'Abrir factura consolidada N° ' + comprobante.cbte_numero
				: 'Abrir venta consolidada N° ' + (this.consolidada.num || this.consolidada.id)
		},
		/**
		 * Indica si la venta puede editarse desde este modal. Ademas de lo que ya exige
		 * se_puede_actualizar_venta() (permiso, no facturada, no cerrada, no movio caja),
		 * exige que la venta no tenga un reparto en multiples metodos de pago.
		 *
		 * @returns {boolean}
		 */
		can_edit_sale() {
			return this.se_puede_editar_venta(this.sale_details)
		},
		/**
		 * Indica si se muestran acciones de acopios.
		 *
		 * @returns {boolean}
		 */
		show_acopios_actions() {
			return this.hasExtencion('acopios')
		},
	},
	watch: {
		sale_details: {
			immediate: true,
			handler(venta) {
				this.cargar_vinculos(venta)
			},
		},
	},
	methods: {
		cargar_vinculos(venta) {
			this.vinculos_consolidacion = {}
			this.cargando_vinculos = false
			if (!venta || !venta.id || (!venta.consolidacion_facturacion_id && !venta.is_consolidacion_facturacion)) {
				return
			}

			if (venta.vinculos_consolidacion) {
				this.vinculos_consolidacion = venta.vinculos_consolidacion
				return
			}

			this.cargando_vinculos = true
			this.consultar_venta_con_vinculos(venta.id)
			.then(res => {
				if (this.sale_details === venta && res.data.model) {
					this.vinculos_consolidacion = res.data.model.vinculos_consolidacion || {}
				}
			})
			.catch(() => {
				// La venta actual sigue visible si falla la consulta de sus vínculos.
			})
			.finally(() => {
				if (this.sale_details === venta) {
					this.cargando_vinculos = false
				}
			})
		},
		abrir_venta_vinculada(venta_id) {
			const origen = this.sale_details
			this.cargando_venta_vinculada = true
			this.consultar_venta_con_vinculos(venta_id)
			.then(res => {
				if (!res.data.model || !res.data.model.vinculos_consolidacion) {
					throw new Error('Venta vinculada no disponible')
				}
				if (this.sale_details === origen && !this._isDestroyed) {
					this.setModel(res.data.model, 'sale', [], false, false)
				}
			})
			.catch(() => {
				if (this.sale_details === origen && !this._isDestroyed) {
					this.$toast.error('No se pudo abrir la venta vinculada.')
				}
			})
			.finally(() => {
				this.cargando_venta_vinculada = false
			})
		},
		consultar_venta_con_vinculos(venta_id) {
			return this.$api.get('sale/' + venta_id, {
				params: { vinculos_consolidacion: 1 },
				skip_global_error_event: true,
			})
		},
		/**
		 * Abre el modal de unidades entregadas de la venta.
		 */
		show_unidades_entregadas() {
			console.log('show_unidades_entregadas')
			this.$bvModal.show('unidades-entregadas')
		},
		/**
		 * Abre el PDF de unidades entregadas en acopio.
		 */
		printDeliveredArticles() {
			let link = env('VUE_APP_API_URL')+'/sale/delivered-articles-pdf/'+this.sale_details.id 
			window.open(link)
		},
		saveCurrentAcount() {
			this.loading = true 
			this.$api.put('sale/save-current-acount/'+this.sale_details.id)
			.then(res => {
				console.log(res)
				this.loading = false 
				this.$toast.success('Cuenta corriente actualizada')
				this.$store.commit('sale/add', res.data.model)
				this.$bvModal.hide('sale-details')
			})
			.catch(err => {
				this.loading = false 
				this.$toast.error('Error al actualizar cuenta corriente')
				console.log(err)
			})
		}
	}
}
</script>
<style lang="sass">
.sale-details-buttons
	display: flex
	flex-flow: row nowrap
	align-items: center
	width: 100%
	overflow: visible
	padding: 6px 0

	/* Separador vertical entre grupos */
	&__divider
		display: inline-block
		width: 1px
		height: 22px
		background: var(--color-border-tertiary, #dee2e6)
		margin: 0 8px
		flex-shrink: 0
		opacity: 0.9

	/* Contenedor de cada grupo en la fila */
	&__group
		display: inline-flex
		flex: 0 0 auto
		align-items: center
		white-space: nowrap

	/* Impresión: mantener dropdown y WhatsApp en línea sin recortar el menú */
	/* z-index alto porque este grupo crea su propio stacking context: si queda por debajo del z-index:900 del thead sticky de .common-table (tabla genérica de artículos), el header de esa tabla tapa el dropdown de impresión sin importar el z-index interno del menú. */
	&__group--print
		position: relative
		z-index: 1060
		overflow: visible

		::v-deep > div
			display: inline-flex !important
			flex-direction: row !important
			align-items: center
			width: auto !important
			overflow: visible

		::v-deep .j-start
			display: inline-flex
			align-items: center
			gap: 4px
			width: auto
			overflow: visible

		::v-deep .dropdown
			position: relative
			overflow: visible

		::v-deep .dropdown.show
			z-index: 1060

		/* Dropdown y WhatsApp al mismo tamaño y estilo del resto de la barra */
		::v-deep .dropdown .btn,
		::v-deep .btn-success
			padding: 0.25rem 0.5rem
			font-size: 0.875rem
			line-height: 1.5

		::v-deep .dropdown .btn-danger
			color: var(--color-text-secondary, #6c757d)
			background-color: transparent
			border-color: var(--color-text-secondary, #6c757d)

			&:hover,
			&:focus,
			&.show
				color: #fff
				background-color: var(--color-text-secondary, #6c757d)
				border-color: var(--color-text-secondary, #6c757d)

		::v-deep .btn-success
			color: #198754
			background-color: transparent
			border-color: #198754

			&:hover,
			&:focus
				color: #fff
				background-color: #198754
				border-color: #198754

	/* Botones uniformes dentro de la barra */
	::v-deep .btn
		display: inline-flex
		align-items: center
		justify-content: center
		gap: 4px
		white-space: nowrap

		.bi
			line-height: 1
			font-size: 0.95em

	/* Anular márgenes legacy de componentes hijos */
	::v-deep .m-l-10,
	::v-deep .m-l-15,
	::v-deep .m-r-10,
	::v-deep .m-r-15
		margin-left: 0 !important
		margin-right: 0 !important
</style>
