<template>
<b-modal id="print-sales" title="Imprimir Remito" hide-footer>
    <b-card 
    header="Imprimir remito para" 
    no-body>
        <div
        v-if="user_configuration.limit_items_in_sale_per_page">
            <b-form-radio
            v-model="for_commerce"
            :value="1"
            :unchecked-value="0">
                El comercio (costos y comisiones)
            </b-form-radio>
            <b-form-radio
            v-model="for_commerce"
            :value="0"
            :unchecked-value="1">
                El cliente (solo precios)
            </b-form-radio>
            <b-form-group
            class="m-b-0 m-t-10">
                <b-button
                block
                variant="primary"
                @click="generatePdf">
                    <i class="icon-print"></i>
                    Generar remito
                </b-button>
            </b-form-group>
        </div>
        <b-form-group
        v-else
        class="m-b-0 m-t-10">
            <b-button
            block
            variant="primary"
            @click="generatePdf">
                <i class="icon-print"></i>
                Generar remito
            </b-button>
        </b-form-group>
    </b-card>
</b-modal>
</template>
<script>
export default {
    name: 'PrintSales',
    data() {
        return {
            for_commerce: 0,
        }
    },
    computed: {
        selected_sales() {
            return this.$store.state.sale.selected
        },
        sales_to_show() {
            return this.$store.state.sale.sales_to_show
        },
    },
    methods: {
        generatePdf() {
            var sales_id_ = []
            this.selected_sales.forEach(sale => {
                sales_id_.push(sale.id)
            })
            let link = process.env.VUE_APP_API_URL+'/sales/pdf/'+sales_id_.join('-')+'/'+this.for_commerce
            window.open(link)
            this.$bvModal.hide('print-sales')
            this.updateSaleImpressions()
            this.clear()
        },
        updateSaleImpressions() {
            let impression = {}
            if (this.for_commerce == 1) {
                impression.type = 'commerce'
            } else {
                impression.type = 'client'
            }
            this.selected_sales.forEach(selected_sale => {
                console.log(selected_sale)
                let sale = this.sales_to_show.find(s => {
                    return s.id == selected_sale.id
                })
                sale.impressions.push(impression)
                console.log(sale)
                this.$store.commit('sale/updateSale', sale)
            })
        },
        clear() {
            this.for_commerce = 0
        }
    }
}
</script>