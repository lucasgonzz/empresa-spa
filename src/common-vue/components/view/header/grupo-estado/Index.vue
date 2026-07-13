<template>
	<!--
		Grupo de estado del header (Seleccionar / Filtrados-Selección / Limpiar filtros / Restaurar
		todos en papelera). En desktop y tablet se muestra en línea junto al grupo principal. En
		teléfono colapsa dentro de un dropdown de overflow disparado por el ícono "..." para que la
		fila superior del header no crezca a más de: ojo + Crear + "...".
		El colapso es puramente visual (CSS + un boolean local); el contenido es siempre el mismo,
		no se duplica markup entre desktop y teléfono.
	-->
	<div
	class="grupo-estado"
	:class="{ 'grupo-estado--open': overflow_open }">

		<!-- Toggle "..." — solo visible en teléfono (CSS); en desktop/tablet el contenido ya está en línea -->
		<button
		type="button"
		class="btn btn-sm btn-outline-secondary grupo-estado__toggle"
		@click="toggleOverflow"
		aria-label="Más opciones"
		:aria-expanded="overflow_open ? 'true' : 'false'">
			<i class="bi bi-three-dots" aria-hidden="true"></i>
		</button>

		<!-- Contenido del grupo: en desktop/tablet fluye en línea; en teléfono es el panel del dropdown -->
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
	 * view-header para que Index.vue quede como orquestador y para resolver acá el colapso a
	 * dropdown de overflow en teléfono (prompt 316).
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
	data() {
		return {
			// Controla si el panel de overflow está abierto (solo tiene efecto visual en teléfono, vía CSS)
			overflow_open: false,
		}
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
	mounted() {
		// Cierra el panel de overflow al hacer click fuera del componente (solo relevante en teléfono)
		let self = this
		this.on_document_click = function (event) {
			if (self.overflow_open && !self.$el.contains(event.target)) {
				self.overflow_open = false
			}
		}
		document.addEventListener('click', this.on_document_click)
	},
	beforeDestroy() {
		document.removeEventListener('click', this.on_document_click)
	},
	methods: {
		/**
		 * Abre/cierra el panel de overflow (botón "...", solo visible en teléfono).
		 */
		toggleOverflow() {
			this.overflow_open = !this.overflow_open
		},
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
				that.overflow_open = false
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
	position: relative
	display: flex
	align-items: center

	&__toggle
		display: none

	&__content
		display: flex
		align-items: center
		flex-wrap: wrap

/* Teléfono (< 768px): el grupo de estado colapsa a un dropdown de overflow con ícono "..." */
@media (max-width: 767px)
	.grupo-estado

		&__toggle
			display: inline-flex
			align-items: center
			justify-content: center

		&__content
			display: none
			position: absolute
			top: 100%
			right: 0
			z-index: 1000
			flex-direction: column
			align-items: stretch
			gap: 6px
			background-color: #fff
			border: 1px solid rgba(0, 0, 0, 0.15)
			border-radius: 0.375rem
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15)
			padding: 10px
			min-width: 220px

		&--open &__content
			display: flex

		/* Dentro del panel de overflow los botones quedan en columna, ancho completo */
		&__content
			::v-deep .btn-header-action-wrap,
			::v-deep .btn-header-action,
			::v-deep .m-l-10
				margin-left: 0 !important
				width: 100%

</style>
