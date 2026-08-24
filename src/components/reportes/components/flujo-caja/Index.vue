<template>
	<!-- Flujo de Caja percibido: ingresos, egresos y flujo neto, con desglose por caja/metodo (tarea 03) -->
	<div
	v-if="view == 'flujo-de-caja'"
	class="flujo-caja m-t-20 p-b-100">

		<skeleton-cascada
		v-if="loading"
		:bloques="[
			{titulo: true, renglones: ['linea','linea','subtotal']},
			{titulo: true, renglones: ['linea','linea','subtotal']},
			{titulo: false, renglones: ['final']}
		]"></skeleton-cascada>

		<!-- Antes era un <template v-else>, que no puede llevar clase. El div intermedio es
		seguro: el sass de abajo usa selectores descendientes (.flujo-caja .cascada-card),
		no hijo directo -->
		<div
		v-else
		class="cascada-fundido">
			<div class="cascada-card">

				<h6 class="cascada-card__titulo">Ingresos</h6>

				<div class="cascada-renglon">
					<span class="cascada-renglon__label">
						<span class="cascada-renglon__icono acento-ventas">
							<i class="bi bi-shop-window" aria-hidden="true"></i>
						</span>
						Cobros en mostrador
					</span>
					<span class="cascada-renglon__monto">{{ formatear(model.cobros_mostrador) }}</span>
				</div>
				<div class="cascada-renglon">
					<span class="cascada-renglon__label">
						<span class="cascada-renglon__icono acento-ventas">
							<i class="bi bi-journal-text" aria-hidden="true"></i>
						</span>
						Cobranzas de cuenta corriente
					</span>
					<span class="cascada-renglon__monto">{{ formatear(model.cobranzas_cuenta_corriente) }}</span>
				</div>
				<div
				class="cascada-renglon cascada-renglon--subtotal apretable"
				@click="abrirDetalle('cobranzas')">
					<span class="cascada-renglon__label">
						<span class="cascada-renglon__icono acento-dinero">
							<i class="bi bi-arrow-down-circle" aria-hidden="true"></i>
						</span>
						Total ingresos
					</span>
					<span class="cascada-renglon__monto">{{ formatear(model.total_ingresos) }}</span>
				</div>

				<div
				v-if="model.ingresos_por_caja_metodo && model.ingresos_por_caja_metodo.length"
				class="cascada-desglose">
					<p class="cascada-desglose__titulo">Desglose por caja / método</p>
					<div
					v-for="(fila, i) in model.ingresos_por_caja_metodo"
					:key="'ingreso-'+i"
					class="cascada-desglose__item">
						<span>{{ etiqueta_caja(fila.caja_id) }} · {{ etiqueta_metodo(fila.current_acount_payment_method_id) }}</span>
						<span>{{ formatear(fila.total) }}</span>
					</div>
				</div>
			</div>

			<div class="cascada-card m-t-20">

				<h6 class="cascada-card__titulo">Egresos</h6>

				<div
				class="cascada-renglon apretable"
				@click="abrirDetalle('pagos_proveedores')">
					<span class="cascada-renglon__label">
						<span class="cascada-renglon__icono acento-egresos">
							<i class="bi bi-truck" aria-hidden="true"></i>
						</span>
						Pagos a proveedores
					</span>
					<span class="cascada-renglon__monto">{{ formatear(model.pagos_a_proveedores) }}</span>
				</div>
				<div
				class="cascada-renglon apretable"
				@click="abrirDetalle('gastos')">
					<span class="cascada-renglon__label">
						<span class="cascada-renglon__icono acento-gastos">
							<i class="bi bi-cash-stack" aria-hidden="true"></i>
						</span>
						Gastos pagados
					</span>
					<span class="cascada-renglon__monto">{{ formatear(model.gastos_pagados) }}</span>
				</div>
				<div
				v-if="model.gastos_pagados_por_categoria && model.gastos_pagados_por_categoria.length"
				class="cascada-desglose">
					<div
					v-for="categoria in model.gastos_pagados_por_categoria"
					:key="categoria.expense_concept_id"
					class="cascada-desglose__item">
						<span>{{ categoria.concepto }}</span>
						<span>{{ formatear(categoria.total) }}</span>
					</div>
				</div>

				<div class="cascada-renglon cascada-renglon--subtotal">
					<span class="cascada-renglon__label">
						<span class="cascada-renglon__icono acento-gastos">
							<i class="bi bi-arrow-up-circle" aria-hidden="true"></i>
						</span>
						Total egresos
					</span>
					<span class="cascada-renglon__monto">{{ formatear(model.total_egresos) }}</span>
				</div>

				<div
				v-if="model.egresos_por_caja_metodo && model.egresos_por_caja_metodo.length"
				class="cascada-desglose">
					<p class="cascada-desglose__titulo">Desglose por caja / método</p>
					<div
					v-for="(fila, i) in model.egresos_por_caja_metodo"
					:key="'egreso-'+i"
					class="cascada-desglose__item">
						<span>{{ etiqueta_caja(fila.caja_id) }} · {{ etiqueta_metodo(fila.current_acount_payment_method_id) }}</span>
						<span>{{ formatear(fila.total) }}</span>
					</div>
				</div>
			</div>

			<div class="cascada-card m-t-20">
				<div class="cascada-renglon cascada-renglon--subtotal cascada-renglon--final">
					<span class="cascada-renglon__label">
						<span class="cascada-renglon__icono acento-dinero">
							<i class="bi bi-wallet2" aria-hidden="true"></i>
						</span>
						Flujo neto del período
					</span>
					<span class="cascada-renglon__monto">{{ formatear(model.flujo_neto) }}</span>
				</div>
			</div>

			<!-- Plata en transito: bloque separado, no suma al flujo neto del periodo (tarea 03) -->
			<div
			v-if="model.plata_en_transito"
			class="cascada-card cascada-card--transito m-t-20">
				<h6 class="cascada-card__titulo">Todavía no lo tenés, pero está en camino</h6>
				<p class="cascada-nota">
					Este monto no forma parte del flujo neto del período: son cobros que todavía no impactaron en la caja.
				</p>

				<div
				class="cascada-renglon apretable"
				@click="abrirDetalle('liquidaciones_pendientes')">
					<span class="cascada-renglon__label">
						<span class="cascada-renglon__icono acento-deudas">
							<i class="bi bi-hourglass-split" aria-hidden="true"></i>
						</span>
						Liquidaciones pendientes
					</span>
					<span class="cascada-renglon__monto">{{ formatear(total_liquidaciones_pendientes) }}</span>
				</div>
				<div
				class="cascada-renglon apretable"
				@click="abrirDetalle('cheques_en_cartera')">
					<span class="cascada-renglon__label">
						<span class="cascada-renglon__icono acento-deudas">
							<i class="bi bi-file-earmark-check" aria-hidden="true"></i>
						</span>
						Cheques diferidos en cartera
					</span>
					<span class="cascada-renglon__monto">{{ formatear(total_cheques_diferidos) }}</span>
				</div>
				<div class="cascada-renglon cascada-renglon--subtotal">
					<span class="cascada-renglon__label">
						<span class="cascada-renglon__icono acento-deudas">
							<i class="bi bi-send" aria-hidden="true"></i>
						</span>
						Total en camino
					</span>
					<span class="cascada-renglon__monto">{{ formatear(model.plata_en_transito.total_estimado) }}</span>
				</div>
			</div>
		</div>
	</div>
