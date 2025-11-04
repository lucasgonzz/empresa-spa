<template>
	<div>
		<sale-print-buttons
		ref="print_buttons"
		v-if="show"
		:sale="sale">
		</sale-print-buttons>
	</div>
</template>

<script>
import print_sale from '@/mixins/print_sale'
import moment from 'moment'

export default {
	mixins: [print_sale],
	components: {
		SalePrintButtons: () => import('@/components/common/SalePrintButtons'),
	},
	data() {
		return {
			now: moment() // guardamos un "reloj" reactivo
		}
	},
	mounted() {
		// actualizamos el reloj cada segundo
		this.interval = setInterval(() => {
			this.now = moment()
		}, 1000)
	},
	beforeDestroy() {
		// limpiamos el intervalo
		clearInterval(this.interval)
        window.removeEventListener("keydown", this.detectarTecla);
	},
    mounted() {
        window.addEventListener("keydown", this.detectarTecla);
    },
	methods: {
		detectarTecla(event) {
			if (event.key === 'F4' && this.$refs.print_buttons) {
                this.$refs.print_buttons.nuevo_ticket(this.sale)
                // this.$refs.print_buttons.ticketPdf(this.sale)

            }
		},
	},
	computed: {
		show() {
			if (this.user && this.owner.hide_sale_print_in_vender) {

				return this.diffEnSegundos <= 30
			}
			return true
		},
		diffEnSegundos() {
			if (this.maked_sale && this.maked_sale.created_at) {
				let venta_creada = moment(this.maked_sale.created_at)
				return this.now.diff(venta_creada, 'seconds')
			}
			return 100
		},
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
