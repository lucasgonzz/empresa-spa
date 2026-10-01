<template>
	<!--
		El cartel de GUARDAR UN PRESUPUESTO: "¿Pasar a la cuenta corriente?" (mision
		presupuesto-contado-o-cuenta-corriente, 1/10/2026).

		Se monta UNA sola vez, en views/Vender.vue. BtnGuardar --que es quien dispara el guardado-- se
		monta en mas de un lugar (la barra inferior y el bloque del total), y un id de modal repetido
		rompe: cada copia solo le pide a este cartel que se abra, por id (guardar_presupuesto() en
		mixins/vender_presupuestos.js).

		Tres acciones, con la geometria de footer del sistema (la secundaria a la izquierda, lo que
		se confirma a la derecha, apiladas en el telefono):

		- "Sí, a la cuenta corriente": guarda como siempre, a la cuenta del cliente.
		- "No, se cobra al confirmar": abre el reparto de metodos de pago (el mismo modal del boton
		verde de Vender) y, con "Listo", guarda el presupuesto con ese reparto.
		- "Cancelar": no guarda nada ni toca nada.

		La que esta marcada con el color primario es la que ya tiene el presupuesto: un presupuesto
		de contado que se vuelve a editar arranca en "No". Las dos quedan siempre en el mismo lugar.
	-->
	<b-modal
	:id="modal_id"
	title="¿Pasar a la cuenta corriente?"
	dialog-class="budget-cobro-dialog"
	no-close-on-backdrop
	hide-header-close
	data-testid="budget-cobro"
	@shown="enfocar_la_respuesta_preseleccionada">

		<p class="budget-cobro__pregunta">
			Cuando se confirme este presupuesto, ¿la venta queda en la cuenta corriente de
			<b>{{ nombre_del_cliente }}</b> o se cobra en ese momento?
		</p>

		<ul class="budget-cobro__opciones">
			<li>
				<b>Sí:</b> la deuda se anota en la cuenta corriente del cliente.
			</li>
			<li>
				<b>No:</b> elegís ahora con qué métodos de pago va a pagar. Al confirmar el presupuesto
				se registra el cobro y no queda deuda.
			</li>
		</ul>

		<!-- Los botones van en el slot #modal-footer para que la franja y el separador los ponga _modals.sass -->
		<template #modal-footer>
			<div class="budget-cobro-footer">

				<b-button
				class="budget-cobro-footer__cancelar"
				variant="outline-secondary"
				data-testid="budget-cobro-cancelar"
				@click="cancelar">
					Cancelar
				</b-button>

				<b-button
				ref="boton_no"
				:variant="preseleccion_es_no ? 'primary' : 'outline-primary'"
				data-testid="budget-cobro-no"
				@click="responder_no">
					No, se cobra al confirmar
				</b-button>

				<b-button
				ref="boton_si"
				:variant="preseleccion_es_no ? 'outline-primary' : 'primary'"
				data-testid="budget-cobro-si"
				@click="responder_si">
					Sí, a la cuenta corriente
				</b-button>

			</div>
		</template>
	</b-modal>
