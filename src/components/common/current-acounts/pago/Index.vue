<template>
<b-modal
v-if="from_model"
id="current-acounts-pago"
data-tour="cuentas_corrientes.modal_pago"
title="Pago">

    <!--
        El total encabeza el modal en vez de ser un campo mas en el medio de la lista: es el numero
        que se viene a mirar y no se tipea --sale de la suma de los metodos de pago de mas abajo
        (update_total)--.

        🔴 SIGUE SIENDO UN <input disabled>, y no un <span>, a proposito. La suite de e2e lo lee con
        `.inputValue()` (e2e/tests/compra-costeo-facturacion.spec.js) y el valor tiene que ser el
        numero crudo, no el formateado con price(). Cambiarlo por texto rompe ese spec sin que nada
        lo avise hasta que Lucas corra la suite. Lo que cambia acá es como se ve, no que elemento es.
    -->
    <div class="pago-cc__total">
        <label
        class="pago-cc__total-label"
        for="monto-pago">Total del pago</label>
        <b-form-input
        class="pago-cc__total-valor"
        disabled
        type="number"
        min="0"
        id="monto-pago"
        data-testid="current-acount-pago-total"
        @keydown.enter="hacerPago"
        :placeholder="placeholder"
        v-model="pago.haber"></b-form-input>

        <b-button
        size="sm"
        variant="primary"
        class="pago-cc__total-btn"
        v-if="route_name == 'vender' && maked_sale"
        @click="setTotalSale">
            <i class="icon-check"></i>
            Pago el total
        </b-button>
    </div>

    <div class="pago-cc__campos">

        <b-form-group
        label="Fecha del pago">
            <b-form-checkbox
            :value="true"
            :unchecked-value="false"
            v-model="pago.current_date">
                Día de hoy
            </b-form-checkbox>
            <b-form-datepicker
            class="m-t-10"
            placeholder="Ingrese la fecha en la que se hizo el pago"
            v-if="!pago.current_date"
            v-model="pago.created_at">
            </b-form-datepicker>
        </b-form-group>

        <b-form-group
        label="Número de orden de compra">
            <b-form-input
            @keydown.enter="hacerPago"
            placeholder="Opcional"
            v-model="pago.numero_orden_de_compra"></b-form-input>
        </b-form-group>

        <b-form-group
        class="pago-cc__campo--ancho"
        label="Descripción">
            <b-form-textarea
            rows="2"
            @keydown.enter="hacerPago"
            placeholder="Ingrese una descripción"
            v-model="pago.description"></b-form-textarea>
        </b-form-group>

        <b-form-group
        class="pago-cc__campo--ancho"
        description="Si se activa, solo quedara registrado en la cuenta corriente, pero no impactara en el saldo del cliente"
        v-if="hasExtencion('pagos_provisorios')">
            <b-form-checkbox
            :value="1"
            :unchecked-value="1"
            v-model="pago.is_provisorio">
                Pago Provisorio
            </b-form-checkbox>
        </b-form-group>

    </div>

    <payment-methods
    ref="paymentMethodComponent"
    @hacerPago="hacerPago"
    :pago="pago"
    parent-modal-id="current-acounts-pago"></payment-methods>

    <!--
        El boton pasa al slot #modal-footer para que la franja de 60px, el radio de abajo y el
        separador se los de _modals.sass, igual que a cualquier otro modal del sistema. Antes iba
        suelto en el cuerpo con el modal en `hide-footer`, que es justo lo que la mision del
        21/8/2026 corrigio en el modal de cuentas corrientes que contiene a este.
    -->
    <template #modal-footer>
        <btn-loader
        class="pago-cc__confirmar"
        @clicked="hacerPago"
        :loader="loading"
        data-testid="btn-confirmar-pago"
        data-tour="cuentas_corrientes.boton_confirmar_pago"
        text="Registrar pago"></btn-loader>
    </template>
</b-modal>
</template>
<script>
import PaymentMethods from '@/components/common/current-acounts/pago/PaymentMethods'
import BtnLoader from '@/common-vue/components/BtnLoader'

