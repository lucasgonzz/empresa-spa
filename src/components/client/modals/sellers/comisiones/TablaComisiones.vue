<template>
	<div class="comision-tabla">

		<!--
			El filtro de tipo solo existe en liquidadas: es la única tabla que mezcla comisiones
			y pagos al vendedor.
		-->
		<div
		v-if="es_liquidadas"
		class="comision-tabla__filtro">
			<segmento
			:opciones="opciones_tipo"
			v-model="tipo"></segmento>
		</div>

		<div v-if="loading">
			<b-skeleton-table
			:rows="5"
			:columns="campos.length"></b-skeleton-table>
		</div>

		<template v-else>

			<!--
				El wrapper propio existe para llegar con `::v-deep` a la <table> que dibuja
				b-table: el min-width que hace que en teléfono la tabla scrollee en vez de
				espicharse vive ahí adentro (mismo criterio que `puntos/List.vue`).
			-->
			<div class="comision-tabla__wrapper">
				<b-table
				class="m-0"
				head-variant="dark"
				responsive
				show-empty
				:empty-text="texto_vacio"
				:items="items"
				:fields="campos"
				primary-key="id">

					<template #cell(detalle)="fila">
						<b-button
						v-if="fila.item.sale_id"
						class="comision-tabla__venta p-0"
						size="sm"
						variant="link"
						@click="showSellerCommissionSale(fila.item)">
							Venta N° {{ fila.item.sale ? fila.item.sale.num : fila.item.sale_id }}
						</b-button>
						<template v-else-if="tiene_valor(fila.item.haber)">
							<div class="comision-tabla__titulo">Pago al vendedor</div>
							<div
							v-if="metodos_de_pago(fila.item)"
							class="comision-tabla__meta">
								{{ metodos_de_pago(fila.item) }}
							</div>
						</template>
						<div
						v-else
						class="comision-tabla__titulo">
							Saldo inicial
						</div>
					</template>

					<template #cell(fecha_venta)="fila">
						{{ fila.item.sale ? date(fila.item.sale.created_at) : '-' }}
					</template>

					<template #cell(importe)="fila">
						{{ fila.item.sale ? price(fila.item.sale.total) : '-' }}
					</template>

					<template #cell(saldada)="fila">
						<span
						v-if="!es_liquidadas"
						class="comision-tabla__badge">
							Esperando cobro
						</span>
						<template v-else>
							{{ date(fecha_movimiento(fila.item)) }}
						</template>
					</template>

					<template #cell(porcentaje)="fila">
						<template v-if="tiene_valor(fila.item.percentage)">
							{{ porcentaje_es(fila.item.percentage) }}%
						</template>
						<template v-else>-</template>
					</template>

					<template #cell(monto)="fila">
						<span
						v-if="tiene_valor(fila.item.debe)"
						class="comision-tabla__monto">
							{{ price(fila.item.debe) }}
						</span>
						<span
						v-else-if="tiene_valor(fila.item.haber)"
						class="comision-tabla__monto comision-tabla__monto--pago">
							− {{ price(fila.item.haber) }}
						</span>
						<template v-else>-</template>
					</template>

					<template #cell(saldo)="fila">
						<span class="comision-tabla__saldo">
							{{ price(fila.item.saldo_calculado) }}
						</span>
					</template>

				</b-table>
			</div>

			<div
			v-if="meta.last_page > 1"
			class="comision-tabla__paginacion">
				<span class="comision-tabla__conteo">
					{{ meta.total }} {{ meta.total == 1 ? 'movimiento' : 'movimientos' }}
				</span>
				<b-pagination
				class="m-0"
				pills
				v-model="pagina"
				:total-rows="meta.total"
				:per-page="meta.per_page"></b-pagination>
			</div>

		</template>

	</div>
</template>
<script>
import Segmento from '@/components/client/modals/sellers/comisiones/Segmento'
/**
 * Tabla paginada del modal de comisiones de vendedor. La misma sirve para las dos listas:
 *
 * - `liquidadas`: comisiones ya liquidadas y pagos al vendedor (el ledger). Lleva el filtro
 *   Todos / Comisiones / Pagos y la columna Saldo, que viene calculada por la API
 *   (`saldo_calculado`) en orden de entrada al ledger. No se usa la columna `saldo` guardada.
 * - `pendientes`: comisiones de ventas que todavía no se saldaron. No están en el ledger, así
 *   que no tienen saldo.
 *
 * Los datos, la página y el filtro viven en el store `seller_commission`: esta tabla solo los
 * muestra y despacha los cambios.
 */
