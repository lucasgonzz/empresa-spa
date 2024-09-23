<template>
	<b-col
	v-if="se_puede_actualizar_venta()"
	cols="12"
	lg="6"
	class="j-end">
		<div class="m-l-5 d-none d-sm-block">
			<b-button-group>
				<btn-loader
				:loader="loading_previus"
				icon="left"
				:block="false"
				@clicked="setIndexAndCallgetSale(true)" />
				<btn-loader
				:disabled="index_previus_sales < 2"
				icon="right"
				:block="false"
				:loader="loading_next"
				@clicked="setIndexAndCallgetSale(false)" />
				<btn-loader
				v-if="index_previus_sales > 0 || budget"
				text="Cancelar"
				:block="false"
				:loader="false"
				@clicked="cancelPreviusSale"
				variant="outline-danger" />
			</b-button-group>
		</div>
	</b-col>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
import Vender from '@/mixins/vender'
import previus_sales from '@/mixins/previus_sales'
export default {
	name: 'PreviusSales',
	components: {
		BtnLoader
	},
	mixins: [Vender, previus_sales],
	computed: {
		previus_sale() {
			return this.$store.state.vender.previus_sales.previus_sale
		},
		loading_previus() {
			return this.$store.state.vender.previus_sales.loading_previus
		},
		loading_next() {
			return this.$store.state.vender.previus_sales.loading_next
		},
		articles() {
			return this.$store.state.vender.articles
		},
		special_prices() {
			return this.$store.state.special_prices.special_prices
		},
		budget() {
			return this.$store.state.vender.budget
		},
		offset() {
			if (this.special_prices.length) {
				return 0
			}
			return 3
		},
	},
	methods: {
		setIndexAndCallgetSale(from_previus) {
			if (from_previus) {
				this.$store.commit('vender/previus_sales/incrementIndex')
			} else {
				this.$store.commit('vender/previus_sales/decrementIndex')
			}
			this.$store.commit('vender/previus_sales/setLoadingPrevius', true)
			this.callGetSale()
		},
	}
}
</script>