import clients from '@/mixins/clients'
import current_acounts from '@/mixins/current_acounts'
import metodos_de_pago_validacion from '@/mixins/metodos_de_pago_validacion'
export default {
	name: 'CurrentAcountPago',
    mixins: [clients, current_acounts, metodos_de_pago_validacion],
    components: {
        PaymentMethods,
    	BtnLoader,
    },
    mounted() {
        this.$root.$on('bv::modal::shown', (bvEvent, modalId) => {
            if (modalId === 'current-acounts-pago') {

                setTimeout(() => {
                    this.focus_primer_payment_method()
                    // this.$refs.paymentMethodComponent.set_all_caja_ids()
                }, 500)

            }
        })
    },
    data() {
        return {
        	pago: {
                current_date: true,
                description: '',
                created_at: '',
                haber: '',
                is_provisorio: 0,
                current_acount_payment_methods: [],
                // checks: [
                //     {
                //         bank: '',
                //         payment_date: '',
                //         amount: '',
                //         num: '',
                //     },
                // ],
            },
        	loading: false,
        }
    },
    computed: {
        title() {
            return `Cuentas corriente de ${this.from_model.name}`
        },
        placeholder() {
            return `Monto total del pago de ${this.from_model.name}`
        },
        to_pay() {
            return this.$store.state.current_acount.to_pay
        },
        maked_sale() {
            return this.$store.state.vender.sale 
        },
        payment_plan_cuota() {
            if (this.view == 'planes-de-pago') {
                return this.$store.state.payment_plan_cuota.model 
            } else {
                return null
            }
        },
    },
    methods: {
        focus_primer_payment_method() {
            let input = document.getElementsByClassName('payment-method-amount')[0]      
            if (input) {
                input.focus()
            }
        },
        setTotalSale() {
            this.pago.haber = this.maked_sale.total

            let input = document.getElementsByClassName('payment-method-amount')[0]                
            input.value = this.maked_sale.total

            this.pago.current_acount_payment_methods[0].amount = this.maked_sale.total
        },
    	hacerPago() {
            if (this.check()) {
        		this.loading = true
        		this.$api.post('/current-acount/pago', {
                    credit_account_id: this.from_credit_account.id,
                    model_name: this.from_model_name,
        			model_id: this.from_model.id,
        			...this.pago,
                    to_pay: this.to_pay,
                    payment_plan_cuota: this.payment_plan_cuota,
        		})
        		.then(res => {
                    this.$store.dispatch('current_acount/getModels')
        			this.loading = false
        			this.$toast.success('Pago registrado')
                    this.$bvModal.hide('current-acounts-pago')
                    // this.updateClient(this.from_model)
                    this.loadModel(this.from_model_name, this.from_model.id)
                    this.clear()

                    this.update_ventas()

                    this.update_payment_plan_cuotas()
        		})
        		.catch(err => {
        			this.loading = false
        			console.log(err)
        			this.$toast.error('Error al registrar pago')
        		})
            }
    	},
        update_payment_plan_cuotas() {
            if (this.view == 'planes-de-pago') {
                this.$store.dispatch('payment_plan_cuota/getModels')
            }
        },
        update_ventas() {
            if (this.$store.state.sale.is_filtered) {
                // this.$store.dispatch()
            }
        },
        check() {
            // Una fila con monto y sin metodo elegido la descarta el backend en silencio.
            if (this.hay_metodo_de_pago_sin_elegir(this.pago.current_acount_payment_methods)) {
                return false
            }

            if (this.pago.haber == '') {

                let input = document.getElementsByClassName('payment-method-amount')[0]                
               
                if (input.value != '') {
                    this.pago.haber = input.value
                    console.log('Se puso el pago de '+input.value)
                } else {

                    this.$toast.error('Ingrese el importe del pago')
                    return false
                }

            }
            
            for (const payment_method of this.pago.current_acount_payment_methods) {

                if (payment_method.type && payment_method.type.slug == 'cheque') {
                    if (payment_method.bank == '') {
                        this.$toast.error('Ingrese el banco del cheque')
                        return false 
                    }
                    if (payment_method.payment_date == '') {
                        this.$toast.error('Ingrese la fecha de cobro del cheque')
                        return false
                    } 
                    if (payment_method.amount == '') {
                        this.$toast.error('Ingrese importe del cheque')
                        return false
                    }
                    if (payment_method.num == '') {
                        this.$toast.error('Ingrese el número del cheque')
                        return false
                    }
                }

                // let ok = this.validarNumero(payment_method)

                // console.log(ok)
                
                // if (!ok.ok) {

                //     this.$toast.error(ok.reason)
                //     return false
                // }
            }

            return true
        },


        /**
         * Valida números en formato estricto: [-]1234 o [-]1234.56
         * - Sin separadores de miles
         * - Punto como separador decimal
         * - Hasta `maxDecimals` decimales (por defecto 2)
         */
        validarNumero(payment_method, maxDecimals = 2) {
            console.log('validarNumero')
            console.log(payment_method)
            let input = payment_method.amount
            if (input == null) return { ok: false, reason: "Monto vacio, complete nuevamente el monto del metodo "+payment_method.name+" por favor" };

            let s = String(input).trim();
            if (s === "") return { ok: false, reason: "Monto vacio, complete nuevamente el monto del metodo "+payment_method.name+" por favor" };

            // No permitimos comas, espacios ni símbolos raros
            console.log('validando comas en '+s)
            if (/[,\s]/.test(s))  {
                console.log('se validaron comas')
                return { ok: false, reason: "Usá punto decimal y sin comas ni espacios" };
            }

            // Construimos regex: entero o entero.dec
            const decPart = maxDecimals > 0 ? `(\\.\\d{1,${maxDecimals}})?` : ""; // <-- opcional
            const re = new RegExp(`^-?\\d+${decPart}$`);

            if (!re.test(s)) {
            if (s.includes(",")) return { ok: false, reason: "No se permite coma, usá punto decimal" };
            if ((s.match(/\./g) || []).length > 1) return { ok: false, reason: "No uses puntos de miles, solo un punto decimal" };
            if (/\.\d{3,}$/.test(s)) return { ok: false, reason: `Máximo ${maxDecimals} decimales` };
            if (/\.$/.test(s)) return { ok: false, reason: "Luego del punto deben ir decimales" };

            return { ok: false, reason: "Formato inválido. Ej: 1234.50 o 1234" };
            }

            const n = Number(s);
            if (!Number.isFinite(n)) return { ok: false, reason: "Número inválido" };

            return { ok: true };
        },

        clear() {
            this.pago = {
                current_date: true,
                created_at: '',
                haber: '',
                is_provisorio: 0,
                current_acount_payment_methods: [{
                    current_acount_payment_method_id: 3,
                    amount: '',
                    numero: '',
                    banco: '',
                    fecha_emision: '',
                    fecha_pago: '',
                    es_echeq: 0,
                    credit_card_id: 0,
                    credit_card_payment_plan_id: 0,
                    caja_id: 0,
                }],
            }
            this.$store.commit('current_acount/setToPay', null)
            this.$store.commit('current_acount/setSelected', [])
        }
    }
}
</script>
<style lang="sass">
// Modal "Pago" de una cuenta corriente. Sin `scoped` a proposito: el prefijo `pago-cc__` ya es
// unico y varias de estas reglas alcanzan a nodos que dibujan componentes hijos (el input de
// b-form-input, el label de b-form-group), que con `scoped` habria que ir a buscar con ::v-deep.
//
// Colores por token de _dark_theme.sass, nunca hexadecimales: los modales de bootstrap-vue se
// montan colgando de <body>, fuera de #app.

