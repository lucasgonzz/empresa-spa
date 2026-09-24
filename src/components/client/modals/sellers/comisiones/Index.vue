<template>
<!--
	Modal "Comisiones de vendedor" (Vendedores → Comisiones).

	Orquesta el panel: arriba la moneda y el rango de fechas, después las tres tarjetas, la tabla
	de liquidadas (comisiones liquidadas + pagos al vendedor) y, si el vendedor liquida al saldar
	la venta, la tabla de pendientes. Todo el estado vive en el store `seller_commission`.

	`size="xl"`: las siete columnas de la tabla no entran en `lg`.
-->
<b-modal
title="Comisiones de vendedor"
hide-footer
size="xl"
body-class="comision-modal__body"
id="Comisiones de vendedor">

	<div
	v-if="seller"
	class="comision-modal__header">
		<div class="comision-modal__nombre">{{ seller.name }}</div>
		<div class="comision-modal__config">
			{{ porcentaje_es(seller.percentage_commission) }}% · {{ modo_liquidacion_label }}
		</div>
	</div>

	<div class="comision-modal__controles">

		<segmento
		v-if="hasExtencion('ventas_en_dolares')"
		:opciones="opciones_moneda"
		v-model="moneda_id"></segmento>

		<!--
			Rango de fechas. Por defecto no hay rango: se ve el histórico completo, como en la
			cuenta corriente. Afecta a las dos tablas y a las tres tarjetas.
		-->
		<div class="comision-modal__rango">
			<b-input-group
			size="sm"
			prepend="Desde"
			class="comision-modal__fecha">
				<b-form-input
				type="date"
				v-model="desde"></b-form-input>
			</b-input-group>
			<b-input-group
			size="sm"
			prepend="Hasta"
			class="comision-modal__fecha">
				<b-form-input
				type="date"
				v-model="hasta"></b-form-input>
			</b-input-group>
			<b-button
			size="sm"
			variant="primary"
			:disabled="!rango_cambio"
			@click="aplicarRango">
				Filtrar
			</b-button>
			<b-button
			v-if="hay_rango"
			size="sm"
			variant="outline-secondary"
			@click="verTodoElHistorial">
				Ver todo el historial
			</b-button>
		</div>

	</div>

	<resumen></resumen>

	<div class="comision-modal__seccion">
		<div class="comision-modal__titulo-seccion">Liquidadas y pagos</div>
		<tabla-comisiones
		tipo_tabla="liquidadas"
		:seller="seller"></tabla-comisiones>
	</div>

	<div
	v-if="mostrar_pendientes"
	class="comision-modal__seccion">
		<div class="comision-modal__titulo-seccion">Pendientes de liquidar</div>
		<div class="comision-modal__ayuda">
			Estas comisiones se van a liquidar automáticamente cuando se salden sus ventas.
		</div>
		<tabla-comisiones
		tipo_tabla="pendientes"
		:seller="seller"></tabla-comisiones>
	</div>

	<div class="comision-modal__pie">
		<b-button
		v-if="seller && seller.seller_commissions_count == 0"
		v-b-modal="'seller-commission-saldo-inicial'"
		variant="outline-primary">
			Saldo inicial
		</b-button>
		<b-button
		v-b-modal="'seller-commission-pago'"
		variant="primary">
			Registrar pago
		</b-button>
	</div>

