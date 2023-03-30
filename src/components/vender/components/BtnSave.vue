<template>
<b-row
v-if="items.length"
class="j-center m-t-25">
	<b-col 
	cols="12"
	lg="6">
		<btn-loader 
		class="m-b-30"
		icon="check"
		text="Guardar venta"
		:loader="loader"
		size="lg"
		@clicked="saveSale" />
	</b-col>
</b-row>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
import previus_sales from '@/mixins/previus_sales'
import vender from '@/mixins/vender'
export default {
	name: 'ButtonClients',
	components: {
		BtnLoader,
	},
	mixins: [previus_sales, vender],
	methods: {
		saveSale() {
			if (this.index_previus_sales == 0) {
				this.vender(false)
			} else {
				this.updateSale()
			}
		},
	},
	computed: {
		save_afip_ticket: {
			get() {
				return this.$store.state.vender.save_afip_ticket
			},
			set(value) {
				this.$store.commit('vender/setSaveAfipTicket', value)
			}
		},
		items() {
			return this.$store.state.vender.items
		},
		loader() {
			if (this.index_previus_sales == 0) {
				return this.vendiendo
			}
			return this.updating
		}
	}
}
</script>