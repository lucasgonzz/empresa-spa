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
			🔴 La caja por defecto se re-aplica cuando la caja de este select VUELVE A SER la que viaja
			en la venta (necesita_caja_unica pasa de false a true), y no solo cuando cambia el metodo de
			pago (mision caja-al-salir-de-cuenta-corriente, 4/10/2026).

			Por que no alcanza el watcher de payment_method_id de arriba: elegir un cliente en el
			buscador pone la caja en 0 (bloquear_caja en SelectClient.vue::setSelected) pero deja el
			metodo de pago como estaba, porque ahi bloquear_metodo_de_pago esta comentado. Al sacar el
			cliente el metodo se "restaura" escribiendo el MISMO valor que ya tenia
			(habilitar_metodo_de_pago commitea 3 sobre un 3): el valor no cambia, ese watcher no dispara
			y la caja se quedaba en "Seleccione caja". El guardado frenaba con "Indique una CAJA para
			esta venta" hasta que el vendedor volviera a elegir el metodo a mano.

			Por que no se arregla en SelectClient.vue::clearSelected: sacar el cliente con la cruz es
			solo UNO de los caminos por los que la caja unica vuelve a hacer falta. Este watcher cubre:
			- sacar el cliente de una venta que iba a la cuenta corriente;
			- prender "Omitir cuenta corriente" con un cliente elegido: OmitirEnCuentaCorriente.vue
			  llama a setDefaultPaymentMethod() sin forzar, que no toca un metodo que ya esta puesto;
			- limpiar_vender despues de una venta a cuenta corriente o de guardar un presupuesto: saca
			  el cliente, apaga el presupuesto y vacia el reparto, pero no toca la caja (su set_caja_id
			  esta comentado), asi que la venta SIGUIENTE arrancaba sin caja;
			- apagar "Guardar como presupuesto" despues de haber sacado el cliente: con el toggle
			  prendido la caja unica no hacia falta, y sacar el cliente no cambiaba eso;
			- el reparto de metodos de pago que se vacia: la caja unica vuelve a ser la que viaja.
			Colgar el efecto del HECHO --la caja de este select vuelve a hacer falta-- y no de cada
			valor que se restaura los cubre a todos, y a cualquier camino que se agregue despues.
			Arreglarlo en cada llamador es como se olvida el proximo.

			Solo la transicion false -> true: cuando la caja unica deja de hacer falta la apaga quien
			corresponde (bloquear_caja, el reparto, el cartel del presupuesto) y este watcher no tiene
			que pelearse con eso.
		*/
		necesita_caja_unica(value, old_value) {
			if (value && !old_value) {
				this.aplicar_caja_por_defecto_si_falta()
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
			falsy de omitir: asi el watcher de necesita_caja_unica re-aplica la caja justo cuando el
			guardado la vuelve a exigir. Si cambia una, cambia la otra.
		*/
		va_a_cuenta_corriente() {
			return !!this.client && !this.omitir_en_cuenta_corriente
		},
		/*
			true cuando la caja de este select es la que viaja en la venta: la venta se cobra con un
			solo metodo de pago y una sola caja. Hacen falta las tres:
			- que no vaya a la cuenta corriente (va_a_cuenta_corriente, arriba);
			- que no sea un presupuesto (toggle prendido o presupuesto cargado): ahi la caja de cada
			  cobro la define cada fila del reparto que abre el cartel de guardar, y
			  budget-cobro/Index.vue::responder_no pasa "omitir" a 1 con metodo y caja en 0 a
			  proposito;
			- que no haya un reparto de metodos de pago activo: cada pago lleva su propia caja y la
			  caja unica queda en 0 (ver PaymentMethod.vue::set_payment_methods).
		*/
		necesita_caja_unica() {
			return !this.va_a_cuenta_corriente && !this.en_modo_presupuesto && !this.selected_payment_methods.length
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
		 * Aplica la caja por defecto cuando la caja de este select vuelve a hacer falta (ver el
		 * watcher de necesita_caja_unica), SOLO si no hay una caja puesta.
		 *
		 * 🔴 Una caja que ya esta puesta se respeta: no todos los caminos que eligen un cliente
		 * pasan por bloquear_caja. La busqueda por CUIT (stage-1/buscar-por-cuit/ModalResult.vue,
		 * useClient) y el modal de clientes (modals/clients/Clients.vue, setClient) commitean el
		 * cliente derecho al store sin tocar la caja. Y el toggle "Guardar como presupuesto" solo la
		 * pone en 0 si se prende con "omitir" en 1: prendido con "omitir" en 0, o al apagarse, no
		 * la toca. En esos casos la caja que hay la eligio el vendedor (o ya es la por defecto), y
		 * pisarla al volver seria cambiarle algo que no pidio.
		 *
		 * 🔴 Y la bandera venta_en_curso_inicializada se deja como estaba. El set_caja_id que termina
		 * haciendo set_caja_por_defecto() la prende (store/vender/vender.js: "Configuracion decidida
		 * para esta venta"), pero aplicar un default no es una decision del vendedor. Importa
		 * despues de limpiar_vender, que la apaga a proposito como ULTIMA linea: este watcher corre
		 * en el nextTick, DESPUES de eso. Si quedara prendida, al volver a entrar a Vender el
		 * created() de views/Vender.vue no re-aplicaria los defaults de la venta nueva, entre ellos
		 * la fecha de HOY.
		 *
		 * Lo demas -venta guardada en edicion, presupuesto cargado, y leer metodo, sucursal y moneda
		 * actuales- ya lo resuelve set_caja_por_defecto() de este componente.
		 */
		aplicar_caja_por_defecto_si_falta() {

			if (this.caja_id) {
				return
			}

			let inicializada = this.$store.state.vender.venta_en_curso_inicializada

			this.set_caja_por_defecto()

			if (!inicializada) {
				this.$store.commit('vender/set_venta_en_curso_inicializada', false)
			}
		},
	}
}
</script>