</b-modal>
</template>
<script>
import Resumen from '@/components/client/modals/sellers/comisiones/Resumen'
import TablaComisiones from '@/components/client/modals/sellers/comisiones/TablaComisiones'
import Segmento from '@/components/client/modals/sellers/comisiones/Segmento'
export default {
	components: {
		Resumen,
		TablaComisiones,
		Segmento,
	},
	data() {
		return {
			// Borrador del rango: se aplica recién con "Filtrar", para no pedir la API con cada
			// tecla mientras se escribe una fecha.
			desde: '',
			hasta: '',
			opciones_moneda: [
				{value: 1, label: 'Pesos'},
				{value: 2, label: 'Dólares'},
			],
		}
	},
	created() {
		this.sincronizarRango()
	},
	watch: {
		// Si el store vuelve el rango a cero (por ejemplo, al abrir otro vendedor), el borrador
		// lo acompaña.
		panel_desde() {
			this.sincronizarRango()
		},
		panel_hasta() {
			this.sincronizarRango()
		},
	},
	computed: {
		seller() {
			return this.$store.state.seller_commission.selected_model
		},
		// La moneda se cambia por el store: vuelve a pedir todo desde la página 1.
		moneda_id: {
			get() {
				return this.$store.state.seller_commission.moneda_id
			},
			set(value) {
				this.$store.dispatch('seller_commission/setMoneda', value)
			},
		},
		panel_desde() {
			return this.$store.state.seller_commission.panel_desde
		},
		panel_hasta() {
			return this.$store.state.seller_commission.panel_hasta
		},
		// Hay un rango aplicado (no el borrador).
		hay_rango() {
			return !!(this.panel_desde || this.panel_hasta)
		},
		// El borrador difiere de lo aplicado: recién ahí tiene sentido "Filtrar".
		rango_cambio() {
			return (this.desde || '') != (this.panel_desde || '') || (this.hasta || '') != (this.panel_hasta || '')
		},
		modo_liquidacion_label() {
			if (this.seller && this.seller.commission_after_pay_sale) {
				return 'Liquida al saldar la venta'
			}
			return 'Liquida al confirmar la venta'
		},
		// Las pendientes solo existen cuando el vendedor liquida al saldar la venta.
		mostrar_pendientes() {
			return !!(this.seller && this.seller.commission_after_pay_sale)
		},
	},
	methods: {
		// Copia al borrador el rango que está aplicado en el store.
		sincronizarRango() {
			this.desde = this.panel_desde || ''
			this.hasta = this.panel_hasta || ''
		},
		// Aplica el rango del borrador. Se puede elegir una sola punta.
		aplicarRango() {
			if (this.desde && this.hasta && this.desde > this.hasta) {
				this.$toast.error('La fecha "desde" no puede ser posterior a la fecha "hasta"')
				return
			}
			this.$store.dispatch('seller_commission/setPanelRango', {
				desde: this.desde,
				hasta: this.hasta,
			})
		},
		// Limpia el rango y vuelve al histórico completo.
		verTodoElHistorial() {
			this.desde = ''
			this.hasta = ''
			this.$store.dispatch('seller_commission/setPanelRango', {
				desde: '',
				hasta: '',
			})
		},
	},
}
</script>
<style scoped lang="sass">
.comision-modal
	&__body
		padding: 20px 24px

	&__header
		margin-bottom: 8px

	&__nombre
		font-size: 1.15rem
		font-weight: 700
		color: var(--color-text-primary)

	&__config
		font-size: 0.78rem
		color: var(--color-text-secondary)
		margin-top: 2px

	&__controles
		display: flex
		flex-wrap: wrap
		align-items: center
		justify-content: space-between
		gap: 10px
		margin-top: 14px

	&__rango
		display: flex
		flex-wrap: wrap
		align-items: center
		gap: 8px

	&__fecha
		width: auto
		max-width: 210px

	&__seccion
		margin-top: 8px

		& + &
			margin-top: 24px

	&__titulo-seccion
		font-size: 0.72rem
		font-weight: 700
		color: var(--color-text-secondary)
		text-transform: uppercase
		letter-spacing: 0.04em
		margin-bottom: 8px

	&__ayuda
		font-size: 0.78rem
		color: var(--color-text-secondary)
		margin-bottom: 10px

	&__pie
		display: flex
		justify-content: flex-end
		flex-wrap: wrap
		gap: 10px
		margin-top: 20px
		padding-top: 16px
		border-top: 1px solid var(--color-border)

	@media screen and (max-width: 576px)
		&__rango
			width: 100%

		&__fecha
			max-width: none
			flex: 1 1 100%
</style>
