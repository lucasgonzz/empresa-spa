<template>
<b-col 
v-if="items.length"
cols="12"
class="j-end align-start"
lg="6">

	<vuelto-efectivo></vuelto-efectivo>


	<btn-loader 
	:disabled="loader"
    class="venta-total-box"
	icon="check"
	:text="text_btn"
	:loader="loader"
	dusk="btn_vender"
	@clicked="saveSale">
		Guardar venta
	</btn-loader>

</b-col>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
import previus_sales from '@/mixins/vender/previus_sale/index'
import guardar_venta from '@/mixins/vender/guardar_venta/index'
import vender_presupuestos from '@/mixins/vender_presupuestos'
export default {
	name: 'ButtonClients',
	components: {
		VueltoEfectivo: () => import('@/components/vender/components/remito/VueltoEfectivo'),
		BtnLoader,
	},
	mixins: [previus_sales, guardar_venta, vender_presupuestos],
    mounted() {
        window.addEventListener("keydown", this.detectarTecla);
    },
    beforeDestroy() {
        window.removeEventListener("keydown", this.detectarTecla);
    },
	methods: {
        detectarTecla(event) {
        	console.log('detectarTecla')
            // Comprobar si la tecla presionada es F2
            if (event.key === "F2") {
                event.preventDefault(); // Evita que el navegador intercepte F2
                this.saveSale();
            }
        },
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
				// return 'COBRAR'
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
<style lang="sass">
button.venta-total-box
	width: auto
	height: 80px
	width: 200px
	font-size: 1.4rem
	font-weight: bold
</style>