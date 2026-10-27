<template>
	<!-- Los últimos cobros hechos con QR, para que el dueño vea qué entró y a qué venta quedó atado -->
	<div class="mercado-pago-qr-cobros">
		<div class="mercado-pago-qr-cobros__encabezado">
			<p class="mercado-pago-qr__label m-b-0">Últimos cobros por QR</p>
			<b-link
			class="mercado-pago-qr-cobros__actualizar"
			:disabled="cargando"
			@click="$emit('actualizar')">
				<b-spinner
				v-if="cargando"
				small></b-spinner>
				<i
				v-else
				class="bi bi-arrow-clockwise"></i>
				Actualizar
			</b-link>
		</div>

		<p
		v-if="!cobros.length"
		class="mercado-pago-qr-cobros__vacio">
			Todavía no cobraste con QR.
		</p>

		<ul
		v-else
		class="mercado-pago-qr-cobros__items">
			<li
			v-for="cobro in cobros"
			:key="cobro.id"
			class="mercado-pago-qr-cobros__item"
			data-testid="mercado-pago-qr-cobro">
				<div class="mercado-pago-qr-cobros__texto">
					<span class="mercado-pago-qr-cobros__fecha">{{ fecha(cobro) }}</span>
					<span
					v-if="cobro.qr && cobro.qr.name"
					class="mercado-pago-qr-cobros__dato">{{ cobro.qr.name }}</span>
					<span
					v-if="cobro.sale_num || cobro.sale_id"
					class="mercado-pago-qr-cobros__dato">Venta N° {{ cobro.sale_num || cobro.sale_id }}</span>
					<span
					v-if="cobro.error_message && cobro.estado == 'error'"
					class="mercado-pago-qr-cobros__dato">{{ cobro.error_message }}</span>
				</div>
				<div class="mercado-pago-qr-cobros__derecha">
					<strong class="mercado-pago-qr-cobros__total">{{ price(cobro.total) }}</strong>
					<b-badge :variant="qr_variante_estado(cobro.estado)">{{ qr_texto_estado(cobro.estado) }}</b-badge>
				</div>
			</li>
		</ul>
	</div>
</template>
<script>
import moment from 'moment'
import mercado_pago_qr from '@/mixins/mercado_pago_qr'

/**
 * Lista de los últimos cobros por QR (`GET /api/mercado-pago/qr/cobros?limit=20`). La pide el
 * orquestador (Index.vue); acá solo se dibuja y se pide actualizar.
 */
export default {
	name: 'MercadoPagoQrUltimosCobros',
	mixins: [mercado_pago_qr],
	props: {
		// Cobros con la forma `Cobro` del contrato
		cobros: {
			type: Array,
			default: () => [],
		},
		cargando: {
			type: Boolean,
			default: false,
		},
	},
	methods: {
		/**
		 * Fecha del cobro: la del pago si se pagó, si no la de cuando se cargó.
		 *
		 * @param {Object} cobro
		 * @returns {String}
		 */
		fecha(cobro) {
			let valor = cobro.paid_at || cobro.created_at
			if (!valor) {
				return ''
			}
			return moment(valor).format('DD/MM/YY HH:mm')
		},
	},
}
</script>
<style lang="sass">
.mercado-pago-qr-card
	.mercado-pago-qr-cobros
		margin-top: 20px
		padding-top: 16px
		border-top: 1px solid var(--color-border-secondary)

	.mercado-pago-qr-cobros__encabezado
		display: flex
		justify-content: space-between
		align-items: center
		gap: 10px
		margin-bottom: 8px

	.mercado-pago-qr-cobros__actualizar
		display: inline-flex
		align-items: center
		gap: 4px
		font-size: 13px

	.mercado-pago-qr-cobros__vacio
		margin: 0
		font-size: 13px
		color: var(--color-text-secondary)

	.mercado-pago-qr-cobros__items
		list-style: none
		margin: 0
		padding: 0
		max-height: 320px
		overflow-y: auto

	.mercado-pago-qr-cobros__item
		display: flex
		justify-content: space-between
		align-items: center
		gap: 10px
		padding: 8px 0
		border-top: 1px solid var(--color-border-secondary)
		font-size: 13px

		&:first-child
			border-top: 0

	.mercado-pago-qr-cobros__texto
		display: flex
		flex-direction: column
		min-width: 0
		color: var(--color-text-primary)

	.mercado-pago-qr-cobros__dato
		color: var(--color-text-secondary)
		word-break: break-word

	.mercado-pago-qr-cobros__derecha
		display: flex
		flex-direction: column
		align-items: flex-end
		gap: 4px
		flex-shrink: 0

	.mercado-pago-qr-cobros__total
		white-space: nowrap
		color: var(--color-text-primary)
</style>
