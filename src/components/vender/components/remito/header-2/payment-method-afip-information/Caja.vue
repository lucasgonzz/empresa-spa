<template>
		
	<b-input-group
	v-if="cajas.length && !selected_payment_methods.length"
	prepend="Caja">
		<!--
			🔴 Este select ofrece SOLO las cajas abiertas (`cajas_abiertas` en mixins/vender/cajas.js).
			Con todas cerradas se dibuja habilitado y vacio, sin decir por que.
		-->
		<b-form-select 
		data-testid="venta-caja"
		:disabled="disabled"
		v-model="caja_id" 
		:options="get_caja_options(vender_payment_method_id, address_id, moneda_id)"></b-form-select> 
	</b-input-group>
</template>
<script>
import cajas from '@/mixins/vender/cajas'
import caja_por_defecto from '@/mixins/caja_por_defecto'
export default {
	mixins: [cajas, caja_por_defecto],
	watch: {
		payment_method_id() {

            this.set_caja_por_defecto()
			
		},
		address_id() {
			
			this.set_caja_por_defecto()
            
		},
		moneda_id() {
			
			this.set_caja_por_defecto()
            
		},
		/*
			🔴 La caja por defecto se re-aplica cuando la venta DEJA DE IR a la cuenta corriente, y no
			solo cuando cambia el metodo de pago (mision caja-al-salir-de-cuenta-corriente, 4/10/2026).

			Elegir un cliente pone la caja en 0 (bloquear_caja en SelectClient.vue::setSelected) pero
			deja el metodo de pago como estaba, porque ahi bloquear_metodo_de_pago esta comentado. Al
			salir de la cuenta corriente el metodo se "restaura" escribiendo el MISMO valor que ya tenia
			(habilitar_metodo_de_pago commitea 3 sobre un 3): el valor no cambia, el watcher de
			payment_method_id de arriba no dispara y la caja se quedaba en "Seleccione caja". El
			guardado frenaba con "Indique una CAJA para esta venta" hasta que el vendedor volviera a
			elegir el metodo a mano.

			No se arregla en SelectClient.vue::clearSelected porque sacar el cliente con la cruz es solo
			UNO de los caminos que salen de la cuenta corriente. Los otros:
			- prender "Omitir cuenta corriente" con un cliente elegido: OmitirEnCuentaCorriente.vue
			  llama a setDefaultPaymentMethod() sin forzar, que no toca un metodo que ya esta puesto;
			- limpiar_vender, al guardar o cancelar la edicion de una venta a cuenta corriente: saca el
			  cliente y no toca la caja, asi que la venta SIGUIENTE arrancaba sin caja.
			Colgar el efecto del HECHO --la venta dejo de ir a la cuenta corriente-- y no del valor que
			se restaura los cubre a todos, y a cualquier camino que se agregue despues. Arreglarlo en
			cada llamador es como se olvida el proximo.

			Solo la transicion true -> false: al entrar a la cuenta corriente la caja la apaga quien
			corresponde (bloquear_caja) y este watcher no tiene que pelearse con eso.
		*/
		va_a_cuenta_corriente(value, old_value) {
			if (old_value && !value) {
				this.aplicar_caja_al_dejar_la_cuenta_corriente()
			}
		},
	},
	computed: {
		moneda_id() {
			return this.$store.state.vender.moneda_id
		},
		address_id() {
			return this.$store.state.vender.address_id
		},
		payment_method_id() {
			return this.$store.state.vender.current_acount_payment_method_id
		},
		budget() {
			return this.$store.state.vender.budget
		},
		cajas() {
			return this.$store.state.caja.models
		},
		// pagado_al_contado() {
		// 	return !this.client || this.omitir_en_cuenta_corriente
		// },
		disabled() {
			/*
				En un presupuesto la caja de cada cobro se elige en el reparto de metodos de pago que
				abre el cartel de guardar (cada fila lleva la suya): este select queda deshabilitado
				SIEMPRE, tambien con "omitir en cuenta corriente" en 1. Ver PaymentMethod.vue.
			*/
			if (this.en_modo_presupuesto) {
				return true
			}
			if (
				this.client 
				&& (
					!this.omitir_en_cuenta_corriente
					|| this.budget
				)
			) {
				return true 
			}
			return false
		},
		/* true cuando lo que se arma es un presupuesto (toggle prendido o presupuesto cargado). */
		en_modo_presupuesto() {
			return this.$store.getters['vender/en_modo_presupuesto']
		},
		selected_payment_methods() {
			return this.$store.state.vender.selected_payment_methods
		},
		vender_payment_method_id() {
			return this.$store.state.vender.current_acount_payment_method_id
		},
		client() {
			return this.$store.state.vender.client 
		},
		omitir_en_cuenta_corriente() {
			return this.$store.state.vender.omitir_en_cuenta_corriente 
		},
		/*
			true mientras la venta va a la cuenta corriente del cliente: hay cliente elegido y "omitir
			cuenta corriente" esta apagado.

			🔴 Es EXACTAMENTE la condicion con la que check_cajas
			(mixins/vender/guardar_venta/chequeos/cajas.js) deja de pedir caja, incluido el criterio
			falsy de omitir: asi el watcher de va_a_cuenta_corriente re-aplica la caja justo cuando el
			guardado la vuelve a exigir. Si cambia una, cambia la otra.
		*/
		va_a_cuenta_corriente() {
			return !!this.client && !this.omitir_en_cuenta_corriente
		},
		caja_id: {
			get() {
				return this.$store.state.vender.caja_id
			}, 
			set(value) {
				this.$store.commit('vender/set_caja_id', value)
			}
		},
	},
	methods: {
		/**
		 * Asigna la caja por defecto del metodo de pago y la sucursal.
		 *
		 * 🔴 Este metodo PISA al del mixin `cajas`: en Vue los methods del componente ganan sobre
		 * los del mixin, asi que adentro de este componente el guard del mixin no corre nunca y
		 * hay que repetirlo aca. Sin esto, los watchers de arriba —que miran justo los valores que
		 * la venta guardada commitea al cargarse— le cambiarian la caja a una venta que ya tiene
		 * la suya.
		 */
		set_caja_por_defecto() {

			if (
				this.$store.getters['vender/previus_sales/editando_venta_previa']
				|| this.$store.state.vender.budget
			) {
				return
			}

			console.log('set_caja_por_defecto')

			let address_id = this.$cookies.get('address_id')

			let caja_por_defecto = this.get_caja_por_defecto(this.payment_method_id, address_id, this.moneda_id) 

            if (caja_por_defecto && this.cajas.length) {
				this.caja_id = caja_por_defecto.id
            }
		},
		/**
		 * Re-aplica la caja por defecto cuando la venta deja de ir a la cuenta corriente (ver el
		 * watcher de va_a_cuenta_corriente).
		 *
		 * No hace nada en los dos casos en que la caja unica queda en 0 A PROPOSITO:
		 * - un presupuesto (toggle prendido o presupuesto cargado): la caja de cada cobro la define
		 *   cada fila del reparto que abre el cartel de guardar, y budget-cobro/Index.vue::responder_no
		 *   pasa "omitir" a 1 con metodo y caja en 0 justamente por eso;
		 * - un reparto de metodos de pago activo: cada pago lleva su propia caja (ver
		 *   PaymentMethod.vue::set_payment_methods, que deja la caja unica en 0).
		 *
		 * Lo demas -venta guardada en edicion, presupuesto cargado, y leer metodo, sucursal y moneda
		 * actuales- ya lo resuelve set_caja_por_defecto() de este componente.
		 */
		aplicar_caja_al_dejar_la_cuenta_corriente() {

			if (this.en_modo_presupuesto) {
				return
			}

			if (this.selected_payment_methods.length) {
				return
			}

			this.set_caja_por_defecto()
		},
	}
}
</script>
