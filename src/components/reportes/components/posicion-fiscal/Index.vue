<template>
	<!-- Posicion Fiscal: IVA / IIBB / Ganancias, en renglones separados como los pide la DDJJ (tarea 04)

		Cada renglon lleva data-testid + data-monto (y data-tipo en los saldos), misma convencion que
		download-resources/Index.vue (data-estado/data-descargados/data-total).

		🔴 El data-monto NO es redundante con el texto del renglon, y por eso esta. formatear() es
		price(valor, false, false), que SIEMPRE recorta los dos decimales: una retencion de 1795,50
		se imprime "$1.795". Un test que leyera el texto no podria distinguir 1795,50 de 1795,99, o
		sea que no podria verificar el numero que este reporte existe para mostrar. El data-monto
		lleva el valor crudo que devolvio la API, sin formatear.
	-->
	<div
	v-if="view == 'posicion-fiscal'"
	class="posicion-fiscal m-t-20 p-b-100">

		<skeleton-cascada
		v-if="loading"
		:bloques="[
			{titulo: true, renglones: ['linea','linea','linea','linea','subtotal']},
			{titulo: true, renglones: ['linea','linea','linea','subtotal']},
			{titulo: true, renglones: ['linea','linea','subtotal']}
		]"></skeleton-cascada>

		<!-- Antes era un <template v-else>, que no puede llevar clase. El div intermedio es
		seguro: el sass de abajo usa selectores descendientes (.posicion-fiscal .cascada-card),
		no hijo directo -->
		<div
		v-else
		class="cascada-fundido">
			<!-- Posicion IVA -->
			<div class="cascada-card">
				<div class="cascada-card__header">
					<h6 class="cascada-card__titulo">IVA</h6>

					<!-- Restaura los dos exports .txt para AFIP que vivian en la tarjeta "Afip .TXT" de la
					vieja general/IconCards.vue. El grupo 227 (27/7/2026) borro esa tarjeta entera al
					reemplazar la seccion "General" por esta Posicion Fiscal y nunca migro estos dos
					botones — el backend (AfipController::exportVentas/exportAlicuotasTxt y sus rutas
					afip-txt*) nunca dejo de existir, asi que esto es restaurar, no construir de cero. -->
					<div class="cascada-card__acciones">
						<button
						type="button"
						class="cascada-card__accion-txt apretable"
						:data-testid="'posicion-fiscal-exportar-comprobantes-txt'"
						@click="exportarComprobantesTxt">
							<i class="bi bi-filetype-txt" aria-hidden="true"></i>
							Comprobantes .txt
						</button>
						<button
						type="button"
						class="cascada-card__accion-txt apretable"
						:data-testid="'posicion-fiscal-exportar-alicuotas-txt'"
						@click="exportarAlicuotasTxt">
							<i class="bi bi-filetype-txt" aria-hidden="true"></i>
							Alícuotas .txt
						</button>
					</div>
				</div>

				<div
				class="cascada-renglon apretable"
				:data-testid="'posicion-fiscal-iva-debito'"
				:data-monto="iva.iva_debito"
				@click="abrirDetalle('iva_debito')">
					<span class="cascada-renglon__label">
						<span class="cascada-renglon__icono acento-fiscal">
							<i class="bi bi-file-earmark-arrow-up" aria-hidden="true"></i>
						</span>
						IVA débito
					</span>
					<span class="cascada-renglon__monto">{{ formatear(iva.iva_debito) }}</span>
				</div>
				<!-- El debito fiscal que cancelan las notas de credito ya facturadas ante ARCA.
				Se resta del saldo igual que el IVA credito, por eso va pegado abajo del debito. -->
				<div
				class="cascada-renglon apretable"
				:data-testid="'posicion-fiscal-iva-notas-credito'"
				:data-monto="iva.iva_notas_credito"
				@click="abrirDetalle('iva_notas_credito')">
					<span class="cascada-renglon__label">
						<span class="cascada-renglon__icono acento-fiscal">
							<i class="bi bi-arrow-return-left" aria-hidden="true"></i>
						</span>
						IVA de notas de crédito emitidas
					</span>
					<span class="cascada-renglon__monto">{{ formatear(iva.iva_notas_credito) }}</span>
				</div>

				<!-- Un cero de arriba tiene dos causas posibles y son muy distintas: no hubo notas de
				credito, o las hubo pero su IVA todavia no se midio. Hasta el 1/9/2026 el sistema no
				guardaba el IVA de las notas de credito, asi que todo lo emitido antes de esa fecha
				necesita que se corra el backfill. Si no se dice, el contador lee el cero como un dato
				y paga de mas. -->
				<div
				v-if="iva.notas_credito_sin_medir > 0"
				class="posicion-fiscal__aviso-sin-medir"
				:data-testid="'posicion-fiscal-aviso-sin-medir'"
				:data-cantidad="iva.notas_credito_sin_medir">
					Hay {{ iva.notas_credito_sin_medir }}
					{{ iva.notas_credito_sin_medir == 1 ? 'nota de crédito emitida' : 'notas de crédito emitidas' }}
					ante ARCA sin el IVA medido, así que este renglón puede estar incompleto y el saldo a
					pagar salir más alto de lo que corresponde. Escribinos y revisamos cuáles podemos
					recuperar.
				</div>

				<div
				class="cascada-renglon apretable"
				:data-testid="'posicion-fiscal-iva-credito'"
				:data-monto="iva.iva_credito"
				@click="abrirDetalle('iva_credito')">
					<span class="cascada-renglon__label">
						<span class="cascada-renglon__icono acento-fiscal">
							<i class="bi bi-file-earmark-arrow-down" aria-hidden="true"></i>
						</span>
						IVA crédito
					</span>
					<span class="cascada-renglon__monto">{{ formatear(iva.iva_credito) }}</span>
				</div>
				<div
				class="cascada-renglon apretable"
				:data-testid="'posicion-fiscal-percepcion-iva'"
				:data-monto="iva.percepcion_iva_sufrida"
				@click="abrirDetalle('percepciones_iva')">
					<span class="cascada-renglon__label">
						<span class="cascada-renglon__icono acento-fiscal">
							<i class="bi bi-funnel" aria-hidden="true"></i>
						</span>
						Percepciones de IVA sufridas
					</span>
					<span class="cascada-renglon__monto">{{ formatear(iva.percepcion_iva_sufrida) }}</span>
				</div>
				<div
				class="cascada-renglon apretable"
				:data-testid="'posicion-fiscal-retencion-iva'"
				:data-monto="iva.retencion_iva_sufrida"
				@click="abrirDetalle('retenciones')">
					<span class="cascada-renglon__label">
						<span class="cascada-renglon__icono acento-fiscal">
							<i class="bi bi-scissors" aria-hidden="true"></i>
						</span>
						Retenciones de IVA sufridas
					</span>
					<span class="cascada-renglon__monto">{{ formatear(iva.retencion_iva_sufrida) }}</span>
				</div>

				<div
				class="cascada-renglon cascada-renglon--subtotal"
				:data-testid="'posicion-fiscal-saldo-iva'"
				:data-monto="iva.saldo"
				:data-tipo="iva.tipo"
				:class="{ 'cascada-renglon--favor': iva.tipo == 'a_favor' }">
					<span class="cascada-renglon__label">
						<span
						class="cascada-renglon__icono"
						:class="acento_saldo(iva)">
							<i class="bi bi-calculator" aria-hidden="true"></i>
						</span>
						{{ iva.tipo == 'a_favor' ? 'Saldo a favor' : 'Saldo a pagar' }}
					</span>
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
					:data-testid="'posicion-fiscal-iibb-determinado'"
					:data-monto="iibb.iibb_determinado"
					@click="abrirDetalle('percepciones_iibb')">
						<span class="cascada-renglon__label">
							<span class="cascada-renglon__icono acento-fiscal">
								<i class="bi bi-bank" aria-hidden="true"></i>
							</span>
							IIBB determinado
						</span>
						<span class="cascada-renglon__monto">{{ formatear(iibb.iibb_determinado) }}</span>
					</div>
					<div
					class="cascada-renglon apretable"
					:data-testid="'posicion-fiscal-percepcion-iibb'"
					:data-monto="iibb.percepcion_iibb_sufrida"
					@click="abrirDetalle('percepciones_iibb')">
						<span class="cascada-renglon__label">
							<span class="cascada-renglon__icono acento-fiscal">
								<i class="bi bi-funnel" aria-hidden="true"></i>
							</span>
							Percepciones de IIBB sufridas
						</span>
						<span class="cascada-renglon__monto">{{ formatear(iibb.percepcion_iibb_sufrida) }}</span>
					</div>
					<div
					class="cascada-renglon apretable"
					:data-testid="'posicion-fiscal-retencion-iibb'"
					:data-monto="iibb.retencion_iibb_sufrida"
					@click="abrirDetalle('retenciones')">
						<span class="cascada-renglon__label">
							<span class="cascada-renglon__icono acento-fiscal">
								<i class="bi bi-scissors" aria-hidden="true"></i>
							</span>
							Retenciones de IIBB sufridas
						</span>
						<span class="cascada-renglon__monto">{{ formatear(iibb.retencion_iibb_sufrida) }}</span>
					</div>

					<div
					class="cascada-renglon cascada-renglon--subtotal"
					:data-testid="'posicion-fiscal-saldo-iibb'"
					:data-monto="iibb.saldo"
					:data-tipo="iibb.tipo"
					:class="{ 'cascada-renglon--favor': iibb.tipo == 'a_favor' }">
						<span class="cascada-renglon__label">
							<span
							class="cascada-renglon__icono"
							:class="acento_saldo(iibb)">
								<i class="bi bi-calculator" aria-hidden="true"></i>
							</span>
							{{ iibb.tipo == 'a_favor' ? 'Saldo a favor' : 'Saldo a pagar' }}
						</span>
						<span class="cascada-renglon__monto">{{ formatear(iibb.saldo) }}</span>
					</div>
				</template>
			</div>

			<!-- Pagos a cuenta de Ganancias -->
			<div class="cascada-card m-t-20">
				<h6 class="cascada-card__titulo">Ganancias</h6>

				<div
				class="cascada-renglon apretable"
				:data-testid="'posicion-fiscal-retencion-ganancias'"
				:data-monto="ganancias.retencion_ganancias_sufrida"
				@click="abrirDetalle('retenciones')">
					<span class="cascada-renglon__label">
						<span class="cascada-renglon__icono acento-fiscal">
							<i class="bi bi-scissors" aria-hidden="true"></i>
						</span>
						Retenciones de Ganancias sufridas
					</span>
					<span class="cascada-renglon__monto">{{ formatear(ganancias.retencion_ganancias_sufrida) }}</span>
				</div>
			</div>
		</div>
	</div>
