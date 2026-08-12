<template>
	<div class="opciones-grupos">
		<update
		@update="update"
		:loading="loading"
		:model_name="model_name"></update>

		<confirm
		:id="model_name+'-delete-models'"
		:text="delete_text"
		emit="deleteModels"
		@deleteModels="deleteModels"></confirm>

		<!-- Grupo SELECCIÓN: botón activar/quitar selección + dropdown de seleccionados, combinados en un solo button-group -->
		<div class="btn-group opciones-grupos__group" role="group">
			<btn-seleccion
			:ask_selectable="ask_selectable"
			:model_name="model_name"></btn-seleccion>

			<options-dropdown
			:show_actualizar_option="show_actualizar_option"
			:check_permissions="check_permissions"
			@setUpdate="setUpdate"
			@setDelete="setDelete"
			:model_name="model_name">
				<template #options_drop_down>
					<slot name="options_drop_down"></slot>
				</template>

				<template #options_drop_down_seleccion>
					<slot name="options_drop_down_seleccion"></slot>
				</template>
			</options-dropdown>
		</div>

		<!-- Grupo FILTROS: dropdown de filtrados + botón limpiar filtros, combinados en un solo button-group -->
		<div
		v-if="!papelera"
		class="btn-group opciones-grupos__group opciones-grupos__group--filtros"
		role="group">
			<options-dropdown
			:papelera="papelera"
			:show_actualizar_option="show_actualizar_option"
			:check_permissions="check_permissions"
			@setUpdate="setUpdate"
			@setDelete="setDelete"
			from_filter
			:model_name="model_name">
				<template #options_drop_down>
					<slot name="options_drop_down"></slot>
				</template>

				<template #options_drop_down_filtro>
					<slot name="options_drop_down_filtro"></slot>
				</template>
			</options-dropdown>

			<btn-restart-filter
			:papelera="papelera"
			:model_name="model_name"></btn-restart-filter>
		</div>
	</div>
