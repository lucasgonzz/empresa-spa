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

            Con VARIOS movimientos seleccionados (mision pago-cc-multiples-movimientos, 22/10/2026)
            el boton es el mismo, con el mismo testid y el mismo data-precargado: lo unico que
            cambia es el texto ("Registrar pago para 4 movimientos") y que el monto precargado es la
            suma de los saldos.
        -->
        <!--
            Mision cc-consolidar-desde-cuenta-corriente (23/10/2026): a la derecha van las acciones
            que se hacen sobre lo seleccionado. "Consolidar" es neutro y "Registrar pago" sigue
            siendo la unica con acento: el pago es la accion principal del modal.
        -->
        <div
        class="cc-footer__grupo cc-footer__grupo--acciones">
        <b-button
        v-if="puede_consolidar"
        class="cc-footer__btn"
        variant="light"
        data-testid="btn-consolidar-ventas"
        @click="consolidar">
            <i class="bi bi-layers"></i>
            <span class="cc-footer__btn-texto">
                {{ texto_de_consolidar }}
            </span>
        </b-button>
        <b-button
        v-if="movimientos_a_pagar"
        class="cc-footer__btn cc-footer__btn--acento"
        data-testid="btn-registrar-pago"
        data-tour="cuentas_corrientes.boton_registrar_pago"
        data-precargado="si"
        @click="setToPay()"
        variant="primary">
            <i class="bi bi-cash-coin"></i>
            <span class="cc-footer__btn-texto">
                Registrar pago para {{ texto_del_pago }}
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
    </div>
</template>
<script>
import current_acounts from '@/mixins/current_acounts' 
import {
    movimientos_a_pagar,
    suma_de_saldos,
} from '@/utils/pago_a_varios_movimientos'
import {
    movimientos_de_venta,
    motivo_para_no_consolidar,
    ventas_sin_repetir,
} from '@/utils/consolidar_desde_cuenta_corriente'
export default {
    mixins: [current_acounts],
    props: {
        // Id del modal de consolidacion que monta el Index de esta cuenta corriente (ver Index.vue).
        // Sin id no hay a donde mandar la seleccion, y el boton de consolidar no se ofrece.
        consolidar_modal_id: {
            type: String,
            default: null,
        },
    },
    computed: {
        /**
         * Las ventas seleccionadas, o null si la seleccion no es solo de ventas.
         *
         * @returns {Array|null}
         */
        ventas_a_consolidar() {
            return movimientos_de_venta(this.selected_current_acounts)
        },
        /**
         * El boton de consolidar se ofrece con la extension prendida, en la cuenta corriente de un
         * CLIENTE (la de un proveedor no tiene ventas) y con una seleccion de ventas. Si alguna no
         * se puede consolidar, el clic lo explica (como en Ventas) en vez de esconder el boton.
         *
         * @returns {boolean}
         */
        puede_consolidar() {
            return !!this.consolidar_modal_id
                && this.hasExtencion('consolidar_ventas_en_factura')
                && this.from_model_name == 'client'
                && !!this.ventas_a_consolidar
        },
        texto_de_consolidar() {
            let cantidad = ventas_sin_repetir(this.ventas_a_consolidar).length
            return cantidad == 1
                ? 'Consolidar venta en una factura'
                : 'Consolidar ' + cantidad + ' ventas en una factura'
        },
        /**
         * Los movimientos contra los que se puede registrar el pago, del mas viejo al mas nuevo, o
         * null si la seleccion no sirve.
         *
         * Antes era "exactamente UN movimiento seleccionado". Ahora sirve cualquier seleccion de
         * uno o mas movimientos donde TODOS sean debitos pendientes (saldo inicial, sin pagar o
         * pagandose): una mezcla --una venta con una nota de credito, o con algo ya pagado-- no se
         * puede imputar, y el boton vuelve a "Registrar pago" a secas, como siempre con una
         * seleccion invalida. Con uno solo se comporta exactamente como antes.
         *
         * @returns {Array|null}
         */
        movimientos_a_pagar() {
            return movimientos_a_pagar(this.selected_current_acounts)
        },
        /**
         * Lo que sigue a "Registrar pago para": el detalle del movimiento si es uno solo, o la
         * cantidad si son varios (el detalle de cuatro ventas no entra en el boton).
         *
         * @returns {string}
         */
        texto_del_pago() {
            if (this.movimientos_a_pagar.length == 1) {
                return this.movimientos_a_pagar[0].detalle
            }
            return this.movimientos_a_pagar.length + ' movimientos'
        },
    },
    methods: {
        /**
         * Valida la seleccion y abre el modal de consolidacion precargado con esas ventas: el
         * mismo modal y el mismo store que usa Ventas ("Seleccion > Consolidar para facturar").
         */
        consolidar() {
            let movimientos = this.ventas_a_consolidar
            let motivo = motivo_para_no_consolidar(movimientos, this.from_model.id)

            if (motivo) {
                this.$bvToast.toast(motivo, {
                    title: 'Consolidar ventas',
                    variant: 'warning',
                    solid: true,
                })
                return
            }

            let ventas = ventas_sin_repetir(movimientos)

            this.$store.commit('sale/consolidar_facturacion/prepararDesdeVentasSeleccionadas', {
                client_id: this.from_model.id,
                ventas: ventas,
                sale_ids: ventas.map(venta => venta.id),
            })
            this.$bvModal.show(this.consolidar_modal_id)
        },
        setToPay() {
            // Se congela la seleccion al apretar: dentro del setTimeout de abajo la lista ya podria
            // haber cambiado, y el monto precargado tiene que ser el de lo que se mando a pagar.
            let movimientos = this.movimientos_a_pagar

            // El primero (el mas viejo) sigue viajando como `to_pay` en cualquier caso. setToPay
            // vacia la lista, asi que la lista de varios se fija DESPUES.
            this.$store.commit('current_acount/setToPay', movimientos[0])
            if (movimientos.length >= 2) {
                this.$store.commit('current_acount/setToPayList', movimientos)
            }
            this.$bvModal.show('current-acounts-pago')
            setTimeout(() => {

                let saldo

                if (movimientos.length >= 2) {
                    // La suma de los saldos, a centavos: PaymentMethods.vue (total_a_repartir) hace
                    // la misma cuenta, y si difieren el modal abre con un sobrante distinto de cero.
                    saldo = suma_de_saldos(movimientos)
                } else {
                    let current_acount_debito = movimientos[0]

                    saldo = current_acount_debito.debe
                    
                    if (current_acount_debito.pagandose) {
                        saldo -= Number(current_acount_debito.pagandose)
                    }
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

		// Las acciones de la derecha (consolidar + pagar) no entran en una linea de telefono: cada
		// una ocupa todo el ancho, con el pago al final.
		.cc-footer__grupo--acciones
			flex-wrap: wrap

			.cc-footer__btn
				flex: 1 1 100%
</style>
