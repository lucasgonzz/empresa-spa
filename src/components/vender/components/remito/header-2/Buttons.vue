<template>
	<sale-print-buttons
	:sale="sale"></sale-print-buttons>
</template>
<script>
import vender from '@/mixins/vender'
import previus_sales from '@/mixins/previus_sales'
import print_sale from '@/mixins/print_sale'
export default {
	mixins: [print_sale],
	components: {
		SalePrintButtons: () => import('@/components/common/SalePrintButtons'),
	},
	computed: {
		maked_sale() {
			return this.$store.state.vender.sale 
		},
		previus_sale() {
			return this.$store.state.vender.previus_sales.previus_sale
		},
		index_previus_sale() {
			return this.$store.state.vender.previus_sales.index
		},
		sale() {
			if (this.index_previus_sale > 0) {
				return this.previus_sale
			} else if (this.maked_sale) {
				return this.maked_sale
			}
			return null
		}
	}
}
</script>