<template>
	<!--
		Barra de acciones fija en la parte inferior del módulo Vender.
		Contiene: Limpiar, Imprimir, WhatsApp y Guardar/Actualizar venta.
	-->
	<div class="vender-actions-bar">

		<!-- Botón limpiar venta -->
		<div class="vender-actions-bar__item">
			<limpiar-vender></limpiar-vender>
		</div>

		<!-- Botón imprimir (oculta WhatsApp duplicado; se muestra aparte) -->
		<div class="vender-actions-bar__item vender-actions-bar__print">
			<print></print>
		</div>

		<!-- Botón WhatsApp (componente separado, misma venta que Print) -->
		<div
		v-if="sale"
		class="vender-actions-bar__item">
			<whatsapp-btn :sale="sale"></whatsapp-btn>
		</div>

		<!-- Botón principal guardar / actualizar con atajo F2 -->
		<div
		v-if="items.length"
		class="vender-actions-bar__item vender-actions-bar__guardar-wrap">
			<kbd class="vender-actions-bar__kbd">F2</kbd>
			<btn-guardar></btn-guardar>
		</div>

	</div>
</template>

<script>
import moment from 'moment'

export default {
	name: 'VenderActionsBar',
	components: {
		/* Botón de limpiar venta (permiso vender.limpiar_venta) */
		LimpiarVender: () => import('@/components/vender/components/remito/header-2/buttons/LimpiarVender'),
		/* Dropdown de impresión y atajo F4 */
		Print: () => import('@/components/vender/components/remito/header-2/buttons/Print'),
		/* Botón de envío por WhatsApp */
		WhatsappBtn: () => import('@/common-vue/sale-print-buttons/WhatsappBtn'),
		/* Botón guardar / actualizar (lógica en mixin guardar_venta) */
		BtnGuardar: () => import('@/components/vender/components/remito/total-previus-sales/BtnGuardar'),
	},
	data() {
		return {
			/* Reloj reactivo para calcular visibilidad de impresión (misma lógica que Print.vue) */
			now: moment(),
		}
	},
	mounted() {
		/* Actualizar el reloj cada segundo para el cálculo de diffEnSegundos */
		this.interval = setInterval(() => {
			this.now = moment()
		}, 1000)
	},
	beforeDestroy() {
		if (this.interval) {
			clearInterval(this.interval)
		}
	},
	computed: {
		/**
		 * Artículos del remito actual; el botón guardar solo se muestra si hay ítems.
		 *
		 * @returns {Array}
		 */
		items() {
			return this.$store.state.vender.items || []
		},

		/**
		 * Venta guardada en la sesión actual.
		 *
		 * @returns {Object|null}
		 */
		maked_sale() {
			return this.$store.state.vender.sale
		},

		/**
		 * Venta previa seleccionada en el flujo de edición.
		 *
		 * @returns {Object|null}
		 */
		previus_sale() {
			return this.$store.state.vender.previus_sales.previus_sale
		},

		/**
		 * Índice de venta previa activa (0 = venta nueva).
		 *
		 * @returns {number}
		 */
		index_previus_sale() {
			return this.$store.state.vender.previus_sales.index
		},

		/**
		 * Venta a usar para imprimir y WhatsApp (misma lógica que Print.vue).
		 *
		 * @returns {Object|null}
		 */
		sale() {
			if (this.index_previus_sale > 0) {
				return this.previus_sale
			}
			if (this.maked_sale) {
				return this.maked_sale
			}
			return null
		},
	},
}
</script>

<style scoped lang="sass">
/* Barra fija inferior de acciones */
.vender-actions-bar
	position: fixed
	bottom: 0
	left: 0
	right: 0
	height: 56px
	display: flex
	justify-content: center
	align-items: center
	gap: 12px
	background: var(--color-bg, #fff)
	border-top: 1px solid var(--color-border-tertiary, #e0e0e0)
	z-index: 90
	padding: 0 16px

/* Contenedor de cada botón en la barra */
.vender-actions-bar__item
	display: flex
	align-items: center

/* Ocultar WhatsApp dentro de Print para no duplicar (se muestra aparte) */
.vender-actions-bar__print
	::v-deep .j-start > *:last-child
		display: none !important

/* Quitar margen izquierdo heredado de LimpiarVender */
.vender-actions-bar__item
	::v-deep .m-l-10
		margin-left: 0 !important

/* Contenedor del botón guardar con atajo F2 */
.vender-actions-bar__guardar-wrap
	display: flex
	align-items: center
	gap: 8px

	/* Resetear layout de columna Bootstrap de BtnGuardar */
	::v-deep .col-12
		padding: 0
		width: auto
		flex: none

	/* Vuelto en efectivo: flotar sobre la barra si aplica */
	::v-deep .vuelto-efectivo
		position: absolute
		bottom: 60px
		right: 16px
		z-index: 91
		min-width: 220px

	/* Botón principal más compacto y destacado para la barra inferior */
	::v-deep button.venta-total-box
		height: 40px
		min-width: 200px
		width: auto
		font-size: 1rem
		font-weight: 700
		padding: 0 20px
		white-space: nowrap

/* Tecla de atajo F2 junto al botón guardar */
.vender-actions-bar__kbd
	display: inline-block
	padding: 2px 6px
	font-size: 0.72rem
	font-family: monospace
	background: var(--bg-section, #f8f9fa)
	border: 1px solid var(--color-border-tertiary, #dee2e6)
	border-radius: 3px
	box-shadow: 0 1px 0 var(--color-border-tertiary, #dee2e6)
	color: var(--color-text-secondary, #6c757d)
	flex-shrink: 0
</style>
