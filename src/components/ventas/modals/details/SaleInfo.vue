<template>
	<b-row>
		<b-col
		cols="12">
			<div
			class="sale-details-buttons">
				<btn-loader
				v-if="se_puede_actualizar_venta(sale_details)"
				dusk="btn_actualizar_venta"
				class="m-r-10"
				text="Actualizar venta"
				:block="false"
				:loader="loading_index"
				@clicked="setPreviusSale(sale_details)" />
			
				<btn-actualizar-precios-actuales></btn-actualizar-precios-actuales>

				<b-button-group
				v-if="hasExtencion('acopios')"
				class="m-r-10">
					
					<b-button
					@click="printDeliveredArticles"
					variant="danger">
						<i class="icon-print"></i>
					</b-button>
					<b-button
					@click="show_unidades_entregadas"
					variant="outline-danger">
						U entregadas
					</b-button>
				</b-button-group>

				<sale-print-buttons
				:sale="sale_details"></sale-print-buttons>

				<btn-facturar></btn-facturar>

				<btn-nota-credito></btn-nota-credito>

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
		// ClientInfo: () => import('@/components/common/ClientInfo'),
	},
	data() {
		return {
			loading: false,
		}
	},
	computed: {
		sale_details() {
			return this.$store.state.sale.model 
		},
	},
	methods: {
		
		show_unidades_entregadas() {
			console.log('show_unidades_entregadas')
			this.$bvModal.show('unidades-entregadas')
		},
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
.sale-details-title 
	display: flex
	flex-direction: row
	justify-content: space-between
	p 
		font-size: 1.5em 
	div
		display: flex
		align-items: center
.sale-details-buttons
	display: flex  
	flex-direction: row
	justify-content: flex-start
	.btn 
		@media screen and (max-width: 992px)
			margin-bottom: 15px
</style>