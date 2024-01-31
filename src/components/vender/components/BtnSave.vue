<template>
<b-row
v-if="items.length"
class="j-center m-t-25">
	<b-col 
	cols="12"
	lg="6">
		<btn-loader 
		:disabled="loader"
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
			console.log('se llamo saveSale')
			if (!this.loader && this.check()) {
				if (this.index_previus_sales == 0) {
					console.log('llamando a vender')
					this.vender(false)
				} else {
					this.updateSale()
				}
			}
		},
		check() {
			if (this.previus_sale.id != 'undefined' && this.previus_sale.to_check && !this.checked) {
				this.$toast.error('Indique la venta como checkeada')
				return false
			}
			if (this.previus_sale.id != 'undefined' && this.previus_sale.checked && !this.to_check && !this.confirmed) {
				this.$toast.error('Indique la venta para checkear')
				return false
			}
			return true
		}
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