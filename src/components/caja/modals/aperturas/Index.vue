<template>
	<b-modal
	size="lg"
	title="Aperturas"
	hide-footer
	id="aperturas-caja">

		<!--
			Encabezado de contexto: sin esto el modal no dice de que caja son las aperturas mas
			alla del titulo, ni en que estado esta, ni cuantas hay.
		-->
		<div
		class="aperturas-resumen"
		v-if="caja">
			<div class="aperturas-resumen__titulo">
				<span class="aperturas-resumen__nombre">{{ caja.name }}</span>
				<estado-caja
				:abierta="!!caja.abierta"></estado-caja>
			</div>

			<div class="aperturas-resumen__datos">
				<div class="aperturas-resumen__dato">
					<span class="aperturas-resumen__label">Saldo</span>
					<span class="aperturas-resumen__valor">{{ price(caja.saldo) }}</span>
				</div>

				<div
				class="aperturas-resumen__dato"
				v-if="mostrar_disponible">
					<span class="aperturas-resumen__label">Disponible</span>
					<span class="aperturas-resumen__valor">{{ price(caja.saldo_disponible) }}</span>
				</div>

				<div class="aperturas-resumen__dato">
					<span class="aperturas-resumen__label">Aperturas</span>
					<span class="aperturas-resumen__valor">{{ aperturas.length }}</span>
				</div>
			</div>
		</div>

		<!--
			listado_paginado_por_defecto en false: BtnAperturas.vue YA carga las aperturas
			scopeadas por esta caja (route_prefix = caja.id + apertura_caja/getModels) antes
			de abrir el modal. Sin este corte, el view-component dispara ademas su propio
			runListadoPorDefecto (grupo 221) contra global-search/apertura_caja, que no
			respeta route_prefix (trae aperturas de TODAS las cajas del usuario) y encima
			rompe con 500 porque apertura_cajas no tiene columna user_id (el dueno vive en
			cajas.user_id, un nivel arriba). Ver hallazgo 20260810-buscador-general-modelos-sin-user-id.
		-->
		<view-component
		@clicked="clicked"
		:set_model_on_row_selected="false"
		:show_btn_create="false"
		:listado_paginado_por_defecto="false"
		model_name="apertura_caja">

			<!--
				La apertura en curso tiene cerrada_at en null y la celda quedaba vacia: se leia
				como un dato que falta y no como "esta abierta ahora". La rama v-else usa el
				mismo date(valor, true) de InfoAperturaCaja.vue, que coincide con el
				show_full_date del modelo, asi que una fila cerrada se ve igual que antes.
			-->
			<template #table-prop-cerrada_at="props">
				<estado-caja
				v-if="!props.model.cerrada_at"
				:abierta="true"
				texto_abierta="En curso"></estado-caja>

				<span v-else>
					{{ date(props.model.cerrada_at, true) }}
				</span>
			</template>

			<template #table_right_options="props">
				<table-buttons
				:apertura_caja="props.model"></table-buttons>
			</template>
		</view-component>
	</b-modal>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		TableButtons: () => import('@/components/caja/modals/aperturas/table-buttons/Index'),
		EstadoCaja: () => import('@/components/caja/components/EstadoCaja'),
	},
	computed: {
		caja() {
			return this.$store.state.caja.model
		},
		/**
		 * El saldo disponible solo se muestra cuando el backend lo mando Y difiere del contable:
		 * en una caja sin liquidacion configurada (efectivo) los dos numeros son iguales y
		 * repetirlos al lado seria ruido. Mismo criterio defensivo que sumar_saldos() en
		 * horizontal-nav-center/Total.vue, que tampoco da por hecho que el campo venga.
		 *
		 * @returns {Boolean}
		 */
		mostrar_disponible() {
			if (!this.caja) {
				return false
			}
			if (typeof this.caja.saldo_disponible == 'undefined') {
				return false
			}
			return Number(this.caja.saldo_disponible) != Number(this.caja.saldo)
		},
		/**
		 * Aperturas cargadas en el store para esta caja (las trae BtnAperturas antes de abrir el
		 * modal, via apertura_caja/getModels con route_prefix = caja.id).
		 *
		 * @returns {Array}
		 */
		aperturas() {
			return this.$store.state.apertura_caja.models
		},
	},
	methods: {
		clicked(apertura_caja) {
			this.$store.commit('apertura_caja/setModel', {model: apertura_caja, properties: []})

			this.$store.commit('movimiento_caja/set_route_prefix', apertura_caja.id)
			this.$store.dispatch('movimiento_caja/getModels')

			this.$bvModal.show('movimientos-caja')
		}
	}
}
</script>
<style scoped lang="sass">
// Tarjeta de contexto del modal, en el mismo lenguaje que los chips de la barra horizontal
// (radio 10px, borde de 1px, etiqueta chica en mayusculas y valor en negrita), pero ancha:
// aca no compite con nada al lado, ocupa el ancho del modal.
.aperturas-resumen
	display: flex
	flex-direction: column
	gap: 12px
	padding: 14px 16px
	border-radius: 10px
	border: 1px solid var(--color-border)
	background: var(--bg-section)
	margin-bottom: 4px

	&__titulo
		display: flex
		align-items: center
		gap: 10px
		flex-wrap: wrap

	&__nombre
		font-size: 1.05rem
		font-weight: 700
		color: var(--color-text-primary)

	&__datos
		display: flex
		flex-direction: row
		flex-wrap: wrap
		gap: 26px

	&__dato
		display: flex
		flex-direction: column
		gap: 2px
		min-width: 0

	&__label
		font-size: 0.68rem
		font-weight: 600
		color: var(--color-text-secondary)
		text-transform: uppercase
		letter-spacing: 0.04em
		line-height: 1.2
		white-space: nowrap

	&__valor
		font-size: 1rem
		font-weight: 700
		line-height: 1.2
		color: var(--color-text-primary)
		white-space: nowrap
</style>