</template>
<script>
import detalle_drilldown from '@/mixins/reportes/detalle_drilldown'
import { env } from '@/runtime_config'

export default {
	mixins: [detalle_drilldown],
	components: {
		SkeletonCascada: () => import('@/components/reportes/components/SkeletonCascada'),
	},
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
		/**
		 * Acento del icono de un renglon de saldo fiscal, para que siga al color que la clase
		 * cascada-renglon--favor ya le pone al texto: verde a favor, rojo a pagar.
		 *
		 * @param {Object} posicion Objeto de posicion (iva o iibb), con su campo tipo
		 * @returns {String}
		 */
		acento_saldo(posicion) {
			if (posicion.tipo == 'a_favor') {
				return 'acento-dinero'
			}
			return 'acento-gastos'
		},
		/**
		 * Rango mensual (YYYY-MM) para los exports .txt de AFIP. Mismo criterio que
		 * fecha_moneda_params() en store/reportes/index.js: en 'Hoy' declara el mes en curso, en
		 * 'Rango de fechas' usa lo que el usuario eligio en el selector de arriba. Asi el .txt
		 * exportado siempre coincide con el periodo que la pantalla esta mostrando en ese momento.
		 *
		 * @returns {{desde: String, hasta: String}}
		 */
		rango_afip() {
			if (this.$store.state.reportes.rango_temporal == 'rango-de-fechas') {
				return {
					desde: this.$store.state.reportes.mes_inicio.substring(0, 7),
					hasta: this.$store.state.reportes.mes_fin.substring(0, 7),
				}
			}
			let mes_actual = this.today.substring(0, 7)
			return { desde: mes_actual, hasta: mes_actual }
		},
		/**
		 * Descarga el TXT de comprobantes de AFIP del periodo en pantalla (un renglon por
		 * comprobante autorizado). Restaura export_afip_txt() de la vieja general/IconCards.vue.
		 */
		exportarComprobantesTxt() {
			let rango = this.rango_afip()
			let link = env('VUE_APP_API_URL') + '/afip-txt/' + rango.desde + '/' + rango.hasta
			window.open(link)
		},
		/**
		 * Descarga el TXT de alicuotas de AFIP del periodo en pantalla (un renglon por alicuota de
		 * IVA con importe > 0). Restaura export_afip_alicuotas_txt(), mismo caso que el de arriba.
		 */
		exportarAlicuotasTxt() {
			let rango = this.rango_afip()
			let link = env('VUE_APP_API_URL') + '/afip-txt-alicuotas/' + rango.desde + '/' + rango.hasta
			window.open(link)
		},
	},
}
</script>
<style lang="sass">
// Paleta de acentos de los iconos de renglon. Misma familia que usaba IconCards.vue en
// develop, para que Reportes se sienta el mismo modulo aunque el layout haya cambiado.
// Los fondos, textos y bordes de este archivo YA pasaron a los tokens del tema oscuro; estas
// seis se quedan como literales a proposito: son colores de ACENTO, y los de accion y estado se
// mantienen iguales en los dos modos.
$acento-ventas: #2563eb
$acento-dinero: #059669
$acento-gastos: #dc2626
$acento-egresos: #7c3aed
$acento-deudas: #d97706
$acento-fiscal: #0891b2

