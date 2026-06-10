<template>
	<!-- Barra de búsqueda por rango de fechas -->
	<div class="article-sales-nav">
		<div class="article-sales-nav__main">
			<div class="article-sales-nav__field-group">
				<p class="article-sales-nav__label">
					<i class="icon-clock"></i>
					Rango de fechas
				</p>
				<from-until-dates
				:from_date="from_date"
				:until_date="until_date"
				@setFrom="setFrom"
				@setUntil="setUntil"></from-until-dates>
			</div>

			<b-button
			class="article-sales-nav__btn"
			@click="getSales"
			variant="primary">
				<i class="icon-search"></i>
				Buscar
			</b-button>
		</div>
	</div>
</template>
<script>
import moment from 'moment' 
export default {
	components: {
		FromUntilDates: () => import('@/common-vue/components/model/form/FromUntilDates')
	},
	data() {
		return {
			// Fecha inicial del filtro (primer día del mes actual)
	        from_date: moment().startOf('month').format('YYYY-MM-DD'),
			// Fecha final del filtro (hoy)
	        until_date: moment().format('YYYY-MM-DD')
		}
	},
	methods: {
		/**
		 * Actualiza la fecha desde del filtro.
		 * @param {Object} date - { value: 'YYYY-MM-DD' }
		 */
		setFrom(date) {
			this.from_date = date.value
		},
		/**
		 * Actualiza la fecha hasta del filtro.
		 * @param {Object} date - { value: 'YYYY-MM-DD' }
		 */
		setUntil(date) {
			this.until_date = date.value
		},
		/**
		 * Emite el rango de fechas al padre para disparar la búsqueda.
		 */
		getSales() {
			this.$emit('getSales', {from_date: this.from_date, until_date: this.until_date})
		},
	}
}
</script>
<style lang="sass">
$as-accent: #2563eb
$as-border: #e2e8f0
$as-muted: #64748b
$as-bg: #f8fafc

/* Panel de filtros del modal de ventas */
.article-sales-nav
	background: $as-bg
	border: 1px solid $as-border
	border-radius: 12px
	padding: 14px 16px

.article-sales-nav__main
	display: flex
	flex-direction: row
	flex-wrap: wrap
	align-items: flex-end
	justify-content: space-between
	gap: 12px 16px

.article-sales-nav__field-group
	flex: 1 1 280px
	min-width: 0

.article-sales-nav__label
	display: flex
	align-items: center
	gap: 6px
	font-size: 0.75rem
	font-weight: 700
	color: $as-muted
	text-transform: uppercase
	letter-spacing: 0.05em
	margin: 0 0 8px

	i
		font-size: 0.9rem

		&:before
			margin-right: 0

/* Inputs de fecha del componente compartido */
.article-sales-nav
	::v-deep .from-until-dates
		width: 100%
		max-width: 100%
		gap: 10px

		.form-control
			border-radius: 8px
			border-color: $as-border
			font-size: 0.9rem
			height: 38px
			flex: 1 1 0
			min-width: 0

			&:focus
				border-color: $as-accent
				box-shadow: 0 0 0 3px rgba($as-accent, 0.15)

		.m-l-15
			margin-left: 0 !important

.article-sales-nav__btn
	display: inline-flex
	align-items: center
	gap: 8px
	border-radius: 8px
	padding: 8px 18px
	font-weight: 600
	flex-shrink: 0
	height: 38px

	i:before
		margin-right: 0

@media screen and (max-width: 576px)
	.article-sales-nav__main
		flex-direction: column
		align-items: stretch

	.article-sales-nav__btn
		width: 100%
		justify-content: center

</style>