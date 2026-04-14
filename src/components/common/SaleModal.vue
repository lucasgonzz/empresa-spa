<template>
    <model-index
    :show_btn_save="false"
    :show_btn_remove_belongs_to_many="false"
    :delete_text="sale_delete_text"
    check_permissions
    not_show_delete_text
    :show_btn_delete="show_btn_delete"
    model_name="sale">
        <template v-slot:model_modal_header>
            <sale-details></sale-details>
        </template>
        <template v-slot:articles>
            <sale-articles-attachment-table
            v-if="selected_sale && selected_sale.id"
            :sale="selected_sale"></sale-articles-attachment-table>
        </template>
    </model-index>  
</template>
<script>
import afip_ticket from '@/mixins/sale/afip_ticket'
export default {
    mixins: [afip_ticket],
    components: {
        ModelIndex: () => import('@/common-vue/components/model/Index'),
        SaleDetails: () => import('@/components/ventas/modals/details/Index'),
        SaleArticlesAttachmentTable: () => import('@/components/ventas/modals/details/SaleArticlesAttachmentTable'),
    },
    computed: {
        selected_sale() {
            return this.$store.state.sale.model 
        },
        show_btn_delete() {
            if (this.selected_sale && this.selected_sale.afip_tickets && this.selected_sale.afip_tickets.length) {
                return false
            }
            return true
        },
        sale_to_delete() {
            return this.$store.state.sale.delete 
        },
        sale_delete_text() {
            if (this.sale_to_delete && this.sale_to_delete.afip_ticket && !this.tiene_nota_de_credito_facturada(this.sale_to_delete)) {
                return 'Esta venta esta FACTURADA, se recomienda primero generar una NOTA DE CREDITO'
            }
            return '¿Seguro que quiere eliminar esta venta?'
        }
    }
}
</script>