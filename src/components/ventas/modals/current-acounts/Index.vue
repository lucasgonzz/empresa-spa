<template>
<div>
    <confirm
    :text="text_delete"
    :actions="actions"
    id="delete-current-acount"
    toast="Cuenta corriente eliminada"></confirm>
    <pago></pago>    
    <nota-credito></nota-credito>    
    <import></import>    
    <saldo-inicial></saldo-inicial>    
    <checks-details></checks-details>    

    <model
    size="xl"
    modal_title="Presupuesto"
    :model="modelStoreFromName('budget')"
    model_name="budget"
    text_delete="este presupuesto"
    :properties="modelPropertiesFromName('budget')">
    </model>

    <print-budget></print-budget>

    <b-modal id="current-acounts" :title="title" hide-footer size="xl" body-class="p-0">
        <current-acounts-nav></current-acounts-nav>
        <color-info></color-info>
        <list></list>
        <btn-pago-nota-credito></btn-pago-nota-credito>
    </b-modal>
</div>
</template>
<script>
import current_acounts from '@/mixins/current_acounts'
// Modals
import Confirm from '@/common-vue/components/Confirm.vue'
import Pago from '@/components/ventas/modals/current-acounts/pago/Index'
import NotaCredito from '@/components/ventas/modals/current-acounts/NotaCredito.vue'
import Import from '@/components/ventas/modals/current-acounts/Import.vue'
import SaldoInicial from '@/components/ventas/modals/current-acounts/SaldoInicial.vue'
import ChecksDetails from '@/components/ventas/modals/current-acounts/ChecksDetails.vue'
import CreateBudget from '@/components/produccion/modals/budgets/Create'
import PrintBudget from '@/components/produccion/modals/budgets/Print'
import Model from '@/components/common/model/Index'

// Components
import CurrentAcountsNav from '@/components/ventas/modals/current-acounts/Nav'
import ColorInfo from '@/components/ventas/modals/current-acounts/ColorInfo'
import List from '@/components/ventas/modals/current-acounts/List'
import BtnPagoNotaCredito from '@/components/ventas/modals/current-acounts/BtnPagoNotaCredito'
export default {
    mixins: [current_acounts],
    components: {
        // Modals
        Confirm,
        Pago, 
        NotaCredito,
        Import,
        SaldoInicial,
        ChecksDetails,
        CreateBudget,
        PrintBudget,
        Model,
        
        // Components
        CurrentAcountsNav,
        ColorInfo,
        List,
        BtnPagoNotaCredito,
    },
    computed: {
        title() {
            if (this.client) {
                return `Cuenta corriente de en ${this.from_credit_acount.moneda.name} ${this.client.name}` 
            }
            return ''
        },
        delete() {
            return this.$store.state.current_acount.delete
        },
        text_delete() {
            if (this.delete) {
                return 'este pago por $'+this.delete.haber
            }
            return ''
        },
        actions() {
            return [
                'current_acount/delete',
                'current_acount/getModels',
            ]
        }
    },
}
</script>
<style lang="sass">
.detalle
    max-width: 100px
</style>
