<template>
<div
class="p-l-20 p-r-20">
    <table-component
    :loading="loading"
    :models="models"
    :properties="properties"
    :model_name="model_name"
    model_name_spanish="cuentas corrientes"
    :set_model_on_click="false"
    :show_btn_edit="false"
    @showDetails="showDetails">
        <template v-slot:default="slotProps">
            <b-button
            size="sm"
            v-if="canDelete(slotProps.model)"
            @click="deleteCurrentAcount(slotProps.model)"
            variant="danger">
                <i class="icon-trash"></i>
            </b-button>
        </template>  
    </table-component>  
</div>
</template>
<script>
import TableComponent from '@/common-vue/components/display/TableComponent'

import current_acounts from '@/mixins/current_acounts' 
export default {
    mixins: [current_acounts],
    components: {
        TableComponent,
    },
    computed: {
        model_name() {
            return 'current_acount'
        },
        model_name_spanish() {
            return 'cuentas corrientes'
        },
        loading() {
            return this.$store.state[this.model_name].loading
        },
        to_show() {
            return this.$store.state[this.model_name].to_show
        },
        models() {
            return this.$store.state[this.model_name].models
        },
        properties() {
            return require(`@/models/${this.model_name}`).default.properties 
        },
    },
    methods: {
        showPaymentMethods(current_acount) {
            this.$store.commit('current_acount/setToShowPaymentMethods', current_acount)
            this.$bvModal.show('payment-methods-details')
        },
        canDelete(current_acount) {
            return current_acount.status == 'pago_from_client' || current_acount.status == 'nota_credito' || current_acount.detalle == 'Nota de debito' || current_acount.detalle == 'Saldo inicial'
        },
        deleteCurrentAcount(current_acount) {
            this.$store.commit('current_acount/setDelete', current_acount)
            this.$bvModal.show('delete-current-acount')
        },
        showButtonDebe(current_acount) {
            return current_acount.status != 'pago_from_client' && current_acount.status != 'nota_credito'
        },
        updateDebe(current_acount) {
            this.$store.commit('clients/current_acounts/setUpdateDebe', current_acount)
            this.$bvModal.show('update-debe')
        },
        showDetails(current_acount) {
            if (current_acount.sale) {
                this.setModel(current_acount.sale, 'sale')
                setTimeout(() => {
                    this.$bvModal.show('sale')
                }, 100)
            } else if (current_acount.budget) {
                this.setModel(current_acount.budget, 'budget')
            } else if (current_acount.order_production) {
                this.setModel(current_acount.order_production, 'order_production')
            } else if (current_acount.provider_order) {
                this.setModel(current_acount.provider_order, 'provider_order')
            } else if (current_acount.haber) {
                this.showPaymentMethods(current_acount)
            }
        },
        getDetalleColorText(current_acount) {
            if (current_acount.status == 'pagandose') {
                return 'text-success'
            }
            if (current_acount.status == 'pagado') {
                return 'text-info'
            }
            if (current_acount.status.includes('nota_credito') || current_acount.status == 'pago') {
                return 'text-danger'
            }
        }
    }
}
</script>