<template>
	<!-- El `v-if` sobre `client` es el que manda: sin cliente elegido este toggle no existe, asi
	que el paso del tour que lo senala va SIEMPRE despues del paso del cliente.

	Con "Guardar como presupuesto" prendido (o un presupuesto cargado para editar) el toggle se
	VE pero deshabilitado, en 0 y con el texto que lo explica: un presupuesto va siempre a la
	cuenta corriente del cliente (decision de Lucas, 18/9/2026). Hasta esa fecha el toggle
	directamente desaparecia y el valor que tuviera viajaba igual en el presupuesto. -->
	<div
	v-if="client"
	data-tour="vender.toggle_omitir_cuenta_corriente"
	class="vender-toggle-row">

		<!-- Toggle estilo iPhone enlazado al computed con setter -->
		<label
		class="vender-toggle"
		:class="{ 'vender-toggle--disabled': disabled }"
		:title="es_presupuesto ? 'Un presupuesto va siempre a la cuenta corriente del cliente' : ''"
		for="toggle-omitir-cc">
			<input
			type="checkbox"
			data-testid="venta-omitir-cuenta-corriente"
			id="toggle-omitir-cc"
			:disabled="disabled"
			:checked="omitir_en_cuenta_corriente == 1"
			@change="omitir_en_cuenta_corriente = $event.target.checked ? 1 : 0">
			<span class="vender-toggle__track">
				<span class="vender-toggle__thumb"></span>
			</span>
		</label>

		<span
		class="vender-toggle__label"
		id="omitir_en_cuenta_corriente">
			{{ text }}
		</span>

	</div>
</template>
<script>
import default_payment_method from '@/mixins/vender/default_payment_method'
export default {
	mixins: [default_payment_method],
	computed: {
		text() {
			let texto = this.owner.text_omitir_cc ? this.owner.text_omitir_cc : 'Omitir cuenta corriente'

			/*
				En un presupuesto el toggle esta deshabilitado y en 0, y el texto dice por que: no
				hay hover en el telefono para leer el title.
			*/
			if (this.es_presupuesto) {
				return texto + ' (no aplica a presupuestos: van siempre a la cuenta corriente)'
			}

			return texto
		},
		/**
		 * Lo que se esta armando es un presupuesto: el toggle "Guardar como presupuesto" esta
		 * prendido, o hay un presupuesto cargado para editar (Actualizar en VENDER).
		 *
		 * @returns {boolean}
		 */
		es_presupuesto() {
			return !!this.guardar_como_presupuesto || this.budget !== null
		},
		omitir_en_cuenta_corriente: {
			set(value) {
				this.$store.commit('vender/set_omitir_en_cuenta_corriente', value)
				if (value == 1) {
					/*
						Sin force_reset, a proposito. La mision 56 pedia pasarlo en true para que
						el checkbox siguiera funcionando en edicion, pero el propio control esta
						deshabilitado cuando se edita una venta guardada (ver `disabled` mas
						abajo): ese caso no existe. Y con force_reset en true se saltearia tambien
						el guard viejo, el que conserva el metodo que el usuario ya habia elegido
						en una venta NUEVA — o sea que el unico efecto real seria pisar una
						seleccion del usuario.
					*/
					this.setDefaultPaymentMethod()
				} else {

					this.bloquear_metodo_de_pago()
					this.bloquear_caja()
					
				}
			},
			get() {
				return this.$store.state.vender.omitir_en_cuenta_corriente
			}
		},
		previus_sale() {
			return this.$store.state.vender.previus_sales.previus_sale
		},
		budget() {
			return this.$store.state.vender.budget
		},
		guardar_como_presupuesto() {
			return this.$store.state.vender.guardar_como_presupuesto
		},
		client() {
			return this.$store.state.vender.client
		},
		editando_venta_previa() {
			return this.$store.getters['vender/previus_sales/editando_venta_previa']
		},
		disabled() {
			if (this.editando_venta_previa) {
				return true
			}

			/*
				Un presupuesto no se puede omitir de la cuenta corriente: al confirmarlo la venta va
				siempre a la cuenta del cliente (BudgetHelper::saveSale() en el back). El valor lo
				pone en 0 el toggle de "Guardar como presupuesto" al prenderse (o el presupuesto
				cargado, que nace en 0); aca solo se bloquea el control.
			*/
			if (this.es_presupuesto) {
				return true
			}

			return false
		}
	},
}
</script>
