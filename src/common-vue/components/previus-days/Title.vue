<template>
<h5>
	<div
	v-if="mostrar_con_filtro">
		<strong>
			{{ plural(model_name) }} con filtro
		</strong>
	</div>
	<div
	v-else>
		<strong
		v-if="date(from_date) == date(today)">
			{{ plural(model_name) }} de hoy
		</strong>
		<strong
		v-else-if="until_date == ''">
			{{ plural(model_name) }} del {{ date(from_date) }}
		</strong>
		<strong
		v-else>
			Del {{ date(from_date) }} a {{ date(until_date) }}
		</strong>
	</div>
</h5>
</template>
<script>
export default {
    props: {
    	model_name: String,
    },
	computed: {
		is_filtered() {
			return this.$store.state[this.model_name].is_filtered
		},
		// True cuando hay un listado por defecto activo (paginacion sembrada sin busqueda real
		// del usuario, ver runListadoPorDefecto en __base_store.js).
		listado_por_defecto() {
			return !!this.$store.state[this.model_name].listado_por_defecto
		},
		/**
		 * Indica si corresponde mostrar el titulo "con filtro". Regla del grupo 221: is_filtered
		 * debe ser true Y listado_por_defecto debe ser false. El listado por defecto reusa
		 * is_filtered para tener paginacion/contador, pero no es un filtro puesto por el usuario.
		 *
		 * @returns {Boolean}
		 */
		mostrar_con_filtro() {
			return typeof this.is_filtered != 'undefined' && this.is_filtered && !this.listado_por_defecto
		},
		from_date() {
			return this.$store.state[this.model_name].from_date
		},
		until_date() {
			return this.$store.state[this.model_name].until_date
		},
	},
}
</script>
<style scoped lang="sass">
h5
	margin-bottom: 0
	@media screen and (max-width: 768px)
		text-align: center
	@media screen and (min-width: 768px)
		text-align: left
</style>