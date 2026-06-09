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
					<btn-loader
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
					v-if="sale_details.order.cupon.percetage">
						Cupon del {{ sale_details.order.cupon.percetage }}%
					</span>
					<span
					v-else>
						Cupon de ${{ sale_details.order.cupon.amount }}
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
					- {{ discount.pivot.percentage }}% {{ discount.name }}
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
					+ {{ surchage.pivot.percentage }}% {{ surchage.name }}
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
				Esta venta fue facturada dentro de una consolidación de facturación
			</strong>
			<br>
			La factura AFIP se emitió a través de la venta consolidada N° {{ sale_details.consolidacion_facturacion_id }}.
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
		</b-alert>
	</b-row>
</template>
<script>
import previus_sale from '@/mixins/vender/previus_sale/index'
import se_puede_actualizar from '@/mixins/vender/previus_sale/se_puede_actualizar'
import print_sale from '@/mixins/print_sale'
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
		/**
		 * Indica si la venta puede editarse desde este modal.
		 *
		 * @returns {boolean}
		 */
		can_edit_sale() {
			return this.se_puede_actualizar_venta(this.sale_details)
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
	methods: {
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
			let link = process.env.VUE_APP_API_URL+'/sale/delivered-articles-pdf/'+this.sale_details.id 
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
	&__group--print
		position: relative
		z-index: 30
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
			color: #6c757d
			background-color: transparent
			border-color: #6c757d

			&:hover,
			&:focus,
			&.show
				color: #fff
				background-color: #6c757d
				border-color: #6c757d

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