// --- El total, arriba de todo ---------------------------------------------------------------
.pago-cc__total
	display: flex
	flex-wrap: wrap
	align-items: center
	gap: 10px
	padding: 12px 14px
	margin-bottom: 16px
	border-radius: 12px
	border: 1px solid var(--color-border)
	background: var(--bg-section)

	.pago-cc__total-label
		flex: 1 1 100%
		margin: 0
		color: var(--color-text-secondary)
		font-size: 0.78rem
		font-weight: 600
		text-transform: uppercase
		letter-spacing: 0.02em

	// El input deshabilitado deja de parecer un campo que alguien se olvido de completar y pasa a
	// leerse como el numero grande que es. No lleva font-size fijo: lo manda _ui_sizes.sass.
	input.pago-cc__total-valor
		flex: 1 1 160px
		min-width: 0
		height: auto
		padding: 0
		border: none
		background: transparent
		color: var(--color-text-primary)
		font-weight: 700

		&:disabled
			background: transparent
			color: var(--color-text-primary)
			opacity: 1

	.pago-cc__total-btn
		flex: 0 0 auto

// --- Los campos del pago --------------------------------------------------------------------
.pago-cc__campos
	display: grid
	grid-template-columns: repeat(2, minmax(0, 1fr))
	gap: 12px
	margin-bottom: 16px

	.form-group
		margin-bottom: 0
		min-width: 0

	// `legend` ademas de `label`: b-form-group sin la prop `label-for` dibuja un <fieldset> con
	// <legend>, no un <label> (bootstrap-vue/src/components/form-group/form-group.js:240 y :247).
	// Ninguno de estos campos pasa label-for, asi que una regla que apunte solo a `label` no
	// matchearia ninguna de las tres etiquetas.
	> .form-group > legend,
	> .form-group > label
		display: block
		margin-bottom: 4px
		color: var(--color-text-secondary)
		font-size: 0.78rem
		font-weight: 600
		text-transform: uppercase
		letter-spacing: 0.02em

.pago-cc__campo--ancho
	grid-column: 1 / -1

// El boton confirmatorio del footer ocupa la franja a la derecha, como el resto de los modales.
.pago-cc__confirmar
	margin: 0

// 576px es el breakpoint `sm` de bootstrap, el mismo que usa el resto del sistema.
@media (max-width: 575.98px)
	.pago-cc__campos
		grid-template-columns: minmax(0, 1fr)
</style>
