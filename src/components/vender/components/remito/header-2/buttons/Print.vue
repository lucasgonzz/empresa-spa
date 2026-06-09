<template>

	<div>

		<sale-print-buttons

		ref="print_buttons_inner"

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

		SalePrintButtons: () => import('@/common-vue/sale-print-buttons/Index.vue'),

	},

	data() {

		return {

			/* Reloj reactivo para calcular visibilidad del botón imprimir */

			now: moment(),

		}

	},

	mounted() {

		/* Actualizar reloj cada segundo */

		this.interval = setInterval(() => {

			this.now = moment()

		}, 1000)



		/* Imprimir vía atajo configurado (keyboard_shortcuts.js emite este evento) */

		this.$root.$on('vender:print-shortcut', this.on_print_shortcut)

	},

	beforeDestroy() {

		clearInterval(this.interval)

		this.$root.$off('vender:print-shortcut', this.on_print_shortcut)

	},

	methods: {

		/**

		 * Ejecuta la impresión configurada al recibir el atajo de teclado.

		 */

		on_print_shortcut() {

			if (!this.sale || !this.$refs.print_buttons_inner) {

				return

			}



			const print_options = this.$store.state.vender.keyboard_print_options



			this.$refs.print_buttons_inner.execute_vender_print_shortcut(print_options, this.sale)

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

		},

	},

}

</script>


