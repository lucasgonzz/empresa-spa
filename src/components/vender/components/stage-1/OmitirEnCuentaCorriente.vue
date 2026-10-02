<template>
	<!-- El `v-if` sobre `client` es el que manda: sin cliente elegido este toggle no existe, asi
	que el paso del tour que lo senala va SIEMPRE despues del paso del cliente.

	Con "Guardar como presupuesto" prendido (o un presupuesto cargado para editar) el toggle se
	VE pero deshabilitado y con el texto que lo explica: en un presupuesto esto no se decide
	aca sino al guardar, con el cartel "¿Pasar a la cuenta corriente?".

	Historia de esta condicion: hasta el 18/9/2026 el toggle directamente desaparecia en un
	presupuesto y el valor que tuviera viajaba igual. Ese dia Lucas decidio que un presupuesto
	iba SIEMPRE a la cuenta corriente (el presupuesto no guardaba ningun dato de cobro) y el
	toggle paso a verse deshabilitado, en 0, diciendolo. El 1/10/2026 el presupuesto paso a
	guardar el reparto de metodos de pago y Lucas pidio poder elegir: sigue deshabilitado --el
	cobro de un presupuesto es una pregunta al guardar, no un interruptor suelto que se
	olvida prendido--, pero ya no dice que "va siempre a la cuenta corriente", que es falso.
	Refleja el valor del store: 1 si es un presupuesto de contado que se reabrio. -->
	<div
	v-if="client"
	data-tour="vender.toggle_omitir_cuenta_corriente"
	class="vender-toggle-row">

		<!-- Toggle estilo iPhone enlazado al computed con setter -->
		<label
		class="vender-toggle"
		:class="{ 'vender-toggle--disabled': disabled }"
		:title="es_presupuesto ? 'En un presupuesto se define al guardarlo: te pregunta si pasa a la cuenta corriente o se cobra al confirmarlo' : ''"
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
				En un presupuesto el toggle esta deshabilitado y el texto dice por que: no hay hover
				en el telefono para leer el title. Antes decia "van siempre a la cuenta corriente"
				(decision del 18/9/2026); desde el 1/10/2026 el cobro se define al guardar.
			*/
			if (this.es_presupuesto) {
				return texto + ' (se define al guardar el presupuesto)'
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
				En un presupuesto este control no se toca: si va a la cuenta corriente o se cobra al
				confirmarlo lo decide el cartel de "Guardar presupuesto" (budget-cobro/Index.vue), que
				es la unica puerta, y de ahi sale el valor que viaja. El toggle de "Guardar como
				presupuesto" lo deja en 0 al prenderse y un presupuesto cargado trae el suyo (1 si es de
				contado); aca solo se bloquea el control. Hasta el 30/9/2026 el motivo era otro: la
				decision del 18/9 de que un presupuesto va SIEMPRE a la cuenta corriente.
			*/
			if (this.es_presupuesto) {
				return true
			}

			return false
		}
	},
}
</script>
