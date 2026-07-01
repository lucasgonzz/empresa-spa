<template>
	<!--
		Barra de acciones fija en la parte inferior del módulo Vender.
		Contiene: Limpiar, Imprimir, WhatsApp y Guardar/Actualizar venta.
	-->
	<div class="vender-actions-bar">

		<!-- Botón limpiar venta -->
		<div class="vender-actions-bar__item vender-actions-bar__item--secondary">
			<limpiar-vender in_actions_bar></limpiar-vender>
		</div>

		<!-- Botón imprimir (oculta WhatsApp duplicado; se muestra aparte) -->
		<div class="vender-actions-bar__item vender-actions-bar__item--secondary vender-actions-bar__print">
			<print></print>
		</div>

		<!-- Botón WhatsApp (componente separado, misma venta que Print) -->
		<div
		v-if="sale"
		class="vender-actions-bar__item vender-actions-bar__item--secondary">
			<whatsapp-btn :sale="sale"></whatsapp-btn>
		</div>

		<!-- Botón principal guardar / actualizar con atajo configurable -->
		<div
		v-if="items.length"
		class="vender-actions-bar__item vender-actions-bar__item--primary vender-actions-bar__guardar-wrap">
			<span class="vender-actions-bar__kbd">{{ save_shortcut_key }}</span>
			<!-- inline_layout evita que b-col cols="12" ocupe todo el ancho de la barra -->
			<btn-guardar
			:hide_vuelto="true"
			:inline_layout="true">
			</btn-guardar>
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
		/* Dropdown de impresión; atajo vía keyboard_shortcuts.js */
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

		/**
		 * Tecla configurada para guardar la venta (muestra en la barra inferior).
		 *
		 * @returns {string}
		 */
		save_shortcut_key() {
			const shortcuts = this.$store.state.vender.keyboard_shortcuts || {}
			return shortcuts.save || 'F5'
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
	height: 60px
	display: flex
	justify-content: flex-end
	align-items: center
	flex-wrap: nowrap
	gap: 8px
	background: var(--bg-card, #fff)
	border-top: 1px solid var(--color-border-tertiary, #dee2e6)
	box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.04)
	z-index: 90
	padding: 0 20px
	overflow: visible

/* Contenedor de cada botón en la barra */
.vender-actions-bar__item
	display: inline-flex
	align-items: center
	flex-shrink: 0
	position: relative

	/* Evitar que wrappers internos ocupen el 100% del ancho de la barra */
	::v-deep > div
		display: inline-flex
		align-items: center
		width: auto
		max-width: none
		flex: 0 0 auto

/* Estilo base compartido por botones secundarios del footer */
.vender-actions-bar__item--secondary
	::v-deep .btn
		display: inline-flex
		align-items: center
		justify-content: center
		gap: 6px
		height: 40px
		min-width: 0
		padding: 0 14px
		font-size: 0.84rem
		font-weight: 600
		line-height: 1
		border-radius: 8px
		box-shadow: none
		transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease
		white-space: nowrap

		i
			font-size: 0.9rem

	/* Limpiar: tono neutro, sin rojo agresivo */
	::v-deep .btn-outline-secondary
		color: var(--color-text-primary, #495057)
		border-color: var(--color-border-tertiary, #dee2e6)
		background: var(--bg-section, #f8f9fa)

		&:hover:not(:disabled),
		&:focus:not(:disabled)
			color: #c0392b
			border-color: #f1aeb5
			background: #fff5f5

	/* Imprimir: mismo lenguaje visual que Limpiar */
	::v-deep .dropdown .btn-danger
		color: var(--color-text-primary, #495057)
		border: 1px solid var(--color-border-tertiary, #dee2e6)
		background: var(--bg-section, #f8f9fa)

		&:hover:not(:disabled),
		&:focus:not(:disabled)
			color: var(--color-primary, #007bff)
			border-color: #b8daff
			background: #f0f7ff

	/* WhatsApp: acento verde suave, no bloque sólido */
	::v-deep .btn-success
		color: #1e7e34
		border: 1px solid #b7dfc3
		background: #f4fbf6
		min-width: 40px
		padding: 0 12px

		&:hover:not(:disabled),
		&:focus:not(:disabled)
			color: #155724
			border-color: #8fd19e
			background: #e8f7ec

/* Ocultar WhatsApp dentro de Print para no duplicar (se muestra aparte) */
.vender-actions-bar__print
	::v-deep .j-start
		display: inline-flex
		align-items: center
		width: auto

	::v-deep .j-start > *:last-child
		display: none !important

/* Quitar margen izquierdo heredado de LimpiarVender y WhatsApp */
.vender-actions-bar__item
	::v-deep .m-l-10
		margin-left: 0 !important

/* Separador sutil antes del bloque principal */
.vender-actions-bar__item--primary
	margin-left: 8px
	padding-left: 16px
	border-left: 1px solid var(--color-border-tertiary, #e9ecef)

/* Contenedor del botón guardar con atajo configurable */
.vender-actions-bar__guardar-wrap
	display: inline-flex
	align-items: center
	gap: 10px
	flex-shrink: 0

	/* BtnGuardar usa b-col cols="12" que por defecto ocupa el 100% del ancho */
	/* En la barra inferior hay que anular ese comportamiento de grilla Bootstrap */
	::v-deep .col,
	::v-deep .col-12,
	::v-deep [class*="col-"]
		flex: 0 0 auto !important
		max-width: none !important
		width: auto !important
		padding: 0 !important
		position: static !important
		display: inline-flex !important
		align-items: center !important
		justify-content: flex-start !important

	/* Botón principal: limpio, compacto y con énfasis moderado */
	::v-deep button.venta-total-box,
	::v-deep button.venta-total-box.btn-block
		display: inline-flex !important
		align-items: center
		justify-content: center
		gap: 6px
		height: 40px
		min-width: 168px
		width: auto !important
		max-width: none !important
		font-size: 0.875rem
		font-weight: 600
		line-height: 1
		padding: 0 18px
		white-space: nowrap
		border: none
		border-radius: 8px
		background: var(--color-primary, #007bff)
		box-shadow: 0 2px 8px rgba(0, 123, 255, 0.22)
		transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease

		&:hover:not(:disabled),
		&:focus:not(:disabled)
			background: #0069d9
			box-shadow: 0 3px 10px rgba(0, 123, 255, 0.28)

		&:active:not(:disabled)
			transform: translateY(1px)
			box-shadow: 0 1px 4px rgba(0, 123, 255, 0.2)

		i
			font-size: 0.95rem

/* Tecla de atajo junto al botón guardar (mismo lenguaje que la topbar) */
.vender-actions-bar__kbd
	display: inline-flex
	align-items: center
	justify-content: center
	min-width: 34px
	padding: 4px 8px
	font-size: 0.72rem
	font-family: monospace
	font-weight: 600
	background: var(--bg-section, #f8f9fa)
	border: 1px solid var(--color-border-tertiary, #dee2e6)
	border-radius: 6px
	box-shadow: none
	color: var(--color-text-secondary, #6c757d)
	flex-shrink: 0
	line-height: 1
</style>
