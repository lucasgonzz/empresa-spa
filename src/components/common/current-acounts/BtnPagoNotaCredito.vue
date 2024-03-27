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
        <b-button
        v-if="pago_para_esta"
        class="m-l-10"
        @click="setToPay()"
        variant="primary">
            Registrar pago para {{ pago_para_esta.detalle }}
        </b-button>
        <b-button
        v-else
        class="m-l-10"
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
                let input = document.getElementById('monto-pago')
                input.value = this.selected_current_acounts[0].debe
                input.focus()
            }, 500)
        },
        pago() {
            this.$bvModal.show('current-acounts-pago')
            setTimeout(() => {
                document.getElementById('monto-pago').focus()
            }, 500)
        }
    }
}
</script>