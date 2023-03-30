<template>
<div>
    <current-acounts-pago></current-acounts-pago>
    <b-modal id="successful-sale" title="Venta realizada correctamente" hide-footer>
        <p class="text-with-icon">
            Venta realizada con exito
            <span class="icon-check"></span>
        </p>
        <div
        v-if="user_configuration.limit_items_in_sale_per_page"
        class="j-between align-center">
            <b-button 
            variant="primary"
            @click="pdfClient">
                <i class="icon-print"></i>
                Factura para el Cliente
            </b-button>
            <b-button 
            variant="success"
            @click="pdfCommerce">
                <i class="icon-print"></i>
                Factura para el Comercio
            </b-button>
        </div>
        <div
        v-else>
            <b-button 
            v-if="sale.afip_ticket"
            block 
            variant="primary"
            @click="printAfipTicket(sale)">
                <i class="icon-print"></i>
                Factura
            </b-button>
            <b-button 
            block 
            variant="outline-danger"
            @click="newPdf(sale.id, 0)">
                <i class="icon-print"></i>
                Remito sin precios
            </b-button>
            <b-button 
            block 
            variant="danger"
            @click="newPdf(sale.id, 1)">
                <i class="icon-print"></i>
                Remito con precios
            </b-button>
        </div>
        <div 
        v-if="sale.client && sale.save_current_acount"
        class="p-t-15">
            <b-button
            @click="savePago"
            block 
            variant="primary">
                Registrar pago en cuenta corriente
            </b-button>
        </div>
    </b-modal>
</div>
</template>
<script>
import CurrentAcountsPago from '@/components/common/current-acounts/pago/Index'

import afip_ticket from '@/mixins/afip_ticket'
import print_sale from '@/mixins/print_sale'
export default {
    mixins: [afip_ticket, print_sale],
    components: {
        CurrentAcountsPago,
    },
    data() {
        return {
            company_name: 1,
            borders: 0,
            articles_per_page: 0,
            max: 0,
            min: 0,
        }
    },
    computed: {
        sale() {
            return this.$store.state.vender.sale
        }
    },
    watch: {
        sale() {
            if (this.sale.articles.length > 10) {
                this.articles_per_page = this.sale.articles.length / 2
                this.min = 5
                this.max = this.sale.articles.length
            }
        }
    },
    methods: {
        savePago() {
            this.$store.commit('current_acount/setFromModelName', 'client')
            this.$store.commit('current_acount/setFromModel', this.sale.client)
            this.$bvModal.show('current-acounts-pago')
        },
        pdfClient() {
            var link = process.env.VUE_APP_API_URL+`/sales/pdf/${this.sale.id}/0`
            window.open(link)
        },
        pdfCommerce() {
            var link = process.env.VUE_APP_API_URL+`/sales/pdf/${this.sale.id}/1`
            window.open(link)
        },
    }
}
</script>