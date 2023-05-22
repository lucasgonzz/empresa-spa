<template>
	<b-row>
		<b-col
		cols="12">
			<div
			class="sale-details-buttons">
				<btn-loader
				class="m-r-10"
				text="Actualizar venta"
				:block="false"
				:loader="loading_index"
				@clicked="updateSale(sale_details)" />
				<b-button
				v-b-modal="'update-prices'"
				class="m-r-10"
				variant="outline-primary">
					Actualizar precios
				</b-button>
				<b-button
				class="m-r-10"
				v-if="hasExtencion('acopios')"
				@click="printDeliveredArticles"
				variant="outline-danger">
					<i class="icon-print"></i>
					U entregadas
				</b-button>
				<sale-print-buttons
				:sale="sale_details"></sale-print-buttons>
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
		class="m-t-15"
		v-if="!sale_details.save_current_acount && !sale_details.budget && !sale_details.order_production">
			<p>
				Esta venta no genero movimiento en la cuenta corriente de {{ sale_details.client.name }}
			</p>
			<btn-loader 
			:block="false" 
			@clicked="saveCurrentAcount"
			:loader="loading"
			text="Generar cuenta corriente" />
		</div>
		<!-- <client-info
		class="m-15"
		v-if="sale_details.client"
		:client="sale_details.client"></client-info> -->
	</b-row>
</template>
<script>
import previus_sales from '@/mixins/previus_sales'
import print_sale from '@/mixins/print_sale'
export default {
	mixins: [previus_sales, print_sale],
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
		SalePrintButtons: () => import('@/components/common/SalePrintButtons'),
		// ClientInfo: () => import('@/components/common/ClientInfo'),
	},
	data() {
		return {
			loading: false,
			loading_index: false,
		}
	},
	computed: {
		sale_details() {
			return this.$store.state.sale.model 
		},
	},
	methods: {
		printDeliveredArticles() {
			let link = process.env.VUE_APP_API_URL+'/sale/delivered-articles-pdf/'+this.sale_details.id 
			window.open(link)
		},
		updateSale(sale) {
			this.loading_index = true 
			this.$api.get('previus-next-index/sale/'+sale.id)
			.then(res => {
				this.loading_index = false
				this.$store.commit('vender/previus_sales/setIndex', res.data.index)
				this.callGetSale()
				this.$router.push({name: 'vender', params: {view: 'remito'}})
			})
			.catch(err => {
				this.loading_index = false
				console.log(err)
			})
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
	.btn 
		@media screen and (max-width: 992px)
			margin-bottom: 15px
</style>