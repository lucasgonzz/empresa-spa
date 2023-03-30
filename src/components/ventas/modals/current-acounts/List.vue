<template>
<div>
    <table-component
    :loading="loading"
    :models="models"
    :properties="properties"
    :model_name="model_name"
    :set_model_on_click="false"
    :show_btn_edit="false"
    @showDetails="showDetails">
        <template v-slot:default="slotProps">
            <b-button
            class="m-r-15"
            v-if="slotProps.model.payment_method && slotProps.model.payment_method.name == 'Cheque'"
            size="sm"
            variant="primary"
            @click="showChecks(slotProps.model)"> 
                <div class="d-flex">
                    <i class="icon-eye m-r-5"></i>
                    Checke
                </div>
            </b-button>
            <b-button
            size="sm"
            v-if="canDelete(slotProps.model)"
            @click="deleteCurrentAcount(slotProps.model)"
            variant="danger">
                <i class="icon-trash"></i>
            </b-button>
        </template>  
    </table-component>  

    <!-- <div
    v-if="!loading_current_acounts">
        <div 
        v-if="current_acounts.length">
            <b-table
            head-variant="dark"
            :fields="fields"
            :items="items"
            responsive
            selectable 
            select-mode="multi"
            @row-selected="onRowSelected">
                <template #cell(metodo)="data">
                    <div
                    v-if="current_acounts[data.index].payment_method">
                        <span
                        class="btn-link"
                        @click="showChecks(current_acounts[data.index])"
                        v-if="current_acounts[data.index].payment_method.id == 1">
                            {{ current_acounts[data.index].payment_method.name }}
                        </span>
                        <span
                        v-else>
                            {{ current_acounts[data.index].payment_method.name }}
                        </span>
                    </div>
                    <span
                    v-else>
                        -
                    </span>
                </template>
                <template #cell(detalle)="data">
                    <strong
                    :class="getDetalleColorText(current_acounts[data.index])">
                        {{ current_acounts[data.index].detalle }}
                    </strong>
                </template>
                <template #cell(numero)="data">
                    <strong
                    class="btn-link"
                    @click="showDetails(current_acounts[data.index])">
                        {{ current_acounts[data.index].numero }}
                    </strong>
                </template>
                <template #cell(options)="data">
                    <b-button
                    size="sm"
                    v-if="canDelete(current_acounts[data.index])"
                    @click="deleteCurrentAcount(current_acounts[data.index])"
                    variant="danger">
                        <i class="icon-trash"></i>
                    </b-button>
                </template>
            </b-table>
        </div>
        <p 
        v-else
        class="text-with-icon">
            <i class="icon-eye-slash"></i>
            No hay cuentas corrientes
        </p>
    </div> -->
</div>
</template>
<script>
import TableComponent from '@/common-vue/components/display/TableComponent'

import current_acounts from '@/mixins/current_acounts' 
import budgets from '@/mixins/budgets' 
import display from '@/mixins/display' 
export default {
    mixins: [current_acounts, budgets, display],
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
        fields() {
            return [
                { key: 'fecha', class: 'text-center' },
                { key: 'detalle', class: 'text-center detalle' },
                { key: 'numero', class: 'text-center' },
                { key: 'debe', class: 'text-center' },
                { key: 'haber', class: 'text-center' },
                { key: 'saldo', class: 'text-center' },
                { key: 'metodo', class: 'text-center' },
                { key: 'description', label: 'Observaciones', class: 'text-center detalle' },
                { key: 'options', label: '', class: 'text-center detalle' },
            ]
        }, 
        items() {
            let items = []
            this.current_acounts.forEach(current_acount => {
                items.push({
                    id:             current_acount.id,
                    fecha:          this.date(current_acount.created_at, true), 
                    debe:           this.price(current_acount.debe),
                    haber:          this.price(current_acount.haber),
                    saldo:          this.price(current_acount.saldo),
                    description:    current_acount.description,
                    status:    current_acount.status,
                })
            })
            return items
        }
    },
    methods: {
        // paymentMethod(current_acount) {
        //     if (current_acount.payment_method) {
        //         return current_acount.payment_method.name 
        //     }
        //     return '-'
        // },
        showChecks(current_acount) {
            this.$store.commit('current_acount/setToShowChecks', current_acount)
            this.$bvModal.show('checks-details')
        },
        canDelete(current_acount) {
            return current_acount.status == 'pago_from_client' || current_acount.status == 'nota_credito'
            return (current_acount.status == 'pago_from_client' || current_acount.status == 'nota_credito' || current_acount.detalle == 'Saldo inicial') && current_acount.id == this.current_acounts[this.current_acounts.length - 1].id
        },
        onRowSelected(items) {
            this.$store.commit('clients/current_acounts/setSelected', items)
            console.log(items)
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
                this.$store.commit('sale/setDetails', current_acount.sale)
                setTimeout(() => {
                    this.$bvModal.show('sale-details')
                }, 100)
            } else if (current_acount.budget) {
                this.setModel(current_acount.budget, 'budget')
                // this.$store.commit('produccion/budgets/create/setCanEdit', false)
                // this.$store.commit('produccion/budgets/create/setShowBtnProduction', true)
                // this.setBudgetEdit(current_acount.budget)
                // this.$router.push({name: this.route_name, params: {view: 'presupuesto', sub_view: 'productos'}})
                // setTimeout(() => {
                //     this.$bvModal.show('create-budget')
                // }, 100)
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