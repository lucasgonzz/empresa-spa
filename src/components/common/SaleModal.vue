<template>
    <model-index
    :show_btn_save="false"
    :show_btn_remove_belongs_to_many="false"
    :delete_text="sale_delete_text"
    not_show_delete_text
    model_name="sale">
        <template v-slot:model_modal_header="props">
            <sale-details></sale-details>
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
    },
    computed: {
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