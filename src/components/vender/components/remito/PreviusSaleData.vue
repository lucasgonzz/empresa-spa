<template>
	<b-row
	class="m-b-15 m-t-15"
	v-if="index > 0">
		<b-col
		cols="12"
		class="j-end">
			<div class="btn-group">
				<button 
				v-if="previus_sale.client" 
				class="btn btn-dark">
					<i class="icon-user"></i>
					{{ previus_sale.client.name }}
				</button>
				<button 
				v-if="previus_sale.num" 
				class="btn btn-info">
					<i class="icon-clipboard"></i>
					Rto n° {{ previus_sale.num }}
				</button>
				<button 
				v-if="previus_sale.created_at" 
				class="btn btn-primary">
					{{ since(previus_sale.created_at) }}
				</button>

				<btn-loader
				v-if="index_previus_sales > 0 || budget"
				text="Cancelar"
				:block="false"
				:loader="false"
				@clicked="cancelPreviusSale"
				variant="outline-danger" />
			</div>
		</b-col>
	</b-row>
</template>
<script>
import previus_sales from '@/mixins/vender/previus_sale/index'
export default {
	name: 'PreviusSaleData',
	mixins: [previus_sales],
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	computed: {
		index() {
			return this.$store.state.vender.previus_sales.index
		},
		previus_sale() {
			return this.$store.state.vender.previus_sales.previus_sale
		},
		total() {
			return this.$store.state.vender.total
		},
		budget() {
			return this.$store.state.vender.budget
		},
	}
}
</script>