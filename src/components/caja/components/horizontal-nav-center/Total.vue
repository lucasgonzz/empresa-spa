<template>
	<!--
		Resumen compacto de saldos totales de las cajas visibles.
		Se muestra en la barra horizontal del módulo caja, solo para el owner.

		Grupo 223 · Prompt 03: si hay cajas con liquidación configurada, el "total" deja de ser un
		solo número: se muestra Disponible grande (protagonista, es lo que el dueño puede usar ya)
		y Contable/A liquidar chicos al lado. Si las tres sumas coinciden (ningún caja configurada,
		ej. todo efectivo), se sigue mostrando un solo número como antes de este prompt.
	-->
	<div
	class="caja-totales"
	v-if="is_owner">

		<!-- Chip de total en pesos -->
		<div class="caja-totales__chip caja-totales__chip--ars">
			<div class="caja-totales__icon-wrap">
				<i
				class="bi bi-currency-dollar"
				aria-hidden="true"></i>
			</div>
			<div class="caja-totales__body">
				<span class="caja-totales__label">Total en pesos</span>

				<template v-if="ars_sin_configurar">
					<span class="caja-totales__value">{{ price(ars.disponible) }}</span>
				</template>
				<template v-else>
					<span
					class="caja-totales__value caja-totales__value--disponible"
					:class="{ 'caja-totales__value--clickable': puede_ver_a_liquidar }"
					@click="verALiquidar('ars')">
						{{ price(ars.disponible) }}
					</span>
					<span class="caja-totales__secundarios">
						<span>Contable: {{ price(ars.contable) }}</span>
						<span
						class="caja-totales__a-liquidar"
						:class="{ 'caja-totales__value--clickable': puede_ver_a_liquidar }"
						@click="verALiquidar('ars')">
							A liquidar: {{ price(ars.a_liquidar) }}
						</span>
					</span>
				</template>

				<span class="caja-totales__meta">{{ cajas_count_label }}</span>
			</div>
		</div>

		<!-- Chip de total en dólares (solo con extensión habilitada) -->
		<div
		class="caja-totales__chip caja-totales__chip--usd"
		v-if="hasExtencion('ventas_en_dolares')">
			<div class="caja-totales__icon-wrap">
				<i
				class="bi bi-currency-exchange"
				aria-hidden="true"></i>
			</div>
			<div class="caja-totales__body">
				<span class="caja-totales__label">Total en dólares</span>

				<template v-if="usd_sin_configurar">
					<span class="caja-totales__value">{{ price(usd.disponible) }}</span>
				</template>
				<template v-else>
					<span
					class="caja-totales__value caja-totales__value--disponible"
					:class="{ 'caja-totales__value--clickable': puede_ver_a_liquidar }"
					@click="verALiquidar('usd')">
						{{ price(usd.disponible) }}
					</span>
					<span class="caja-totales__secundarios">
						<span>Contable: {{ price(usd.contable) }}</span>
						<span
						class="caja-totales__a-liquidar"
						:class="{ 'caja-totales__value--clickable': puede_ver_a_liquidar }"
						@click="verALiquidar('usd')">
							A liquidar: {{ price(usd.a_liquidar) }}
						</span>
					</span>
				</template>

				<span class="caja-totales__meta">{{ cajas_count_label }}</span>
			</div>
		</div>

	</div>
