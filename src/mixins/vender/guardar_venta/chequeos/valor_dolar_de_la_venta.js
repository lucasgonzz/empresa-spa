import cotizacion_dolar_por_defecto from '@/mixins/vender/cotizacion_dolar_por_defecto'
export default {
	mixins: [cotizacion_dolar_por_defecto],
	methods: {

		/**
		 * Una venta en dolares no sale sin cotizacion: la API la rechaza con 422 (antes: "Division
		 * by zero" o un costo en cero), asi que se corta ACA con un mensaje que el vendedor pueda
		 * accionar, antes de mandar nada.
		 *
		 * Si la cotizacion esta vacia o en cero (el operador borro el campo), se carga la del sistema
		 * (`owner.dollar`, por defecto de Vender) y NO se guarda en el mismo paso: al cambiar la
		 * cotizacion cambian los precios de los renglones en dolares, y el vendedor tiene que verlos
		 * antes de confirmar. Si el comercio no tiene dolar configurado, se le pide que lo cargue.
		 *
		 * Una venta en pesos no pasa por aca: `valor_dolar` puede venir vacio sin problema.
		 *
		 * @returns {boolean} true si se puede seguir guardando.
		 */
		check_valor_dolar_de_la_venta() {

			if (Number(this.$store.state.vender.moneda_id) !== 2) {
				return true
			}

			if (Number(this.$store.state.vender.valor_dolar) > 0) {
				return true
			}

			if (this.cargar_dolar_por_defecto()) {

				this.setTotal()

				this.$toast.error('La cotización del dólar estaba vacía: se cargó la del sistema ($' + this.valor_dolar_por_defecto + '). Revisá el total y volvé a guardar.', {
					duration: 8000,
				})

				return false
			}

			this.$toast.error('La venta es en dólares y falta la cotización del dólar. Cargala en el campo USD de la venta (o en la cotización del dólar del sistema) y volvé a guardar.', {
				duration: 8000,
			})

			return false
		},
	},
}
