<template>
<div id="vender" style="display: flex; flex-direction: column; height: 100vh; overflow: hidden;">

	<!-- Modales y overlays globales del módulo -->
	<new-article></new-article>
	<loading-afip-ticket></loading-afip-ticket>
	<articles-loading-advise></articles-loading-advise>
	<current-acounts></current-acounts>
	<payment-methods></payment-methods>

	<!-- Barra de atajos de teclado activos -->
	<vender-topbar></vender-topbar>

	<!-- Barra de resumen de Etapa 1 (chips de configuración seleccionada) -->
	<vender-summary-bar></vender-summary-bar>

	<!-- Área principal: wizard de etapas a ancho completo -->
	<div
	class="vender-main"
	style="flex: 1; overflow: hidden;">
		<vender-stages></vender-stages>
	</div>

	<!-- Widget flotante de resumen (esquina superior derecha) -->
	<vender-summary-panel></vender-summary-panel>

	<!-- Barra fija inferior de acciones -->
	<vender-actions-bar></vender-actions-bar>
</div>
</template>

<script>
import price_types from '@/mixins/vender/price_types'
import default_articles from '@/mixins/vender/default_articles'
import default_payment_method from '@/mixins/vender/default_payment_method'
import omitir_en_cuenta_corriente from '@/mixins/vender/omitir_en_cuenta_corriente'
import previus_sale from '@/mixins/vender/previus_sale/index'
import cajas from '@/mixins/vender/cajas'
import keyboard_shortcuts from '@/mixins/vender/keyboard_shortcuts'

export default {
	mixins: [
		price_types,
		default_articles,
		default_payment_method,
		omitir_en_cuenta_corriente,
		previus_sale,
		cajas,
		keyboard_shortcuts,
	],
	components: {
		/* Modales globales del módulo vender */
		PaymentMethods: () => import('@/components/vender/modals/payment-methods/Index'),
		NewArticle: () => import('@/components/vender/modals/NewArticle'),
		LoadingAfipTicket: () => import('@/components/vender/modals/LoadingAfipTicket'),
		CurrentAcounts: () => import('@/components/common/current-acounts/Index'),
		ArticlesLoadingAdvise: () => import('@/components/common/ArticlesLoadingAdvise'),

		/* Layout del wizard de venta */
		VenderTopbar: () => import('@/components/vender/components/VenderTopbar'),
		VenderSummaryBar: () => import('@/components/vender/components/VenderSummaryBar'),
		VenderStages: () => import('@/components/vender/components/VenderStages'),
		VenderSummaryPanel: () => import('@/components/vender/components/VenderSummaryPanel'),
		VenderActionsBar: () => import('@/components/vender/components/VenderActionsBar'),
	},
	created() {
		console.log('created vender')

		/* Inicializar el log de auditoría para una nueva sesión de venta */
		this.$store.commit('vender/init_sale_log')
		this.set_default_articles()
		this.setPriceType()
		this.setDefaultPaymentMethod()
		this.set_omitir_en_cuenta_corriente()
		this.set_caja_por_defecto()
		this.$store.commit('vender/clear_sale_log')
	},
	mounted() {
		/* Registrar el listener global de atajos de teclado */
		window.addEventListener('keydown', this.handleVenderKeyboard)
	},
	beforeDestroy() {
		/* Limpiar el listener al salir del módulo */
		window.removeEventListener('keydown', this.handleVenderKeyboard)
	},
	beforeRouteLeave(to, from, next) {
		this.$store.commit('sale/setSelected', [])

		if (this.index_previus_sales != 0) {
			this.cancelPreviusSale()
		}
		next()
	},
	watch: {
		price_types() {
			console.log('cambiaron los tipos de precios, llamando a setPriceType')
			this.setPriceType()
		},
	},
}
</script>

<style lang="sass">
/* Estilos globales del módulo Vender (no scoped para afectar sub-componentes) */
#vender
	.input-group
		.input-group-prepend, .input-group-append
			height: 47.6px

.ui-small #vender
	.input-group
		.input-group-prepend, .input-group-append
			height: auto
</style>
