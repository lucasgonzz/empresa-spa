<template>
	<!--
		Grupo de estado del header (Seleccionar / Filtrados-Selección / Limpiar filtros / Restaurar
		todos en papelera). Los controles ya son solo-ícono con tooltip, así que entran y wrappean
		solos en cualquier tamaño de pantalla; no hace falta colapsarlos en un panel de overflow.
	-->
	<div class="grupo-estado">

		<!-- Contenido del grupo: siempre en línea, en desktop, tablet y teléfono -->
		<div class="grupo-estado__content">

			<btn-seleccion
			:model_name="model_name"
			:ask_selectable="ask_selectable"></btn-seleccion>

			<opciones-filtrados-seleccion
			:papelera="papelera"
			:show_actualizar_option="show_actualizar_option"
			:check_permissions="check_permissions"
			:model_name="model_name">
				<template #options_drop_down>
					<slot name="options_drop_down"></slot>
				</template>

				<template #options_drop_down_seleccion>
					<slot name="options_drop_down_seleccion"></slot>
				</template>

				<template #options_drop_down_filtro>
					<slot name="options_drop_down_filtro"></slot>
				</template>
			</opciones-filtrados-seleccion>

			<btn-restart-filter
			:papelera="papelera"
			:model_name="model_name"></btn-restart-filter>

			<b-button
			v-if="papelera && is_filtered_papelera && total_filtrados_papelera > 0"
			@click="restaurarTodosFiltradosPapelera"
			class="m-l-10"
			size="sm"
			variant="danger">
				Restaurar todos ({{ total_filtrados_papelera }})
			</b-button>
		</div>
	</div>
</template>
<script>
export default {
	/**
	 * GrupoEstado — grupo semántico "estado" del view-header: Seleccionar, los dropdowns de
	 * filtrados/selección, Limpiar filtros y Restaurar todos (papelera). Se extrajo del
	 * view-header para que Index.vue quede como orquestador (prompt 316). El toggle de overflow
	 * "..." que existía para teléfono se eliminó (prompt 505): con los controles reducidos a solo
	 * ícono no hace falta colapsarlos, wrappean solos.
	 */
	components: {
		BtnSeleccion: () => import('@/common-vue/components/view/header/BtnSeleccion'),
		BtnRestartFilter: () => import('@/common-vue/components/view/header/BtnRestartFilter'),
		OpcionesFiltradosSeleccion: () => import('@/common-vue/components/view/header/opciones-filtrados-seleccion/Index'),
	},
	props: {
		model_name: String,
		papelera: {
			type: Boolean,
			default: false,
		},
		ask_selectable: Boolean,
		check_permissions: {
			type: Boolean,
			default: false,
		},
		show_actualizar_option: Boolean,
	},
	computed: {
		is_filtered_papelera() {
			if (!this.papelera || !this.model_name) {
				return false
			}
			return this.$store.state.papelera[this.model_name].is_filtered
		},
		/**
		 * Total de registros que coinciden con el filtro (todas las páginas), alineado con el paginador.
		 */
		total_filtrados_papelera() {
			if (!this.papelera || !this.model_name) {
				return 0
			}
			let n = this.$store.state.papelera[this.model_name].total_filter_results
			return n ? parseInt(n, 10) : 0
		},
	},
	methods: {
		/**
		 * Restaura en servidor todos los que coinciden con filters (misma consulta que search+papelera).
		 */
		restaurarTodosFiltradosPapelera() {
			let total = this.total_filtrados_papelera
			if (total < 1) {
				return
			}
			let filters = this.$store.state[this.model_name].filters
			let label = this.plural(this.model_name)
			let mensaje = '¿Restaurar ' + total + ' ' + label + ' de esta búsqueda en la papelera?'
			if (!window.confirm(mensaje)) {
				return
			}
			let that = this
			this.$store.commit('auth/setLoading', true)
			this.$api.post('papelera/restaurar-filtrados/' + this.model_name, {
				filters: filters,
			}).then(function () {
				that.$store.commit('auth/setLoading', false)
				that.$toast.success('Registros restaurados')
				return that.$store.dispatch('papelera/' + that.model_name + '/getModels')
			}).catch(function (err) {
				that.$store.commit('auth/setLoading', false)
				that.$toast.error('Error al restaurar')
				console.log(err)
			})
		},
	},
}
</script>
<style lang="sass">

.grupo-estado
	display: flex
	align-items: center

	&__content
		display: flex
		align-items: center
		flex-wrap: wrap

</style>