</template>
<script>
import detalle_drilldown from '@/mixins/reportes/detalle_drilldown'

export default {
	mixins: [detalle_drilldown],
	components: {
		SkeletonCascada: () => import('@/components/reportes/components/SkeletonCascada'),
	},
	created() {
		this.$store.dispatch('reportes/getFlujoCaja')
	},
	computed: {
		model() {
			return this.$store.state.reportes.flujo_caja
		},
		loading() {
			return this.$store.state.reportes.flujo_caja_loading
		},
		/* Suma de las liquidaciones pendientes (plata en transito), para mostrar el mismo total que abre el drill-down */
		total_liquidaciones_pendientes() {
			if (!this.model.plata_en_transito || !this.model.plata_en_transito.liquidaciones_pendientes) {
				return 0
			}
			let total = 0
			this.model.plata_en_transito.liquidaciones_pendientes.forEach(fila => {
				total += Number(fila.total)
			})
			return total
		},
		/* Suma de los cheques diferidos en cartera (plata en transito) */
		total_cheques_diferidos() {
			if (!this.model.plata_en_transito || !this.model.plata_en_transito.cheques_diferidos) {
				return 0
			}
			let total = 0
			this.model.plata_en_transito.cheques_diferidos.forEach(fila => {
				total += Number(fila.total)
			})
			return total
		},
	},
	methods: {
		formatear(valor) {
			return this.price(valor, false, false)
		},
		/*
			Ítem 9 (tanda-correctivos-2408): el desglose muestra nombres reales, no ids.
			Los catálogos de cajas y métodos de pago se descargan al iniciar sesión
			(mixins/call_methods.js), así que se resuelven acá contra el store. Fallback
			al "#id" si el catálogo todavía no llegó o el id ya no existe (caja borrada).
			Al ser métodos llamados desde el render, Vue trackea state.caja.models /
			state.current_acount_payment_method.models: cuando el catálogo termina de
			bajar, el desglose se re-renderiza solo con los nombres.
		*/
		etiqueta_caja(caja_id) {
			/* Sin caja (null o 0): rótulo claro en vez de "Caja #null". */
			if (!caja_id) {
				return 'Sin caja asignada'
			}
			let caja = this.$store.state.caja.models.find(caja => caja.id == caja_id)
			if (caja && caja.name) {
				return caja.name
			}
			return 'Caja #' + caja_id
		},
		etiqueta_metodo(metodo_id) {
			/* Sin método (null o 0): mismo criterio que etiqueta_caja. */
			if (!metodo_id) {
				return 'Sin método'
			}
			let metodo = this.$store.state.current_acount_payment_method.models.find(metodo => metodo.id == metodo_id)
			if (metodo && metodo.name) {
				return metodo.name
			}
			return 'Método #' + metodo_id
		},
	},
}
</script>
<style lang="sass">
// Paleta de acentos de los iconos de renglon. Misma familia que usaba IconCards.vue en
// develop, para que Reportes se sienta el mismo modulo aunque el layout haya cambiado.
// Si algun dia este modulo pasa a los tokens de --dark_theme, estas seis variables son
// el unico punto a tocar por archivo.
$acento-ventas: #2563eb
$acento-dinero: #059669
$acento-gastos: #dc2626
$acento-egresos: #7c3aed
$acento-deudas: #d97706
$acento-fiscal: #0891b2

