<template>
    <div
    class="cc-footer">
        <!--
            Acciones secundarias a la izquierda, la confirmatoria a la derecha. Es la misma
            geometria que se fijo para el footer del modal de formulario (mision 2, 10/8/2026), y
            el motivo es el mismo: dos acciones de sentido distinto pegadas borde con borde es la
            forma mas facil de errarle al clic.
        -->
        <div
        class="cc-footer__grupo">
            <!--
                Las dos notas venian en rojo: una outline y la otra maciza. El rojo del sistema es
                el de lo destructivo (--btn-peligro-*, --caja-cerrar-*) y estas dos no lo son:
                asientan un movimiento mas en la cuenta. Y con tres botones de color en la misma
                franja no habia jerarquia, que es justo lo que un footer tiene que dar.
            -->
            <b-button
            class="cc-footer__btn"
            variant="light"
            v-b-modal="'current-acounts-nota-debito'">
                <i class="bi bi-file-earmark-plus"></i>
                Nota de debito
            </b-button>
            <b-button
            class="cc-footer__btn"
            variant="light"
            v-b-modal="'current-acounts-nota-credito'"
            data-tour="cuentas_corrientes.boton_nota_credito">
                <i class="bi bi-file-earmark-minus"></i>
                Nota de credito
            </b-button>
        </div>

        <!--
            Los dos botones llevan el MISMO data-testid a proposito: para quien los usa (persona o
            test) son el mismo boton, "registrar un pago". Lo que cambia entre las dos ramas es de
            donde sale el monto -- con un movimiento seleccionado, setToPay() lo precarga con el
            saldo de ESE movimiento; sin seleccion, arranca vacio --, y eso se distingue por el
            data-precargado, no por el nombre del boton (que ademas incluye el detalle del
            movimiento, texto variable).
        -->
        <b-button
        v-if="pago_para_esta"
        class="cc-footer__btn cc-footer__btn--acento"
        data-testid="btn-registrar-pago"
        data-tour="cuentas_corrientes.boton_registrar_pago"
        data-precargado="si"
        @click="setToPay()"
        variant="primary">
            <i class="bi bi-cash-coin"></i>
            <span class="cc-footer__btn-texto">
                Registrar pago para {{ pago_para_esta.detalle }}
            </span>
        </b-button>
        <b-button
        v-else
        class="cc-footer__btn cc-footer__btn--acento"
        data-testid="btn-registrar-pago"
        data-tour="cuentas_corrientes.boton_registrar_pago"
        data-precargado="no"
        @click="pago"
        variant="primary">
            <i class="bi bi-cash-coin"></i>
            <span class="cc-footer__btn-texto">
                Registrar pago
            </span>
        </b-button>
    </div>