</template>
<script>
import vender_presupuestos, {
	ID_MODAL_COBRO_DEL_PRESUPUESTO,
	ID_MODAL_REPARTO_DE_PAGOS,
} from '@/mixins/vender_presupuestos'
export default {
	name: 'BudgetCobro',
	/*
		El cartel es quien guarda el presupuesto despues de la respuesta, por eso trae el mixin que
		sabe hacerlo (crear / actualizar / el payload). Como el cartel se monta una sola vez, el
		guardado sale una sola vez.
	*/
	mixins: [vender_presupuestos],
	computed: {
		modal_id() {
			return ID_MODAL_COBRO_DEL_PRESUPUESTO
		},
		nombre_del_cliente() {
			return this.client && this.client.name ? this.client.name : 'este cliente'
		},
		/*
			Lo que ya tiene el presupuesto: 1 si es de contado (se reabrio para editarlo), 0 si va a
			la cuenta corriente --el default--. Solo cambia cual de las dos respuestas se pinta como
			la principal; no decide nada por el vendedor.
		*/
		preseleccion_es_no() {
			return !!Number(this.omitir_en_cuenta_corriente)
		},
	},
	mounted() {
		/*
			Tres avisos de afuera, y por que los tres:

			- `definido` lo manda el "Listo" del reparto (payment-methods/Buttons.vue) cuando el modal
			lo abrio este cartel. Hay que guardar.
			- `cancelado` lo manda el "Cancelar" del mismo modal. Hay que deshacer.
			- El cierre del modal de reparto SIN pasar por ninguno de los dos --Esc, que ese modal no
			bloquea-- tambien es cancelar. Sin escucharlo, la marca de "esperando el reparto" se
			quedaria prendida y el "Listo" de una venta comun terminaria guardando un presupuesto.
		*/
		this.$root.$on('vender:presupuesto-cobro-definido', this.al_definirse_el_cobro)
		this.$root.$on('vender:presupuesto-cobro-cancelado', this.al_cancelarse_el_cobro)
		this.$root.$on('bv::modal::hidden', this.al_cerrarse_un_modal)
	},
	beforeDestroy() {
		this.$root.$off('vender:presupuesto-cobro-definido', this.al_definirse_el_cobro)
		this.$root.$off('vender:presupuesto-cobro-cancelado', this.al_cancelarse_el_cobro)
		this.$root.$off('bv::modal::hidden', this.al_cerrarse_un_modal)

		// Se salio de Vender con el reparto abierto: la marca no puede sobrevivir a este cartel.
		if (this.$store.state.vender.budget_cobro_pendiente) {
			this.deshacer_cobro_del_presupuesto()
		}
	},
	methods: {
		/**
		 * "Sí, a la cuenta corriente": el presupuesto se guarda como siempre. Se limpia cualquier
		 * reparto que hubiera (un presupuesto de contado que se reedita lo trae cargado) y el total
		 * vuelve al bruto, porque el ajuste por metodo de pago era de ese reparto.
		 */
		responder_si() {
			this.recordar_cobro_previo_al_presupuesto()

			this.$store.commit('vender/set_omitir_en_cuenta_corriente', 0)
			this.$store.commit('vender/setSelectedPaymentMethods', [])
			this.$store.commit('vender/set_modal_payment_methods', [])

			this.setTotal()

			this.$bvModal.hide(this.modal_id)

			this.guardar_presupuesto_ahora()
		},
		/**
		 * "No, se cobra al confirmar": abre el reparto de metodos de pago. El presupuesto todavia
		 * no se guarda; lo guarda el "Listo" del reparto (al_definirse_el_cobro).
		 *
		 * Hace lo mismo que el boton verde de una venta antes de abrir el modal: el metodo unico, la
		 * caja y las cuotas se resetean, y los montos de descuento/recargo de un reparto anterior
		 * se descartan. Si no, el reparto arrancaria sobre un total que ya trae un ajuste viejo, o
		 * `setTotal()` ignoraria el del reparto nuevo (solo lo aplica sin metodo unico elegido).
		 */
		responder_no() {
			this.recordar_cobro_previo_al_presupuesto()

			this.$store.commit('vender/set_omitir_en_cuenta_corriente', 1)
			this.$store.commit('vender/setCurrentAcountPaymentMethodId', 0)
			this.$store.commit('vender/set_caja_id', 0)
			this.$store.commit('vender/setSelectedPaymentMethods', [])
			this.$store.commit('vender/set_modal_payment_methods', [])
			this.limpiar_cuotas()

			// El reparto arranca sobre el total BRUTO, sin el ajuste de un reparto anterior.
			this.setTotal()

			// Antes de abrir: el modal decide su titulo al abrirse leyendo esta marca.
			this.$store.commit('vender/set_budget_cobro_pendiente', true)

			this.$bvModal.hide(this.modal_id)
			this.$bvModal.show(ID_MODAL_REPARTO_DE_PAGOS)
		},
		/**
		 * "Cancelar": no se guarda nada y no se cambia nada. Antes de contestar el cartel el store
		 * todavia no se toco, asi que alcanza con cerrarlo.
		 */
		cancelar() {
			this.$bvModal.hide(this.modal_id)
		},

		/**
		 * "Listo" en el reparto que abrio este cartel: el cobro esta definido, se guarda.
		 * Sin la foto de lo anterior no hay pregunta en curso en este cartel y no se hace nada.
		 */
		al_definirse_el_cobro() {
			if (!this.cobro_previo_al_presupuesto) {
				return
			}

			this.guardar_presupuesto_ahora()
		},
		/**
		 * "Cancelar" en el reparto que abrio este cartel: la pantalla vuelve a como estaba.
		 */
		al_cancelarse_el_cobro() {
			this.deshacer_cobro_del_presupuesto()
		},
		/**
		 * Cualquier cierre del modal de reparto con la marca todavia prendida es una cancelacion:
		 * "Listo" y "Cancelar" la apagan antes de cerrar, asi que si llega prendida es Esc.
		 *
		 * @param {BvEvent} bv_event
		 * @param {String} modal_id
		 */
		al_cerrarse_un_modal(bv_event, modal_id) {
			if (modal_id !== ID_MODAL_REPARTO_DE_PAGOS) {
				return
			}

			if (!this.$store.state.vender.budget_cobro_pendiente) {
				return
			}

			this.deshacer_cobro_del_presupuesto()
		},

		/**
		 * Al abrirse el cartel el foco va a la respuesta preseleccionada, para que con el teclado
		 * (el atajo de guardar y Enter) se confirme lo que ya tenia el presupuesto.
		 */
		enfocar_la_respuesta_preseleccionada() {
			let boton = this.preseleccion_es_no ? this.$refs.boton_no : this.$refs.boton_si

			if (boton && boton.$el) {
				boton.$el.focus()
			}
		},
	},
}
</script>
<style lang="sass">
// Los modales de bootstrap-vue cuelgan de `body`, fuera de `#app`: los colores salen de tokens
// (`var(--color-...)`) y no de hexadecimales, o el cartel queda blanco en modo oscuro.

