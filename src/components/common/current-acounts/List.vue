<template>
<div
class="p-l-20 p-r-20">
    <table-component
    :loading="loading"
    :models="models"
    :properties="properties"
    :model_name="model_name"
    model_name_spanish="cuentas corrientes"
    id="table-current-acounts"
    :set_model_on_row_selected="false"
    :show_btn_edit="false"
    emit_selected_with_model_empty
    @showDetails="showDetails"
    @showPagadoPor="showPagadoPor"
    @onRowSelected="onRowSelected">
        <template v-slot:default="slotProps">

            <b-badge
            v-if="slotProps.model.sale && slotProps.model.sale.afip_ticket"
            variant="success">Facturado</b-badge>

            <b-badge
            v-if="slotProps.model.sale && slotProps.model.sale.en_acopio"
            variant="danger">Acopio</b-badge>

            <btn-payment-methods-info
            :model="slotProps.model"></btn-payment-methods-info>

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
import print from '@/mixins/current_acounts/print' 
export default {
    mixins: [current_acounts, print],
    components: {
        TableComponent,
        BtnPaymentMethodsInfo: () => import('@/components/common/current-acounts/BtnPaymentMethodsInfo')
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
            return current_acount.status == 'pago_from_client' 
                    || (
                        current_acount.status == 'nota_credito'
                        && !current_acount.sale_id
                    ) 
                    || current_acount.detalle == 'Nota de debito' 
                    || current_acount.detalle == 'Saldo inicial'
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
            let model_name = null
            let model_id 
            if (current_acount.status == 'nota_credito' || current_acount.status == 'pago_from_client') {
                this.printPago(current_acount)
            } else if (current_acount.sale_id) {
                model_name = 'sale'
                model_id = current_acount.sale_id
            } else if (current_acount.budget_id) {
                model_name = 'budget'
                model_id = current_acount.budget_id
            } else if (current_acount.provider_order_id) {
                model_name = 'provider_order'
                model_id = current_acount.provider_order_id
            }
            if (model_name) {
                this.show_model(model_name, model_id)
            }
        },
        showPagadoPor(current_acount) {
            console.log(current_acount)
            if (current_acount.debe) {
                this.$store.commit('pagado_por/setDebeId', current_acount.id)
            } else {
                this.$store.commit('pagado_por/setHaberId', current_acount.id)
            }
            this.$store.dispatch('pagado_por/getModels', {model_name: this.from_model_name, model_id: this.from_model.id})
            this.$bvModal.show('pagado-por')
        },
        onRowSelected(current_acount) {
            if (!current_acount) {
                this.$store.commit('current_acount/setSelected', [])
            } else if (current_acount.sale_id) {
                this.$store.commit('current_acount/setSelected', [current_acount])
            } else if (current_acount.status == 'sin_pagar') {
                this.$store.commit('current_acount/setSelected', [current_acount])
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