export default {
	components: {
		Segmento,
	},
	props: {
		// 'liquidadas' | 'pendientes'
		tipo_tabla: {
			type: String,
			required: true,
		},
		seller: {
			type: Object,
			default: null,
		},
	},
	data() {
		return {
			opciones_tipo: [
				{value: 'todos', label: 'Todos'},
				{value: 'comisiones', label: 'Comisiones'},
				{value: 'pagos', label: 'Pagos'},
			],
		}
	},
	computed: {
		es_liquidadas() {
			return this.tipo_tabla == 'liquidadas'
		},
		store() {
			return this.$store.state.seller_commission
		},
		// Filas de la página actual.
		items() {
			return this.es_liquidadas ? this.store.liquidadas : this.store.pendientes
		},
		// Paginación que devolvió la API: current_page, last_page, total, per_page.
		meta() {
			return this.es_liquidadas ? this.store.liquidadas_meta : this.store.pendientes_meta
		},
		loading() {
			return this.es_liquidadas ? this.store.loading_liquidadas : this.store.loading_pendientes
		},
		hay_rango() {
			return !!(this.store.panel_desde || this.store.panel_hasta)
		},
		// La página se pide por el store: cambiarla vuelve a pedir SOLO esta tabla.
		pagina: {
			get() {
				return this.es_liquidadas ? this.store.liquidadas_page : this.store.pendientes_page
			},
			set(value) {
				if (value == this.pagina) {
					return
				}
				if (this.es_liquidadas) {
					this.$store.dispatch('seller_commission/setLiquidadasPage', value)
				} else {
					this.$store.dispatch('seller_commission/setPendientesPage', value)
				}
			},
		},
		// Filtro Todos / Comisiones / Pagos (solo liquidadas).
		tipo: {
			get() {
				return this.store.panel_tipo
			},
			set(value) {
				this.$store.dispatch('seller_commission/setPanelTipo', value)
			},
		},
		/*
			En liquidación inmediata la comisión se liquida al confirmar la venta y no sabemos
			cuándo se saldó la venta: por eso el encabezado dice "Liquidada el" y no "Saldada el".
		*/
		label_fecha_liquidacion() {
			if (this.seller && this.seller.commission_after_pay_sale) {
				return 'Saldada el'
			}
			return 'Liquidada el'
		},
		campos() {
			let campos = [
				{key: 'detalle', label: 'Detalle'},
				{key: 'fecha_venta', label: 'Fecha venta'},
				{key: 'importe', label: 'Importe', class: 'text-right'},
				{key: 'saldada', label: this.label_fecha_liquidacion},
				{key: 'porcentaje', label: '%', class: 'text-right'},
				{key: 'monto', label: 'Monto', class: 'text-right'},
			]
			if (this.es_liquidadas) {
				campos.push({key: 'saldo', label: 'Saldo', class: 'text-right'})
			}
			return campos
		},
		// Texto de la tabla vacía, según qué se está mirando.
		texto_vacio() {
			if (!this.es_liquidadas) {
				if (this.hay_rango) {
					return 'No hay comisiones pendientes en el período'
				}
				return 'No hay comisiones pendientes'
			}
			if (this.store.panel_tipo == 'pagos') {
				return this.hay_rango ? 'No hay pagos en el período' : 'Todavía no hay pagos a este vendedor'
			}
			if (this.store.panel_tipo == 'comisiones') {
				return this.hay_rango ? 'No hay comisiones liquidadas en el período' : 'Todavía no hay comisiones liquidadas'
			}
			if (this.hay_rango) {
				return 'No hay movimientos en el período'
			}
			return 'Todavía no hay comisiones para este vendedor'
		},
	},
	methods: {
		// `debe` / `haber` / `percentage` vienen null cuando no aplican; un 0 sí es un valor.
		tiene_valor(valor) {
			return valor !== null && typeof valor != 'undefined' && valor !== ''
		},
		/*
			Fecha en que el movimiento entró al ledger. La API la manda calculada en `fecha_mov`
			(COALESCE(liquidada_at, created_at), string local sin zona) y es la misma con la que
			ordena la tabla y calcula el saldo. El respaldo a `liquidada_at` / `created_at` solo
			cubre una API que no la mande.

			`date()` es `moment(d)`: el string local sin zona se toma como hora local y el
			`created_at` ISO con 'Z' se convierte de UTC a local, así que ninguno de los dos se
			corre tres horas.
		*/
		fecha_movimiento(item) {
			if (item.fecha_mov) {
				return item.fecha_mov
			}
			return item.liquidada_at ? item.liquidada_at : item.created_at
		},
		// Métodos de pago de un pago al vendedor: "Efectivo $10.000, Transferencia $5.000".
		metodos_de_pago(item) {
			if (!item.payment_methods || !item.payment_methods.length) {
				return ''
			}
			let partes = []
			item.payment_methods.forEach(payment_method => {
				let monto = payment_method.pivot ? payment_method.pivot.amount : null
				partes.push(payment_method.name+' '+this.price(monto))
			})
			return partes.join(', ')
		},
	},
}
</script>
<style scoped lang="sass">
.comision-tabla
	&__filtro
		margin-bottom: 10px

	&__wrapper
		// El radio va en un wrapper EXTERNO y no sobre el elemento que scrollea: el border-radius
		// no recorta las barras de scroll del propio elemento (mismo criterio que puntos/List.vue).
		border: 1px solid var(--color-border)
		border-radius: 10px
		overflow: hidden

		::v-deep table
			// Con `responsive`, el min-width hace que en tablet y teléfono la tabla scrollee
			// horizontal en vez de apretar las siete columnas hasta volverlas ilegibles.
			min-width: 820px
			margin-bottom: 0

		::v-deep td
			vertical-align: middle

	&__venta
		font-weight: 600
		white-space: nowrap

	&__titulo
		font-weight: 600
		color: var(--color-text-primary)
		white-space: nowrap

	&__meta
		font-size: 0.78rem
		color: var(--color-text-secondary)
		margin-top: 2px

	&__badge
		display: inline-block
		font-size: 0.72rem
		font-weight: 600
		color: var(--totales-acento-principal)
		background: var(--totales-acento-principal-bg)
		padding: 3px 10px
		border-radius: 999px
		white-space: nowrap

	&__monto
		font-weight: 700
		white-space: nowrap
		color: var(--color-text-primary)

		&--pago
			color: var(--totales-acento-positivo)

	&__saldo
		font-weight: 600
		white-space: nowrap
		color: var(--color-text-primary)

	&__paginacion
		display: flex
		align-items: center
		justify-content: space-between
		flex-wrap: wrap
		gap: 10px
		margin-top: 12px

	&__conteo
		font-size: 0.78rem
		color: var(--color-text-secondary)
</style>
