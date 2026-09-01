<template>
	<div
	v-if="filter"
	class="th-filter-btns">

		<!--
			Los dos testid llevan la key de la columna porque este bloque se repite en CADA
			encabezado de la tabla. Y son `btn-abrir-filtro-` / `btn-limpiar-filtro-`, que no
			comparten comienzo entre si ni con `btn-aplicar-filtro-` (el de adentro del panel):
			los specs ubican por prefijo y dos nombres anidados romperian esa busqueda.
		-->
		<button
		type="button"
		class="th-filter-btn"
		:class="{ 'th-filter-btn--active': filtro_usado }"
		:data-testid="'btn-abrir-filtro-'+field.key"
		:id="'btn_filter_'+field.key"
		@click="toggleFilter(field.key)">
			<i class="icon-search"></i>
		</button>

		<button
		type="button"
		v-if="filtro_usado"
		class="th-filter-btn th-filter-btn--danger"
		:data-testid="'btn-limpiar-filtro-'+field.key"
		@click="call_limpiar_filtro(field.key)">
			<i class="icon-undo"></i>
		</button>
	</div>
</template>
<script>
import filters from '@/common-vue/mixins/filters'
export default {
	mixins: [filters],
	props: {
		field: Object,
		model_name: String,
	},
	computed: {
		filter() {
			let filter = this.$store.state[this.model_name].filters.find(_filter => _filter.key == this.field.key)

			if (typeof filter != 'undefined') {
				return filter  
			}
			return null
		},
		filtro_usado() {
			if (this.filter) {
				// Si el usuario marcó "En blanco" o "Que no esté en blanco", el filtro cuenta como activo.
				if (typeof this.filter.en_blanco !== 'undefined' && this.filter.en_blanco) {
					return true
				}
				if (typeof this.filter.no_en_blanco !== 'undefined' && this.filter.no_en_blanco) {
					return true
				}

				let type = this.field && this.field.type ? this.field.type : this.filter.type

				if (type === 'select' || type === 'search') {
					return typeof this.filter.igual_que !== 'undefined'
						&& this.filter.igual_que !== 0
						&& this.filter.igual_que !== ''
						&& this.filter.igual_que !== null
				}

				if (type === 'checkbox') {
					return typeof this.filter.checkbox !== 'undefined' && this.filter.checkbox != -1
				}

				if (type === 'date') {
					return (typeof this.filter.menor_que !== 'undefined' && this.filter.menor_que !== '') 
						|| (typeof this.filter.igual_que !== 'undefined' && this.filter.igual_que !== '') 
						|| (typeof this.filter.mayor_que !== 'undefined' && this.filter.mayor_que !== '')
				}

				if (type === 'number') {
					return (typeof this.filter.menor_que !== 'undefined' && this.filter.menor_que !== '')
						|| (typeof this.filter.igual_que !== 'undefined' && this.filter.igual_que !== '' && this.filter.igual_que !== null)
						|| (typeof this.filter.mayor_que !== 'undefined' && this.filter.mayor_que !== '')
				}

				// text/textarea
				return (typeof this.filter.que_contenga !== 'undefined' && this.filter.que_contenga !== '')
					|| (typeof this.filter.igual_que !== 'undefined' && this.filter.igual_que !== '')
			}
			return false
		}
	},
	methods: {
		call_limpiar_filtro() {
			let filter = this.limpiar_filtro(this.filter)
			console.log('filtro limpio:')
			console.log(filter)
			this.$store.commit(this.model_name+'/addFilter', filter)
		},
		/**
		 * Solicita al padre abrir el modal de filtro de esta columna.
		 */
		toggleFilter() {
			this.$emit('toggleFilter', this.field.key)
		},
	}
}
</script>
<style lang="sass">
// Botones de icono propios (Grupo 273, Prompt 07): mismo lenguaje que los
// __icon-btn del pill del buscador general -- redondos, planos, sin sombra.
// Reemplazan los b-button de Bootstrap, cuyo foco pintaba un box-shadow
// FUERA del border-box: eso es justo lo que recortaba el overflow: hidden
// de .cont-filter-buttons (ver table/Index.vue). Estos botones nunca
// pintan nada fuera de su propia caja.
.th-filter-btns
	display: flex
	align-items: center
	gap: 4px

.th-filter-btn
	display: flex
	align-items: center
	justify-content: center
	width: 24px
	height: 24px
	border-radius: 50%
	border: none
	background: transparent
	box-shadow: none
	padding: 0
	cursor: pointer
	color: #d1d5db
	transition: background 0.15s ease, color 0.15s ease

	i
		font-size: 0.85rem

	&:hover
		background: rgba(255, 255, 255, .15)
		color: #fff

	&:focus-visible
		outline: none
		background: rgba(255, 255, 255, .25)
		color: #fff

	// Lupa con filtro activo: fondo verde suave (antes, variant="success").
	&.th-filter-btn--active
		background: rgba(34, 197, 94, 0.25)
		color: #4ade80

		&:hover
			background: rgba(34, 197, 94, 0.35)

// Boton de limpiar: solo se renderiza con filtro activo, rojo suave (antes, variant="danger").
.th-filter-btn--danger
	background: rgba(248, 113, 113, .18)
	color: #fecaca

	&:hover
		background: rgba(248, 113, 113, .3)

	&:focus-visible
		background: rgba(248, 113, 113, .3)
</style>