.posicion-fiscal
	.cascada-card
		// La tarjeta flota sobre --color-bg: con un blanco fijo, en modo oscuro queda un
		// rectangulo encandilante en vez de una superficie elevada.
		background: var(--bg-card, #fff)
		border: 1px solid var(--color-border, #e2e8f0)
		border-radius: 12px
		box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06)
		padding: 12px 28px
		max-width: 720px
		margin: 0 auto

		&__titulo
			font-size: 0.95rem
			font-weight: 700
			// 7/9/2026: token solo-oscuro (declarado unicamente en html.dark-mode), NO
			// var(--color-text-secondary, ...). El fallback de un var() entra solo si la custom
			// property no existe: con --color-text-secondary, que si existe en :root, el modo claro
			// pasaria de #475569 a #6c757d y el contraste sobre blanco caeria de 8,6:1 a 4,7:1.
			color: var(--texto-seccion-reportes, #475569)
			text-transform: uppercase
			letter-spacing: 0.04em
			padding: 14px 0 4px
			margin: 0

		// Cabecera de la tarjeta IVA: titulo a la izquierda, exports .txt de AFIP a la derecha.
		// flex-wrap para que en telefono (360-390px) los botones bajen debajo del titulo en vez
		// de comprimirse hasta desbordar la tarjeta.
		&__header
			display: flex
			align-items: center
			justify-content: space-between
			flex-wrap: wrap
			gap: 8px 12px

			.cascada-card__titulo
				padding-bottom: 0

		&__acciones
			display: flex
			gap: 8px
			flex-wrap: wrap
			padding: 10px 0 4px

		&__accion-txt
			display: inline-flex
			align-items: center
			gap: 6px
			border: none
			background: rgba($acento-fiscal, 0.08)
			color: $acento-fiscal
			font-size: 0.78rem
			font-weight: 600
			padding: 6px 10px
			border-radius: 8px
			cursor: pointer
			transition: background 120ms ease-out
			white-space: nowrap

			&:hover
				background: rgba($acento-fiscal, 0.16)

			i
				font-size: 0.9rem
				line-height: 1

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
		// 🔴 7/9/2026: el separador NO va como var(--color-border-secondary, #f1f5f9). El fallback
		// de un var() entra unicamente cuando la custom property NO esta definida, y ese token SI
		// esta definido en :root (vale #e9ecef): en claro ganaba el token y cada linea divisoria
		// se marcaba mas. Suelta es sutil, pero esta lista es larga y el corrimiento se repite en
		// cada renglon. --borde-renglon-cascada existe SOLO en html.dark-mode (ver
		// _dark_theme.sass), asi que aca el fallback si entra y el claro se queda con el #f1f5f9
		// de siempre.
		border-bottom: 1px solid var(--borde-renglon-cascada, #f1f5f9)
		font-size: 0.95rem
		color: var(--color-text-primary, #0f172a)

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
			border-top: 2px solid var(--color-border, #e2e8f0)
			border-bottom: 2px solid var(--color-border, #e2e8f0)
			color: #dc2626

		&--favor
			color: #059669

	&__aviso-iibb
		padding: 16px 0
		color: var(--color-text-secondary, #64748b)
		font-size: 0.9rem

		p
			margin-bottom: 10px

	// Aviso de "todavia no lo medimos" del renglon de notas de credito. Va en el amarillo de
	// $acento-deudas y no en el gris del aviso de IIBB a proposito: aquel explica una configuracion
	// que falta, este avisa que un numero fiscal en pantalla puede estar incompleto.
	&__aviso-sin-medir
		margin: 4px 0 12px
		padding: 12px 14px
		border-left: 3px solid $acento-deudas
		border-radius: 6px
		background: rgba($acento-deudas, 0.08)
		color: #7c5300
		font-size: 0.85rem
		line-height: 1.45

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