</template>
<script>
import current_acounts from '@/mixins/current_acounts' 
export default {
    mixins: [current_acounts],
    computed: {
        pago_para_esta() {
            let status = ''
            if (this.selected_current_acounts.length) {
                status = this.selected_current_acounts[this.selected_current_acounts.length - 1].status
            }
            if (this.selected_current_acounts.length == 1 && (status == 'saldo_inicial' || status == 'sin_pagar' || status == 'pagandose')) {
                return this.selected_current_acounts[0]
            }
            return null
        },
    },
    methods: {
        setToPay() {
            this.$store.commit('current_acount/setToPay', this.selected_current_acounts[0])
            this.$bvModal.show('current-acounts-pago')
            setTimeout(() => {

                let current_acount_debito = this.selected_current_acounts[0]

                let saldo = current_acount_debito.debe
                
                if (current_acount_debito.pagandose) {
                    saldo -= Number(current_acount_debito.pagandose)
                }
                
                let input = document.getElementById('monto-pago')
                input.value = saldo

                input = document.getElementsByClassName('payment-method-amount')[0]                
                input.value = saldo
                input.focus()

                input.dispatchEvent(new Event('input', { bubbles: true }))
                
            }, 500)
        },
        pago() {
            this.$store.commit('current_acount/setToPay', null)
            this.$bvModal.show('current-acounts-pago')

            setTimeout(() => {
                let input = document.getElementById('monto-pago')
                input.value = ''
                input.focus()
            }, 500)
        }
    }
}
</script>
<style lang="sass">
// ══════════════════════════════════════════════════════════════════════════════════════════════
// FOOTER DEL MODAL DE CUENTA CORRIENTE (21/8/2026)
//
// Desde esta mision este bloque vive en el slot `#modal-footer` del b-modal y no suelto adentro
// del cuerpo, asi que la FRANJA --alto de 60px, radio de 16px abajo, separador y fondo-- ya se la
// da _modals.sass, igual que a cualquier otro modal del sistema. Aca solo va el reparto interno y
// el aspecto de los tres botones.
//
// Sin `scoped`: la raiz de este componente es hija del `.modal-footer`, y para repartir el ancho
// hace falta que el div ocupe la franja entera.
// ══════════════════════════════════════════════════════════════════════════════════════════════
.cuenta-corriente-modal .cc-footer
	display: flex
	flex-direction: row
	flex-wrap: wrap
	align-items: center
	justify-content: space-between
	// El footer del modal es flex y sus hijos no crecen solos: sin esto el bloque mide lo que
	// miden los botones y el reparto izquierda/derecha no existe.
	width: 100%
	gap: var(--cc-gap, 8px)

	.cc-footer__grupo
		display: flex
		flex-direction: row
		flex-wrap: wrap
		align-items: center
		gap: var(--cc-gap, 8px)

	.cc-footer__btn
		height: var(--cc-control-h, 36px)
		display: inline-flex
		align-items: center
		justify-content: center
		gap: 6px
		// El maximo es para el boton de acento, que lleva el detalle del movimiento adentro del
		// texto ("Registrar pago para Venta N°1234 del 12/08"): sin tope, un detalle largo empuja
		// al otro grupo fuera de la franja.
		max-width: 100%
		padding: 0 14px
		font-size: 0.875rem
		font-weight: 500
		line-height: 1
		border-radius: var(--cc-btn-radio, 10px)
		box-shadow: var(--cc-btn-sombra, rgba(99, 99, 99, 0.12) 0px 1px 3px 0px)
		white-space: nowrap
		transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease

		// Los iconos `icon-*` del sistema se dibujan con un ::before al que _generals.sass le
		// pone `top: .15em` y margenes laterales, pensado para un icono adentro de un parrafo.
		// En un boton flex el centrado lo da el contenedor, asi que se apaga. El reset va sobre
		// el ::before y no sobre el <i>: la regla global apunta al pseudoelemento, y sobre el <i>
		// no vencia nada. Los `bi bi-*` ni siquiera entran por ahi --el selector es
		// [class^='icon-'] y ellos empiezan con `bi`--, pero el resto de esta regla si los toca.
		i,
		i::before
			top: 0
			margin: 0
			line-height: 1
			flex-shrink: 0

	// El texto es lo unico que puede achicarse: el icono se queda entero.
	.cc-footer__btn-texto
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap

	// Neutro por defecto, mismo idioma que la barra de arriba del modal.
	.cc-footer__btn:not(.cc-footer__btn--acento)
		background: var(--bg-card)
		border: 1px solid var(--color-border)
		color: var(--color-text-primary)

		&:hover,
		&:focus,
		&:not(:disabled):not(.disabled):active
			background: var(--bg-hover)
			border-color: var(--color-border)
			color: var(--color-text-primary)

		i
			color: inherit

	// La unica accion con peso visual del footer.
	.cc-footer__btn--acento
		background: var(--color-primary)
		border: 1px solid var(--color-primary)
		// Literal a proposito: texto sobre el azul de accion, que es el mismo en los dos modos.
		color: #fff

		&:hover,
		&:focus,
		&:not(:disabled):not(.disabled):active
			background: var(--color-primary)
			border-color: var(--color-primary)
			color: #fff
			filter: brightness(0.94)

// En telefono la franja no entra en una linea: los tres botones se apilan y ocupan el ancho, que
// es lo unico que deja apretarlos con el pulgar sin errarle. El min-height del footer lo pone
// _modals.sass y crece solo, no hace falta tocarlo.
@media screen and (max-width: 575.98px)
	.cuenta-corriente-modal .cc-footer
		flex-direction: column
		align-items: stretch

		.cc-footer__grupo
			flex-wrap: nowrap

		.cc-footer__grupo .cc-footer__btn
			flex: 1 1 0
			min-width: 0

		.cc-footer__btn--acento
			width: 100%
</style>
