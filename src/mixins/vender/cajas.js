export default {
	computed: {
		// cajas() {
		// 	return this.$store.state.caja.models 
		// },
		vender_address_id() {
			return this.$store.state.vender.address_id 
		},
		// default_payment_method_cajas() {
		// 	return this.$store.state.default_payment_method_caja.models 
		// },
	},
	data() {
		return {
			cajas_habilitadas: 0,
			count_se_habilitaron_las_cajas: {
				payment_method_id: 0,
				address_id: 0,
				count: 0,
			},
		}
	},
	/*
		🔴 Aca habia tres watchers (payment_methods, addresses y cajas) sobre tres computeds que
		este mixin declaraba bajo la clave `comptued` -- un typo, asi que Vue nunca los registro
		como computeds (tanda 2 de la mision vender-lista-obligatoria, 18/9/2026).

		- `payment_methods` y `addresses` no existen en NINGUN componente que mezcle este mixin
		  (ni en sus mixins, ni en los globales app/generals): esos dos watchers nunca corrieron y
		  se borraron junto con el bloque `comptued`. No se renombro el bloque a `computed` a
		  proposito: eso los habria prendido por primera vez, que es un cambio de comportamiento
		  y no una correccion.
		- `cajas` SI existe en todos lados, pero no por este mixin: es un computed GLOBAL
		  (src/mixins/model_functions.js, que common-vue/mixins/app.js mete en Vue.mixin), y
		  Caja.vue y current-acounts/pago/PaymentMethods.vue ademas declaran el suyo. Por eso
		  este watcher esta VIVO y se queda: es el que aplica la caja por defecto cuando el
		  catalogo de cajas llega DESPUES de montar Vender (lo normal al entrar a /vender recien
		  logueado), y cuando se abre o cierra una caja. Sacarlo dejaba la venta nueva sin caja
		  por defecto hasta que el operador tocara el metodo de pago o la sucursal.
	*/
	watch: {
		cajas() {
			this.set_caja_por_defecto()
		},
	},
	methods: {
		/**
		 * Asigna la caja por defecto del metodo de pago y la sucursal a una venta NUEVA.
		 *
		 * @param {boolean} force_reset true: accion explicita, aplica igual en edicion.
		 */
		set_caja_por_defecto(force_reset = false) {

			/*
				Una venta guardada trae su caja y no se le cambia por atras.

				Se lee el getter del store y no un computed: este mixin no incluye
				mixins/vender/computed, asi que `this.editando_venta_previa` seria undefined y el
				guard no cortaria nunca — que es exactamente el modo de falla silencioso que esta
				mision viene a cerrar.
			*/
			if (!force_reset && (this.$store.getters['vender/previus_sales/editando_venta_previa'] || !!this.$store.state.vender.budget)) {
				return
			}

			console.log('---------------------')
			console.log('set_caja_por_defecto')
			console.log('---------------------')

			let address_id = this.$cookies.get('address_id')

			let payment_method_id = this.$store.state.vender.current_acount_payment_method_id

			let caja_id = this.get_caja_por_defecto(payment_method_id, address_id)

			/*
				El catalogo se lee del store y no de `this.cajas`: este mixin nunca declaro ese
				computed (ver el bloque de arriba del watch) y hasta ahora funcionaba solo porque
				el computed global de src/mixins/model_functions.js se llama igual. Con
				Array.isArray no depende de que ese global exista ni de que el store ya haya
				inicializado la coleccion.
			*/
			let cajas = this.$store.state.caja.models

			if (caja_id && Array.isArray(cajas) && cajas.length) {
				this.$store.commit('vender/set_caja_id', caja_id)
			}
		},

        // get_caja_por_defecto(payment_method_id, address_id) {


        //     // Obtén la caja por defecto
        //     let caja_default = this.default_payment_method_cajas.find(caja_default => {
        //         return caja_default.current_acount_payment_method_id == payment_method_id 
        //             && caja_default.address_id == address_id
        //     })

        //     // Si existe una caja por defecto, ordénala primero
        //     if (caja_default) {

        //         return caja_default.caja_id 
        //     }
        // },
		set_cajas_habilitadas(payment_method_id, address_id) {

			console.log('set_cajas_habilitadas')

			this.count_se_habilitaron_las_cajas.payment_method_id = payment_method_id
			
			this.count_se_habilitaron_las_cajas.address_id = this.vender_address_id

			this.count_se_habilitaron_las_cajas.count++

			this.cajas_habilitadas = this.cajas_abiertas.filter(caja => {

				if (caja.current_acount_payment_methods.length) {

					let payment_method_vender = caja.current_acount_payment_methods.find(payment_method => {
						
						return payment_method.id == payment_method_id
					})

					return typeof payment_method_vender != 'undefined'
				}

				return true
				
			})

			// Obtén la caja por defecto
			// let caja_default = this.default_payment_method_cajas.find(caja_default => {
			// 	return caja_default.current_acount_payment_method_id == payment_method_id 
			// 		&& caja_default.address_id == this.vender_address_id
			// })

			// Si existe una caja por defecto, ordénala primero
			// if (caja_default) {

			// 	// this.$store.commit('vender/set_caja_id', caja_default.caja_id)
				
			// 	this.cajas_habilitadas.sort((a, b) => {
			// 		if (a.id === caja_default.caja_id) return -1
			// 		if (b.id === caja_default.caja_id) return 1
			// 		return 0
			// 	})
			// }

		},
		// get_caja_options(payment_method_id, address_id) {

		// 	let options = [{
		// 		value: 0,
		// 		text: 'Seleccione caja'
		// 	}]

		// 	this.cajas_abiertas.forEach(caja => {

		// 		options.push({
		// 			value: caja.id,
		// 			text: caja.name,
		// 		})
		// 	})

		// 	return options
		// },
	}
}