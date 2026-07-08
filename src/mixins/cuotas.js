export default {
	computed: {
		/*
		 * Prompt 266 (Fase 2, Capa 3): id del metodo de pago para el cual se estan mostrando las
		 * cuotas. Por defecto null (sin filtrar, comportamiento generico de siempre). Los
		 * componentes que ya conocen el metodo de pago seleccionado sobreescriben este computed
		 * (ver PaymentMethod-header y common/payment-methods/Cuotas) para habilitar el filtro por
		 * `cuota.payment_method_id`.
		 */
		payment_method_id_for_cuotas() {
			return null
		},
		cuotas() {
			// Lista completa de reglas de cuotas del negocio (sin filtrar).
			let todas_las_cuotas = this.$store.state.cuota.models

			// Sin metodo de pago conocido: se mantiene el comportamiento generico de siempre.
			if (!this.payment_method_id_for_cuotas) {
				return todas_las_cuotas
			}

			// Filtra: quedan las reglas genericas (payment_method_id vacio) y las especificas del
			// metodo de pago actual; se descartan las especificas de OTRO metodo de pago.
			let cuotas_aplicables = todas_las_cuotas.filter(cuota => {
				return !cuota.payment_method_id || cuota.payment_method_id == this.payment_method_id_for_cuotas
			})

			// Si para una misma cantidad_cuotas hay una regla especifica y una generica, gana la
			// especifica (ej: "Visa 3 cuotas +5%" sobre "3 cuotas generico +3%").
			let cuota_por_cantidad = {}
			cuotas_aplicables.forEach(cuota => {
				let actual = cuota_por_cantidad[cuota.cantidad_cuotas]
				if (!actual || (cuota.payment_method_id && !actual.payment_method_id)) {
					cuota_por_cantidad[cuota.cantidad_cuotas] = cuota
				}
			})

			return Object.values(cuota_por_cantidad)
		},
		cuotas_options() {
			let options = [{
				value: 0,
				text: 'Seleccione cuotas'
			}]

			this.cuotas.forEach(cuota => {

				options.push({
					value: cuota.id,
					text: this.cuota_text(cuota),
				})
			})

			return options
		},
	},
	methods: {
		cuota_text(cuota) {
			let text = cuota.cantidad_cuotas + ' cuotas'

			if (cuota.descuento) {
				text += ' (-'+cuota.descuento+'%)'
			}

			if (cuota.recargo) {
				text += ' (+'+cuota.recargo+'%)'
			}

			return text 
		}
	}
}