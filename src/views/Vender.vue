<template>
<div id="vender" class="vender-view" data-tour="vender.contenedor">

	<!-- Modales y overlays globales del módulo -->
	<new-article></new-article>
	<loading-afip-ticket></loading-afip-ticket>
	<articles-loading-advise></articles-loading-advise>
	<current-acounts></current-acounts>
	<!-- Freno duro al superar el límite de crédito del cliente (misión 160) -->
	<limite-credito-excedido></limite-credito-excedido>
	<payment-methods></payment-methods>
	<!-- Selector de variantes al escanear un articulo con variantes disponibles (Prompt 525) -->
	<select-variant></select-variant>

	<!-- Barra de atajos de teclado activos -->
	<vender-topbar></vender-topbar>

	<!-- Barra de resumen de Etapa 1 (chips de configuración seleccionada) -->
	<vender-stage1-summary-bar></vender-stage1-summary-bar>

	<!-- Área principal: wizard de etapas a ancho completo -->
	<div
	class="vender-main"
	style="flex: 1; overflow: hidden;">
		<vender-stages></vender-stages>
	</div>

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
		SelectVariant: () => import('@/components/vender/modals/SelectVariant'),
		CurrentAcounts: () => import('@/components/common/current-acounts/Index'),
		LimiteCreditoExcedido: () => import('@/components/vender/modals/LimiteCreditoExcedido'),
		ArticlesLoadingAdvise: () => import('@/components/common/ArticlesLoadingAdvise'),

		/* Layout del wizard de venta */
		VenderTopbar: () => import('@/components/vender/components/VenderTopbar'),
		VenderStage1SummaryBar: () => import('@/components/vender/components/VenderStage1SummaryBar'),
		VenderStages: () => import('@/components/vender/components/VenderStages'),
		VenderActionsBar: () => import('@/components/vender/components/VenderActionsBar'),
	},
	created() {
		console.log('created vender')

		/* Cargar atajos de teclado del usuario antes de usarlos en la vista */
		this.$store.dispatch('vender/load_keyboard_shortcuts')

		/* Perfiles PDF para configurar opciones de impresión del atajo */
		this.$store.dispatch('pdf_column_profile/getModels')

		/*
			Los valores por defecto se aplican una vez por VENTA, no cada vez que se entra
			al modulo. Sin esta guarda, salir a otro modulo y volver pisaba lo que el
			operador ya habia elegido (omitir en cuenta corriente, lista de precios, caja,
			los articulos por defecto que habia quitado) y ademas vaciaba el log de
			auditoria de la venta en curso: la venta se guardaba sin el rastro de lo que se
			hizo antes de salir.

			La bandera vive en el store (vender/venta_en_curso_inicializada) porque el
			estado de la venta sobrevive a la navegacion y este created() no: el
			router-view no tiene keep-alive, asi que la vista se destruye al salir y se
			construye de nuevo al volver.

			La apaga limpiar_vender(), que corre al guardar, al cancelar una venta previa y
			con el boton Limpiar: en los tres casos empieza una venta nueva y los defaults
			tienen que volver.
		*/
		/*
			Editar un comprobante existente NO es empezar una venta nueva: sus valores ya
			estan guardados y los defaults del comercio los pisarian. San Cayetano perdia la
			venta de la cuenta corriente por esto (13/8/2026). No sacar el guard.
		*/
		let editando = this.$store.getters['vender/previus_sales/editando_venta_previa'] || !!this.budget

		if (!this.$store.state.vender.venta_en_curso_inicializada) {

			if (!editando) {
				/* Inicializar el log de auditoría para una nueva sesión de venta */
				this.$store.commit('vender/init_sale_log')
				this.set_default_articles()
				this.setPriceType()
				this.setDefaultPaymentMethod()
				this.set_omitir_en_cuenta_corriente()
				this.set_caja_por_defecto()
				this.$store.commit('vender/clear_sale_log')
			}

			/*
				Explicito ademas de las mutaciones que la prenden solas: un negocio que no
				usa listas de precios, no tiene caja por defecto y no tiene
				siempre_omitir_en_cuenta_corriente no dispara ninguna de ellas.

				Y va AFUERA del guard de edicion a proposito: editando un comprobante hay
				que marcar la venta como inicializada igual, para que salir del modulo y
				volver no dispare los defaults sobre una venta que ya tiene los suyos.
			*/
			this.$store.commit('vender/set_venta_en_curso_inicializada', true)
		}
	},
	mounted() {
		/*
		 * Captura en fase capture: interceptar F5/F1-F10 antes del comportamiento
		 * nativo del navegador (refresh, búsqueda, ayuda, etc.).
		 */
		window.addEventListener('keydown', this.handleVenderKeyboard, true)
		window.addEventListener('keyup', this.handleVenderKeyboardKeyup, true)
	},
	beforeDestroy() {
		/* Limpiar listeners al salir del módulo */
		window.removeEventListener('keydown', this.handleVenderKeyboard, true)
		window.removeEventListener('keyup', this.handleVenderKeyboardKeyup, true)
	},
	beforeRouteLeave(to, from, next) {
		this.$store.commit('sale/setSelected', [])

		/*
			Salir del modulo YA NO cancela la edicion de una venta guardada.

			Antes se llamaba a cancelPreviusSale() cuando se estaba editando una venta guardada, y eso
			ejecutaba limpiar_vender(): se perdia la edicion entera (items, cliente,
			descuentos, observaciones, adjuntos) por salir un segundo a otro modulo.

			El bloqueo actualizandose_por queda tomado mientras la edicion siga viva, que es
			lo que corresponde: la persona la sigue editando. Se libera al actualizar la
			venta, o con el boton Cancelar de PreviusSaleData.vue, que sigue llamando a
			cancelPreviusSale() sin cambios. Decision de Lucas, 11/8/2026.
		*/
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
#vender.vender-view
	display: flex
	flex-direction: column
	height: 100vh
	/* Permite que barras full-bleed salgan del padding del container-fluid */
	overflow-x: visible
	overflow-y: hidden

.vender-full-bleed
	box-sizing: border-box
	width: calc(100% + 30px)
	margin-left: -15px
	margin-right: -15px

/* Evita que el padding del container-fluid recorte las barras full-bleed */
.container-fluid:has(#vender)
	overflow-x: visible

#vender
	.input-group
		.input-group-prepend, .input-group-append
			height: 47.6px

.ui-small #vender
	.input-group
		.input-group-prepend, .input-group-append
			height: auto
</style>