</template>
<script>
export default {
	computed: {
		/**
		 * Cajas cargadas en el store del módulo caja.
		 *
		 * @returns {Array}
		 */
		cajas() {
			if (this.$store.state.caja.filtered && this.$store.state.caja.filtered.length) {
				return this.$store.state.caja.filtered
			}
			return this.$store.state.caja.models
		},

		/**
		 * Cantidad de cajas incluidas en el resumen.
		 *
		 * @returns {number}
		 */
		cajas_count() {
			return this.cajas.length
		},

		/**
		 * Texto descriptivo de cuántas cajas suman los totales mostrados.
		 *
		 * @returns {string}
		 */
		cajas_count_label() {
			if (this.cajas_count === 1) {
				return '1 caja'
			}
			return this.cajas_count + ' cajas'
		},

		/**
		 * Suma de los tres saldos (contable/disponible/a liquidar) de las cajas en pesos.
		 * `saldo_contable`/`saldo_disponible`/`saldo_a_liquidar` los calcula el backend
		 * (Grupo 223 · Prompt 02) en `CajaController::index()`. Si una caja vieja todavía no
		 * los trajera por algún motivo, cae a `saldo` para no romper el total.
		 *
		 * @returns {Object} {contable, disponible, a_liquidar}
		 */
		ars() {
			return this.sumar_saldos(caja => caja.moneda_id === null || caja.moneda_id == 1)
		},

		/**
		 * Mismo cálculo que `ars`, para las cajas en dólares.
		 *
		 * @returns {Object} {contable, disponible, a_liquidar}
		 */
		usd() {
			return this.sumar_saldos(caja => caja.moneda_id == 2)
		},

		/**
		 * true si ninguna caja en pesos tiene liquidación configurada (los tres saldos
		 * coinciden): en ese caso se muestra un solo número, igual que antes de este prompt.
		 *
		 * @returns {Boolean}
		 */
		ars_sin_configurar() {
			return this.ars.contable === this.ars.disponible && this.ars.disponible === this.ars.a_liquidar
		},

		/**
		 * Mismo criterio que `ars_sin_configurar`, para dólares.
		 *
		 * @returns {Boolean}
		 */
		usd_sin_configurar() {
			return this.usd.contable === this.usd.disponible && this.usd.disponible === this.usd.a_liquidar
		},

		/**
		 * El detalle de "a liquidar" es por caja (el endpoint de línea de tiempo pide un id
		 * puntual). Con varias cajas visibles a la vez no hay una única caja para consultar,
		 * así que el chip solo es clickeable cuando se está viendo una sola caja.
		 *
		 * @returns {Boolean}
		 */
		puede_ver_a_liquidar() {
			return this.cajas_count === 1
		},
	},
	methods: {
		/**
		 * Suma `saldo_contable`/`saldo_disponible`/`saldo_a_liquidar` de las cajas que
		 * cumplen el filtro de moneda dado.
		 *
		 * @param {Function} filtro_moneda (caja) => Boolean
		 * @returns {Object} {contable, disponible, a_liquidar}
		 */
		sumar_saldos(filtro_moneda) {
			let contable = 0
			let disponible = 0
			let a_liquidar = 0

			this.cajas.forEach(caja => {
				if (!filtro_moneda(caja)) {
					return
				}
				contable += Number(typeof caja.saldo_contable != 'undefined' ? caja.saldo_contable : caja.saldo)
				disponible += Number(typeof caja.saldo_disponible != 'undefined' ? caja.saldo_disponible : caja.saldo)
				a_liquidar += Number(caja.saldo_a_liquidar || 0)
			})

			return { contable, disponible, a_liquidar }
		},

		/**
		 * Abre la línea de tiempo de liquidaciones pendientes de la única caja visible.
		 * No hace nada si hay más de una caja en pantalla (ver `puede_ver_a_liquidar`).
		 *
		 * @returns {void}
		 */
		verALiquidar() {
			if (!this.puede_ver_a_liquidar) {
				return
			}

			this.$store.commit('caja/setModel', {
				model: this.cajas[0],
				properties: [],
			})

			this.$bvModal.show('liquidacion-timeline')
		},
	},
}
</script>
<style scoped lang="sass">
@import '@/sass/_custom.scss'

// Acentos visuales por moneda (alineados con SaldosClientesFiltrados e IconCards)
$accent-ars: #d97706
$accent-usd: #0891b2

.caja-totales
	display: flex
	flex-direction: row
	// flex-wrap: wrap
	align-items: center
	gap: 10px
	margin: 0 10px

	&__chip
		display: flex
		align-items: center
		gap: 10px
		padding: 8px 12px
		border-radius: 10px
		border: 1px solid #e2e8f0
		background: #fff
		box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06)
		transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease
		min-width: 0

		&:hover
			transform: translateY(-1px)
			box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08)
			border-color: #cbd5e1

		&--ars
			.caja-totales__icon-wrap
				background: rgba($accent-ars, 0.12)
				color: $accent-ars

			.caja-totales__value
				color: darken($accent-ars, 8%)

		&--usd
			.caja-totales__icon-wrap
				background: rgba($accent-usd, 0.12)
				color: $accent-usd

			.caja-totales__value
				color: darken($accent-usd, 8%)

	&__icon-wrap
		flex-shrink: 0
		width: 34px
		height: 34px
		border-radius: 8px
		display: flex
		align-items: center
		justify-content: center

		i
			font-size: 1rem
			line-height: 1

	&__body
		display: flex
		flex-direction: column
		min-width: 0
		gap: 1px

	&__label
		font-size: 0.68rem
		font-weight: 600
		color: #64748b
		text-transform: uppercase
		letter-spacing: 0.04em
		line-height: 1.2
		white-space: nowrap

	&__value
		font-size: 1rem
		font-weight: 700
		line-height: 1.2
		white-space: nowrap

		&--disponible
			font-size: 1.15rem

		&--clickable
			cursor: pointer

			&:hover
				text-decoration: underline

	&__secundarios
		display: flex
		gap: 8px
		font-size: 0.7rem
		font-weight: 500
		color: #94a3b8
		white-space: nowrap

	&__a-liquidar
		cursor: default

	&__meta
		font-size: 0.68rem
		color: #94a3b8
		line-height: 1.2
		white-space: nowrap

	@media screen and (max-width: 576px)
		gap: 8px
		margin-right: 0
		width: 100%

		&__chip
			flex: 1 1 100%

		&__value
			font-size: 0.92rem
</style>
