<template>
    <div>
        <budget-order-production-info></budget-order-production-info>
        <sale-info></sale-info>
        <hr>
    </div>
</template>
<script>
export default {
    name: 'SaleDetails',
    components: {
        BudgetOrderProductionInfo: () => import('@/components/ventas/modals/details/BudgetOrderProductionInfo'),
        SaleInfo: () => import('@/components/ventas/modals/details/SaleInfo'),
    },
}
</script>