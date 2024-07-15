<template>
	<b-row
	class="row-rango-temporal p-t-15 m-b-15">
		<b-col
		cols="12">
			<div class="cont-selects">

				<b-form-group
				label="Seleccione fecha">
					<b-form-select
					v-model="rango_temporal"
					:options="options"></b-form-select>
				</b-form-group>

				<b-form-group
				v-if="rango_temporal == 'rango-de-fechas'"
				label="Desde">
					<b-form-input
					v-model="mes_inicio"
					type="month"></b-form-input>
				</b-form-group>

				<b-form-group
				v-if="rango_temporal == 'rango-de-fechas'"
				label="Hasta">
					<b-form-input
					v-model="mes_fin"
					type="month"></b-form-input>
				</b-form-group>

				<b-button
				@click="buscar"
				:disabled="disabled"
				variant="primary">
					Buscar
				</b-button>
			</div>
		</b-col>
	</b-row>
</template>
<script>
export default {
	components: {
		DatePicker: () => import('@/common-vue/components/model/form/DatePicker'),
	},
	computed: {
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
		mes_inicio: {
			get() {
				return this.$store.state.reportes.mes_inicio
			},
			set(value) {
				this.$store.commit('reportes/setMesInicio', value)
			}
		},
		mes_fin: {
			get() {
				return this.$store.state.reportes.mes_fin
			},
			set(value) {
				this.$store.commit('reportes/setMesFin', value)
			}
		},
	},
	methods: {
		buscar() {
			this.$store.dispatch('reportes/getReportes')
		}
	}
}
</script>
<style lang="sass">
.row-rango-temporal

	.cont-selects
		display: flex 
		flex-direction: row 
		align-items: flex-end

		.form-group
			margin-bottom: 0 !important
			margin-right: 15px

			.cont-date-picker
				margin-bottom: 0 !important


		select 
			width: 200px
			margin-right: 15px
</style>