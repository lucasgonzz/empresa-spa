<template>
	<!-- Posicion Fiscal: IVA / IIBB / Ganancias, en renglones separados como los pide la DDJJ (tarea 04) -->
	<div
	v-if="view == 'posicion-fiscal'"
	class="posicion-fiscal m-t-20 p-b-100">

		<div
		v-if="loading"
		class="all-center p-t-30 p-b-30">
			<b-spinner variant="primary"></b-spinner>
		</div>

		<template v-else>
			<!-- Posicion IVA -->
			<div class="cascada-card">
				<h6 class="cascada-card__titulo">IVA</h6>

				<div
				class="cascada-renglon apretable"
				@click="abrirDetalle('iva_debito')">
					<span class="cascada-renglon__label">IVA débito</span>
					<span class="cascada-renglon__monto">{{ formatear(iva.iva_debito) }}</span>
				</div>
				<div
				class="cascada-renglon apretable"
				@click="abrirDetalle('iva_credito')">
					<span class="cascada-renglon__label">IVA crédito</span>
					<span class="cascada-renglon__monto">{{ formatear(iva.iva_credito) }}</span>
				</div>
				<div
				class="cascada-renglon apretable"
				@click="abrirDetalle('percepciones_iva')">
					<span class="cascada-renglon__label">Percepciones de IVA sufridas</span>
					<span class="cascada-renglon__monto">{{ formatear(iva.percepcion_iva_sufrida) }}</span>
				</div>
				<div
				class="cascada-renglon apretable"
				@click="abrirDetalle('retenciones')">
					<span class="cascada-renglon__label">Retenciones de IVA sufridas</span>
					<span class="cascada-renglon__monto">{{ formatear(iva.retencion_iva_sufrida) }}</span>
				</div>

				<div
				class="cascada-renglon cascada-renglon--subtotal"
				:class="{ 'cascada-renglon--favor': iva.tipo == 'a_favor' }">
					<span class="cascada-renglon__label">{{ iva.tipo == 'a_favor' ? 'Saldo a favor' : 'Saldo a pagar' }}</span>
					<span class="cascada-renglon__monto">{{ formatear(iva.saldo) }}</span>
				</div>
			</div>

			<!-- Posicion IIBB -->
			<div class="cascada-card m-t-20">
				<h6 class="cascada-card__titulo">IIBB</h6>

				<!-- Si no hay impuestos sobre ventas configurados, no tiene sentido mostrar una tabla en ceros (tarea 04) -->
				<div
				v-if="iibb.iibb_configurado === false"
				class="posicion-fiscal__aviso-iibb">
					<p>
						Todavía no tenés configurados los impuestos sobre ventas (IIBB), así que no podemos
						calcular tu posición.
					</p>
					<router-link
					:to="{ name: 'abm', params: { view: 'precios', sub_view: 'sale_tax' } }"
					class="btn btn-outline-primary btn-sm">
						Configurar impuestos sobre ventas
					</router-link>
				</div>

				<template v-else>
					<div
					class="cascada-renglon apretable"
					@click="abrirDetalle('percepciones_iibb')">
						<span class="cascada-renglon__label">IIBB determinado</span>
						<span class="cascada-renglon__monto">{{ formatear(iibb.iibb_determinado) }}</span>
					</div>
					<div
					class="cascada-renglon apretable"
					@click="abrirDetalle('percepciones_iibb')">
						<span class="cascada-renglon__label">Percepciones de IIBB sufridas</span>
						<span class="cascada-renglon__monto">{{ formatear(iibb.percepcion_iibb_sufrida) }}</span>
					</div>
					<div
					class="cascada-renglon apretable"
					@click="abrirDetalle('retenciones')">
						<span class="cascada-renglon__label">Retenciones de IIBB sufridas</span>
						<span class="cascada-renglon__monto">{{ formatear(iibb.retencion_iibb_sufrida) }}</span>
					</div>

					<div
					class="cascada-renglon cascada-renglon--subtotal"
					:class="{ 'cascada-renglon--favor': iibb.tipo == 'a_favor' }">
						<span class="cascada-renglon__label">{{ iibb.tipo == 'a_favor' ? 'Saldo a favor' : 'Saldo a pagar' }}</span>
						<span class="cascada-renglon__monto">{{ formatear(iibb.saldo) }}</span>
					</div>
				</template>
			</div>

			<!-- Pagos a cuenta de Ganancias -->
			<div class="cascada-card m-t-20">
				<h6 class="cascada-card__titulo">Ganancias</h6>

				<div
				class="cascada-renglon apretable"
				@click="abrirDetalle('retenciones')">
					<span class="cascada-renglon__label">Retenciones de Ganancias sufridas</span>
					<span class="cascada-renglon__monto">{{ formatear(ganancias.retencion_ganancias_sufrida) }}</span>
				</div>
			</div>
		</template>
	</div>
</template>
<script>
import detalle_drilldown from '@/mixins/reportes/detalle_drilldown'

export default {
	mixins: [detalle_drilldown],
	created() {
		this.$store.dispatch('reportes/getPosicionFiscal')
	},
	computed: {
		model() {
			return this.$store.state.reportes.posicion_fiscal
		},
		loading() {
			return this.$store.state.reportes.posicion_fiscal_loading
		},
		iva() {
			return this.model.posicion_iva || {}
		},
		iibb() {
			return this.model.posicion_iibb || {}
		},
		ganancias() {
			return this.model.pagos_a_cuenta_ganancias || {}
		},
	},
	methods: {
		formatear(valor) {
			return this.price(valor, false, false)
		},
	},
}
</script>
<style lang="sass">
.posicion-fiscal
	.cascada-card
		background: #fff
		border: 1px solid #e2e8f0
		border-radius: 12px
		box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06)
		padding: 8px 24px
		max-width: 720px
		margin: 0 auto

		&__titulo
			font-size: 0.95rem
			font-weight: 700
			color: #475569
			text-transform: uppercase
			letter-spacing: 0.04em
			padding: 14px 0 4px
			margin: 0

	.cascada-renglon
		display: flex
		justify-content: space-between
		align-items: baseline
		padding: 14px 0
		border-bottom: 1px solid #f1f5f9
		font-size: 0.95rem
		color: #0f172a

		&:last-child
			border-bottom: none

		&--subtotal
			font-weight: 700
			font-size: 1.05rem
			border-top: 2px solid #e2e8f0
			border-bottom: 2px solid #e2e8f0
			color: #dc2626

		&--favor
			color: #059669

	&__aviso-iibb
		padding: 16px 0
		color: #64748b
		font-size: 0.9rem

		p
			margin-bottom: 10px
</style>
