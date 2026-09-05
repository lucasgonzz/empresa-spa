<template>
	<div class="notification-modals">
		<article-import-result-modal></article-import-result-modal>
		<price-update-result-modal></price-update-result-modal>
		<excel-analysis-ready-modal></excel-analysis-ready-modal>
		<provider-order-scan-ready-modal></provider-order-scan-ready-modal>
	</div>
</template>

<script>
/*
 * Contenedor de modales alternativos a global-notification.
 * Cada modal se abre según notification_modal en el payload broadcast.
 */
export default {
	components: {
		ArticleImportResultModal: () => import('@/components/common/notification-modals/ArticleImportResultModal'),
		PriceUpdateResultModal: () => import('@/components/common/notification-modals/PriceUpdateResultModal'),
		ExcelAnalysisReadyModal: () => import('@/components/common/notification-modals/ExcelAnalysisReadyModal'),
		ProviderOrderScanReadyModal: () => import('@/components/common/notification-modals/ProviderOrderScanReadyModal'),
	},
}
</script>
