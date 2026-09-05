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
		}
	}
}
</script>
