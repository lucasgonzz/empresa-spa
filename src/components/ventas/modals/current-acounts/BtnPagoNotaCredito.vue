<template>
    <b-form-group
    class="p-15 j-end">
        <b-button
        v-b-modal="'current-acounts-nota-credito'"
        variant="danger">
            Nota de credito
        </b-button>
        <b-button
        v-if="show_btn"
        class="m-l-10"
        @click="setToPay()"
        variant="primary">
            Registrar pago para esta
        </b-button>
        <b-button
        v-else
        class="m-l-10"
        v-b-modal="'current-acounts-pago'"
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
        show_btn() {
            let status = ''
            if (this.selected_current_acounts.length) {
                status = this.selected_current_acounts[this.selected_current_acounts.length - 1].status
            }
            console.log(status)
            return this.selected_current_acounts.length == 1 && (status == 'saldo_inicial' || status == 'sin_pagar' || status == 'pagandose') 
        },
    },
    methods: {
        setToPay() {
            this.$store.commit('current_acount/setToPay', this.selected_current_acounts[0])
            this.$bvModal.show('current-acounts-pago')
        },
    }
}
</script>