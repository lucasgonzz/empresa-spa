<template>
    <b-form-group
    class="p-r-20 j-end">
        <b-button
        v-b-modal="'current-acounts-nota-debito'"
        variant="outline-danger">
            Nota de debito
        </b-button>
        <b-button
        class="m-l-10"
        v-b-modal="'current-acounts-nota-credito'"
        variant="danger">
            Nota de credito
        </b-button>
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
        class="m-l-10"
        data-testid="btn-registrar-pago"
        data-precargado="si"
        @click="setToPay()"
        variant="primary">
            Registrar pago para {{ pago_para_esta.detalle }}
        </b-button>
        <b-button
        v-else
        class="m-l-10"
        data-testid="btn-registrar-pago"
        data-precargado="no"
        @click="pago"
        variant="primary">
            Registrar pago
        </b-button>
    </b-form-group>
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