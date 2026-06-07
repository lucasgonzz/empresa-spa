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

	<!-- Área principal con divisor redimensionable -->
	<div
	class="vender-main"
	style="display: flex; flex: 1; overflow: hidden;">

		<!-- Panel izquierdo: wizard de etapas -->
		<div
		class="vender-left-panel"
		:style="{ width: left_panel_width + 'px', minWidth: '400px', maxWidth: '1200px', overflowY: 'auto', flexShrink: 0 }">
			<vender-stages></vender-stages>
		</div>

		<!-- Divisor redimensionable -->
		<vender-resizer
		@resize="onResize"
		@resize-end="onResizeEnd">
		</vender-resizer>

		<!-- Panel derecho: resumen de venta -->
		<div
		class="vender-right-panel"
		style="flex: 1; overflow: hidden; min-width: 240px;">
			<vender-summary-panel></vender-summary-panel>
		</div>

	</div>
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

		/* Nuevo layout de dos paneles */
		VenderTopbar: () => import('@/components/vender/components/VenderTopbar'),
		VenderSummaryBar: () => import('@/components/vender/components/VenderSummaryBar'),
		VenderStages: () => import('@/components/vender/components/VenderStages'),
		VenderResizer: () => import('@/components/vender/components/VenderResizer'),
		VenderSummaryPanel: () => import('@/components/vender/components/VenderSummaryPanel'),
	},
	data() {
		return {
			/*
			 * Ancho en píxeles del panel izquierdo.
			 * Se carga desde user.configuration.vender_left_width (persistido en backend).
			 * Fallback a 720px si no hay valor guardado.
			 */
			left_panel_width: 720,

			/*
			 * Timer para el debounce del guardado de layout.
			 * Se cancela y reinicia en cada evento resize-end para no llamar en cada píxel.
			 */
			debounce_layout_timer: null,
		}
	},
	created() {
		console.log('created vender')

		/* Cargar el ancho del panel izquierdo desde la configuración del usuario */
		const saved_width = this.user
			&& this.user.configuration
			&& this.user.configuration.vender_left_width
		if (saved_width) {
			this.left_panel_width = saved_width
		}

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

		/* Cancelar cualquier debounce pendiente de guardado de layout */
		if (this.debounce_layout_timer) {
			clearTimeout(this.debounce_layout_timer)
		}
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
	methods: {
		/**
		 * Ajusta el ancho del panel izquierdo en base al delta emitido por VenderResizer.
		 * Limita el ancho entre 400px y 1200px para evitar layouts rotos.
		 *
		 * @param {number} delta - Desplazamiento horizontal en píxeles
		 */
		onResize(delta) {
			/* Calcular nuevo ancho limitando entre mínimo y máximo */
			const new_width = Math.min(1200, Math.max(400, this.left_panel_width + delta))
			this.left_panel_width = new_width
		},

		/**
		 * Al soltar el divisor, guarda el nuevo ancho en el backend con debounce de 800ms.
		 * Usa debounce para no llamar al endpoint en cada píxel del drag.
		 */
		onResizeEnd() {
			/* Cancelar el timer anterior si el usuario suelta y arrastra rápido */
			if (this.debounce_layout_timer) {
				clearTimeout(this.debounce_layout_timer)
			}

			this.debounce_layout_timer = setTimeout(() => {
				this.saveVenderLayout()
			}, 800)
		},

		/**
		 * Persiste los anchos actuales de los paneles en el backend.
		 * Llama al endpoint PUT /user-configuration/vender-layout creado en empresa-api.
		 * El panel derecho se calcula como el sobrante del viewport menos el panel izquierdo.
		 */
		saveVenderLayout() {
			/* Ancho del panel derecho = viewport total menos panel izquierdo menos el resizer */
			const right_width = window.innerWidth - this.left_panel_width - 6

			this.$api.put('user-configuration/vender-layout', {
				vender_left_width: this.left_panel_width,
				vender_right_width: right_width > 0 ? right_width : null,
			})
			.catch(err => {
				console.error('Error al guardar layout de vender:', err)
			})
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
