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
		:text="text_btn"
		:loader="loader"
		size="lg"
		dusk="btn_vender"
		@clicked="saveSale" />
	</b-col>
</b-row>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
import previus_sales from '@/mixins/vender/previus_sale/index'
import guardar_venta from '@/mixins/vender/guardar_venta/index'
import vender_presupuestos from '@/mixins/vender_presupuestos'
export default {
	name: 'ButtonClients',
	components: {
		BtnLoader,
	},
	mixins: [previus_sales, guardar_venta, vender_presupuestos],
	methods: {
		saveSale() {
			if (!this.loader && this.check()) {
				if (this.guardar_como_presupuesto) {
					this.guardar_presupuesto()
				} else if (this.index_previus_sales == 0) {
					this.guardar_venta(false)
				} else {
					this.updateSale()
				}
			}
		},
		check() {
			if (this.guardar_como_presupuesto) {
				if (!this.client) {
					this.$toast.error('Indique un CLIENTE para el Presupuesto')
					return false
				}
			}
			if (typeof this.previus_sale.id != 'undefined' && this.previus_sale.to_check && !this.checked) {
				this.$toast.error('Indique la venta como checkeada')
				return false
			}
			if (typeof this.previus_sale.id != 'undefined' && this.previus_sale.checked && !this.to_check && !this.confirmed) {
				this.$toast.error('Indique la venta para checkear')
				return false
			}

			if (typeof this.previus_sale.id != 'undefined' && !this.checkear_metodos_de_pago_en_previus_sale()) {
				return false
			}

			return true
		},
	},
	computed: {
		guardar_como_presupuesto() {
			return this.$store.state.vender.guardar_como_presupuesto
		},
		text_btn() {
			if (this.guardar_como_presupuesto) {
				return 'Guardar Presupuesto'
			}
			if (this.index_previus_sales == 0) {
				return 'Guardar venta'
			}
			return 'ACTUALIZAR venta'
		},
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

		updating() {
			return this.$store.state.vender.previus_sales.updating
		},
		updating() {
			return this.$store.state.vender.previus_sales.updating
		},
		index_previus_sales() {
			return this.$store.state.vender.previus_sales.index
		},
		vendiendo() {
			return this.$store.state.vender.vendiendo
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