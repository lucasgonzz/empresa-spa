<template>
	<b-row
	class="row-rango-temporal p-t-15">
		<b-col
		cols="12">
			<div class="cont-selects">

				<b-form-group
				:disabled="is_article_view"
				label="Seleccione fecha">
					<b-form-select
					v-model="rango_temporal"
					:options="options"></b-form-select>
				</b-form-group>

				<dia-en-especifico></dia-en-especifico>

				<rango-temporal></rango-temporal>

				<b-button
				@click="buscar"
				v-if="view != 'articulos'"
				:disabled="disabled"
				variant="primary">
					Buscar
				</b-button>
			</div>
		</b-col>

		<info-time></info-time>

	</b-row>
</template>
<script>
export default {
	components: {
		// DatePicker: () => import('@/common-vue/components/model/form/DatePicker'),
		DiaEnEspecifico: () => import('@/components/reportes/components/general/select-date/DiaEnEspecifico'),
		RangoTemporal: () => import('@/components/reportes/components/general/select-date/RangoTemporal'),
		InfoTime: () => import('@/components/reportes/components/general/select-date/InfoTime'),
	},
	watch: {
		view() {
			if (this.is_article_view) {

				this.set_fecha_por_meses()
			}
		},
	},
	computed: {
		is_article_view() {
			return this.view == 'articulos'
		},
		disabled() {
			if (this.rango_temporal == 'rango-de-fechas') {
				return this.mes_inicio == '' || this.mes_fin == ''
			}
			return false
		},
		options() {
			return [
				{
					text: 'Dia actual',
					value: 'dia-actual'
				},
				{
					text: 'Dia en especifico',
					value: 'dia-en-especifico'
				},
				{
					text: 'Rango de fechas',
					value: 'rango-de-fechas'
				},
			]
		},
		rango_temporal: {
			get() {
				return this.$store.state.reportes.rango_temporal
			},
			set(value) {
				this.$store.commit('reportes/setRangoTemporal', value)
			}
		},
	},
	methods: {
		set_fecha_por_meses() {
				this.$store.commit('reportes/setRangoTemporal', 'rango-de-fechas')
		},
		buscar() {
			this.$store.dispatch('reportes/getReportes')
		}
	}
}
</script>
<style lang="sass">
.cont-selects
	display: flex 
	@media screen and (max-width: 825px)
		flex-direction: column 
		align-items: flex-start		
	@media screen and (min-width: 825px)
		flex-direction: row 
		align-items: flex-end

	.form-group
		@media screen and (max-width: 825px)
			margin-bottom: 10px !important
		@media screen and (min-width: 825px)
			margin-bottom: 0 !important

		margin-right: 15px

		.cont-date-picker
			margin-bottom: 0 !important


	select 
		width: 200px
		margin-right: 15px
</style>