</template>
<script>
export default {
	props: {
		model_name: String,
		check_permissions: Boolean,
		show_actualizar_option: Boolean,
		papelera: {
			type: Boolean,
			default: false,
		},
		/** Habilita el modo selección múltiple (viene desde grupo-estado); lo consume btn-seleccion. */
		ask_selectable: Boolean,
	},
	components: {
		Update: () => import('@/common-vue/components/view/header/opciones-filtrados-seleccion/Update'),
		Confirm: () => import('@/common-vue/components/Confirm'),
		OptionsDropdown: () => import('@/common-vue/components/view/header/opciones-filtrados-seleccion/OptionsDropdown'),
		BtnSeleccion: () => import('@/common-vue/components/view/header/BtnSeleccion'),
		BtnRestartFilter: () => import('@/common-vue/components/view/header/BtnRestartFilter'),
	},
	computed: {
		delete_text() {
			if (this.from_filter) {
				return this.$store.state[this.model_name].total_filter_results+' '+this.plural(this.model_name)
			}
			return this.$store.state[this.model_name].selected.length+' '+this.plural(this.model_name)
		},
		selecteds_id() {
			return this.$store.state[this.model_name].selected.map(model => {
				return model.id
			})
		},
	},
	data() {
		return {
			is_from: '',
			from_filter: false,
			loading: false,
		}
	},
	methods: {
		/**
		 * Re-ejecuta el filtrado actual para reflejar el estado real del servidor.
		 * Se usa luego de eliminar (selección o por filtro) manteniendo el modo filtrado activo.
		 * Si lo que estaba en pantalla era el listado por defecto (prompt 04 del grupo 221, flag
		 * `listado_por_defecto` del store) el refresco tiene que ir por runListadoPorDefecto y no
		 * por runFilter: ese listado nunca vino de un formulario de filtros, vino del buscador
		 * general en modo silencioso, y runFilter no sabe reconstruir ese criterio.
		 */
		refresh_filter_results() {
			// Si la vista no está filtrada y la acción no fue "from_filter", no hay nada que refrescar.
			let is_filtered = this.$store.state[this.model_name].is_filtered
			if (!this.from_filter && !is_filtered) {
				return Promise.resolve()
			}

			// Listado por defecto activo: refresca por el mismo camino que lo armó, no por runFilter.
			if (this.$store.state[this.model_name].listado_por_defecto) {
				return this.$store.dispatch(this.model_name + '/runListadoPorDefecto', {
					page: 1,
				})
			}

			// Al eliminar puede cambiar la paginación; pedimos página 1 para evitar quedar parados en una página inválida.
			return this.$store.dispatch(this.model_name + '/runFilter', {
				page: 1,
			})
		},
		setUpdate(from_filter) {
			this.from_filter = from_filter
			this.$bvModal.show(this.model_name+'-update-models')
		},
		setDelete(from_filter) {
			this.from_filter = from_filter
			this.$bvModal.show(this.model_name+'-delete-models')
		},
		update(form) {
			this.loading = true
			this.$store.commit('auth/setMessage', 'Encolando actualización masiva')
			this.$store.commit('auth/setLoading', true)

			this.$api.put('update/'+this.model_name, {
				from_filter: this.from_filter,
				filter_form: this.$store.state[this.model_name].filters,
				update_form: form,
				models_id: this.selecteds_id,
			})
			.then(res => {
				this.loading = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')

				let queued_count = res.data.queued_count || 0
				this.$toast.success(
					'La actualización masiva se está procesando (' + queued_count + ' registros). Te avisaremos cuando termine.',
					{ duration: 5000 }
				)
				this.$bvModal.hide(this.model_name+'-update-models')
			})
			.catch(err => {
				this.loading = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')

				let message = 'No se pudo iniciar la actualización masiva'
				if (err.response && err.response.data && err.response.data.message) {
					message = err.response.data.message
				}
				this.$toast.error(message, { duration: 4000 })
				console.log(err)
			})
		},
		deleteModels() {
			this.$store.commit('auth/setMessage', 'Eliminando '+this.plural(this.model_name))
			this.$store.commit('auth/setLoading', true)
			this.$api.put('delete/'+this.model_name, {
				from_filter: this.from_filter,
				filter_form: this.$store.state[this.model_name].filters,
				models_id: this.selecteds_id
			})
			.then(res => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')

				// Eliminación encolada: el listado se actualiza al recibir la notificación global.
				if (res.data.queued) {
					let queued_count = res.data.queued_count || 0
					this.$toast.success(
						'La eliminación se está procesando (' + queued_count + ' registros). Te avisaremos cuando termine.',
						{ duration: 5000 }
					)
					this.$store.commit(this.model_name+'/setSelected', [])
					this.$bvModal.hide(this.model_name+'-delete-models')
					return
				}

				res.data.models.forEach(model => {
					this.$store.commit(this.model_name+'/setDelete', model)
					this.$store.commit(this.model_name+'/delete')
				})
				this.$toast.success(this.plural(this.model_name)+' eliminados')
				this.$store.commit(this.model_name+'/setSelected', [])
				// Cierra el modal de confirmación del delete (id = model_name + '-delete-models').
				this.$bvModal.hide(this.model_name+'-delete-models')

				// Refresca resultados filtrados si corresponde (selección en vista filtrada o eliminación por filtro).
				return this.refresh_filter_results()
			})
			.catch(err => {
				this.$toast.error('Error al eliminar '+this.plural(this.model_name))
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				console.log(err)
			})
		},
	}
}
</script>

<style lang="sass">

.opciones-grupos
	display: inline-flex
	align-items: center

	/* Grupo combinado (selección o filtros); sin margen propio, cada botón/dropdown va pegado */
	&__group
		margin: 0

		/* Separación entre el grupo de selección y el de filtros: solo margen, sin línea divisoria */
		&--filtros
			margin-left: 10px

// El menú de estos dos dropdowns y el diseño de sus ítems viven en
// src/sass/_menus_desplegables.sass desde la misión 28: son los mismos tres menús y tenían tres
// juegos de valores distintos. Acá queda solo el layout de los grupos de botones de la barra.
//
// (Comentarios con // y no con /* */ de varias líneas: en Sass indentado el */ suelto en su
// propio renglón se parsea como selector y el build se cae.)

</style>
