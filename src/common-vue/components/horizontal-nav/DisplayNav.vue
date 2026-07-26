<template>
	<div 
	class="display-nav m-t-15 m-sm-t-0"> 
		<div   
		v-if="change_from_dates_option"
		:class="isSelectedFromDates(true)"
		@click="setFromDates(true)"
		class="item apretable">
			Por fecha 
		</div>
		
		<div
		v-if="change_from_dates_option"
		:class="isSelectedFromDates(false)"
		@click="setFromDates(false)"
		class="item apretable">
			Historico
		</div>
	</div>
</template>
<script>
export default {
	props: {
		model_name: String,
		change_from_dates_option: Boolean,
	},
	computed: {
		current_display() {
			return this.$store.state[this.model_name].display
		},
	},
	methods: {
		/**
		 * Devuelve la clase 'active' cuando el valor coincide con el modo actual (from_dates),
		 * para pintar la pestaña seleccionada con el estilo segmentado nuevo (prompt 05 grupo 221).
		 *
		 * @param {Boolean} value - true = "Por fecha", false = "Historico"
		 * @returns {String} 'active' o cadena vacía
		 */
		isSelectedFromDates(value) {
			return this.$store.state[this.model_name].from_dates == value ? 'active' : ''
		},
		/**
		 * Cambia entre "Por fecha" e "Historico" (prompt 05 grupo 221).
		 * - Historico (value = false): dispatchea runListadoPorDefecto para traer el listado
		 *   completo paginado y ordenado por id descendente, igual que el listado por defecto
		 *   de los demás módulos.
		 * - Por fecha (value = true): antes de pedir los modelos por fecha, limpia todo el
		 *   estado que haya dejado el historico paginado (mismos commits que restartSearch() en
		 *   BtnRestartFilter.vue), para que la tabla no se quede mostrando `filtered` ni
		 *   `listado_por_defecto` de la vista anterior.
		 *
		 * @param {Boolean} value - true = "Por fecha", false = "Historico"
		 */
		setFromDates(value) {
			this.$store.commit(this.model_name+'/setFromDates', value)
			if (!value) {
				this.$store.dispatch(this.model_name+'/runListadoPorDefecto')
				return
			}
			// Limpieza del estado de paginado/historico antes de volver a "Por fecha".
			this.$store.commit(this.model_name+'/setFiltered', [])
			this.$store.commit(this.model_name+'/setIsFiltered', false)
			this.$store.commit(this.model_name+'/setFilterPage', 1)
			this.$store.commit(this.model_name+'/setTotalFilterPages', null)
			this.$store.commit(this.model_name+'/setTotalFilterResults', 0)
			this.$store.commit(this.model_name+'/set_listado_por_defecto', false)
			this.$store.commit(this.model_name+'/setGlobalSearchPayload', null)
			this.$store.dispatch(this.model_name+'/getModels')
		},
		setDisplay(display) {
			this.$emit('setDisplay', display)
			if (this.current_display == display) {
				this.$store.dispatch(this.model_name+'/getModels')
			} else {
				this.$store.commit(this.model_name+'/setDisplay', display)
			}
		},
		isSelected(display) {
			if (this.current_display == display) {
				return 'selected-display'
			}
			return 'nooo'
		}
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'
/* Pista gris segmentada (mismos valores que .horizontal-nav en horizontal-nav/Index.vue, prompt 05 grupo 221) */
.display-nav
	display: inline-flex
	width: fit-content
	max-width: 100%
	min-width: 0
	gap: 6px
	padding: 4px
	background-color: #E3E3E3
	border-radius: 8px

	/* Pestaña inactiva: texto secundario sobre fondo transparente */
	.item
		border: none
		border-radius: 6px
		padding: 8px 12px
		cursor: pointer
		font-size: 0.875rem
		font-weight: 500
		line-height: 1.25
		color: #6c757d
		background-color: transparent
		white-space: nowrap
		transition: color 0.12s ease, background-color 0.12s ease, box-shadow 0.12s ease

		&:hover:not(.active)
			color: #0d6efd
			background-color: #e7f1ff

		&:focus,
		&:focus-visible
			box-shadow: none
			outline: none

		&:focus-visible
			outline: 2px solid #0d6efd
			outline-offset: 2px

		/* Pestaña activa: relleno azul sólido como btn-primary */
		&.active
			color: #fff
			background-color: #0d6efd
			font-weight: 600
			box-shadow: 0 1px 2px rgba(13, 110, 253, 0.28)

			&:hover
				color: #fff
				background-color: #0b5ed7
</style>