.flujo-caja
	.cascada-card
		background: #fff
		border: 1px solid #e2e8f0
		border-radius: 12px
		box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06)
		padding: 12px 28px
		max-width: 720px
		margin: 0 auto

		&--transito
			background: #f8fafc
			border-style: dashed
			border-color: #cbd5e1

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
		// Era baseline. Con el icono adentro del label, el baseline toma el borde
		// inferior de la cajita del icono y descoloca el monto de la derecha; con
		// center las dos columnas quedan alineadas por el medio.
		align-items: center
		// 14px -> 18px: la cascada es una lista larga de numeros y con 14 los
		// renglones se leian pegados.
		padding: 18px 0
		border-bottom: 1px solid #f1f5f9
		font-size: 0.95rem
		color: #0f172a

		&:last-child
			border-bottom: none

		&__label
			display: flex
			align-items: center
			gap: 12px
			min-width: 0

		&__icono
			flex-shrink: 0
			width: 30px
			height: 30px
			border-radius: 8px
			display: inline-flex
			align-items: center
			justify-content: center
			background: rgba($acento-ventas, 0.10)
			color: $acento-ventas

			i
				// En rem y no en em, para que la cajita mida siempre lo mismo aunque el
				// renglon que la contiene cambie de font-size.
				font-size: 0.95rem
				line-height: 1

			&.acento-dinero
				background: rgba($acento-dinero, 0.10)
				color: $acento-dinero
			&.acento-gastos
				background: rgba($acento-gastos, 0.10)
				color: $acento-gastos
			&.acento-egresos
				background: rgba($acento-egresos, 0.10)
				color: $acento-egresos
			&.acento-deudas
				background: rgba($acento-deudas, 0.10)
				color: $acento-deudas
			&.acento-fiscal
				background: rgba($acento-fiscal, 0.10)
				color: $acento-fiscal

		&--subtotal
			font-weight: 700
			font-size: 1.05rem
			border-top: 2px solid #e2e8f0
			border-bottom: 2px solid #e2e8f0

		&--final
			font-size: 1.2rem
			color: #059669

	.cascada-desglose
		padding: 0 0 10px 18px

		&__titulo
			font-size: 0.75rem
			color: #64748b
			text-transform: uppercase
			letter-spacing: 0.04em
			margin: 6px 0 4px

		&__item
			display: flex
			justify-content: space-between
			font-size: 0.8rem
			color: #94a3b8
			padding: 6px 0

	.cascada-nota
		font-size: 0.82rem
		color: #64748b
		margin: 0 0 10px

	// Fundido corto al reemplazar el skeleton por el contenido real. Escrito a mano y no
	// con animate.css: esa libreria no esta cargada en este repo
	.cascada-fundido
		animation: cascada-fundido-in 220ms ease-out both

@keyframes cascada-fundido-in
	from
		opacity: 0
	to
		opacity: 1
</style>