// Mas ancho que el modal por defecto (500px): los tres botones del footer (Cancelar y las dos
// respuestas, de ~85 + ~215 + ~215px, mas los huecos) suman unos 540px y el footer deja 40px de
// padding, asi que en una sola fila necesitan un dialogo de ~600px. A 640px entran con aire.
// El selector lleva dos clases para ganarle al `.modal-dialog` de bootstrap.
.modal-dialog.budget-cobro-dialog
	max-width: 640px

.budget-cobro__pregunta
	margin-bottom: 12px
	color: var(--color-text-primary)

.budget-cobro__opciones
	display: flex
	flex-direction: column
	gap: 8px
	margin: 0
	padding: 12px 14px
	list-style: none
	background: var(--bg-section)
	border: 1px solid var(--color-border)
	border-radius: 8px
	color: var(--color-text-secondary)
	font-size: 0.9rem

	b
		color: var(--color-text-primary)

// Geometria del footer del sistema (la misma de .vender-multipago-footer): la secundaria a la
// izquierda y las respuestas a la derecha. Si no entran en una fila, `wrap` las baja en vez de
// desbordar el modal.
.budget-cobro-footer
	display: flex
	flex-wrap: wrap
	align-items: center
	justify-content: flex-end
	gap: 10px
	width: 100%

	.budget-cobro-footer__cancelar
		margin-right: auto

// 576px es el breakpoint `sm` de bootstrap, el mismo que usa el resto del sistema. En el telefono
// los tres botones se apilan con lo principal arriba (column-reverse sobre el orden del DOM).
@media (max-width: 575.98px)
	.budget-cobro-footer
		flex-direction: column-reverse
		align-items: stretch

		.btn
			width: 100%

		.budget-cobro-footer__cancelar
			margin-right: 0
</style>
