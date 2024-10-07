<template>
    <model-index
    :show_btn_save="false"
    :show_btn_delete="false"
    :show_btn_remove_belongs_to_many="false"
    model_name="sale">
        <template v-slot:model_modal_header="props">
            <sale-details></sale-details>
        </template>
    </model-index>  
</template>
<script>
export default {
    components: {
        ModelIndex: () => import('@/common-vue/components/model/Index'),
        SaleDetails: () => import('@/components/ventas/modals/details/Index'),
    },
}
</script>