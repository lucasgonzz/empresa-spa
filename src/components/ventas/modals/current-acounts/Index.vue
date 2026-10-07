<template>
<div>
    <confirm
    :text="delete_text"
    :actions="actions"
    model_name="current_acount"
    show_compensar_caja_checkbox
    id="delete-current-acount"
    toast="Movimiento eliminado"></confirm>
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
        /**
         * Mismo texto que common/current-acounts/Index.vue: lo que se borra es un movimiento de la
         * cuenta, nombrado por su detalle y su importe (el haber si es mayor a 0, si no el debe).
         *
         * 🔴 Se llamaba `text_delete`, igual que el método global del mixin generals: Vue no define
         * un computed cuyo nombre ya es un método, así que el confirm recibía la función en vez del
         * texto.
         *
         * @returns {String}
         */
        delete_text() {
            if (!this.delete) {
                return ''
            }
            let importe = Number(this.delete.haber) > 0 ? this.delete.haber : this.delete.debe
            let texto = 'el movimiento'
            if (this.delete.detalle) {
                texto += ' "'+this.delete.detalle+'"'
            }
            if (importe !== null && typeof importe != 'undefined' && importe !== '') {
                texto += ' por '+this.price(importe)
            }
            return texto
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
