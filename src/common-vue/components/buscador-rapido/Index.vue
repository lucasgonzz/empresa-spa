<template>
	<!-- Buscador rápido genérico: input + botón buscar + botón limpiar -->
	<b-input-group class="buscador-rapido">
		<!-- Input de texto: busca al presionar Enter -->
		<b-form-input
		autocomplete="off"
		v-model="query"
		:placeholder="placeholder"
		@keyup.enter="buscar"></b-form-input>

		<b-input-group-append>
			<!-- Botón principal: dispara la búsqueda en el endpoint search-from-modal -->
			<b-button
			variant="primary"
			@click="buscar">
				<i class="icon-search"></i>
				Buscar
			</b-button>

			<!-- Botón limpiar: visible solo cuando el buscador rápido tiene resultados activos -->
			<b-button
			v-if="is_filtered_by_buscador"
			variant="outline-secondary"
			@click="limpiar">
				<i class="icon-undo"></i>
			</b-button>
		</b-input-group-append>
	</b-input-group>
</template>
<script>
export default {
	/**
	 * BuscadorRapido — componente genérico de búsqueda rápida por texto.
	 *
	 * Llama al endpoint POST search-from-modal/{model_name} y carga los resultados
	 * en el estado filtered del store correspondiente, marcando filtered_without_filter_form
	 * para distinguirlo de un filtrado por formulario.
	 *
	 * Uso mínimo:
	 *   <buscador-rapido model_name="client" :props_to_filter="['name', 'email']" />
	 */
	props: {
		/**
		 * Nombre del modelo en el store y en la ruta del endpoint.
		 * Ejemplo: 'client', 'provider'.
		 */
		model_name: {
			type: String,
			required: true,
		},

		/**
		 * Lista de campos del modelo donde se buscará el texto ingresado.
		 * Deben ser campos string/text/textarea presentes en la tabla.
		 */
		props_to_filter: {
			type: Array,
			required: true,
		},

		/**
		 * Texto de placeholder del input de búsqueda.
		 */
		placeholder: {
			type: String,
			default: 'Buscar...',
		},

		/**
		 * Cantidad máxima de resultados a traer del backend.
		 */
		per_page: {
			type: Number,
			default: 100,
		},
	},

	data() {
		return {
			// Texto ingresado por el usuario en el buscador.
			query: '',
		}
	},

	computed: {
		/**
		 * Indica si el estado filtered actual fue cargado por este buscador rápido
		 * (y no por el formulario de filtros estándar).
		 * Controla la visibilidad del botón limpiar.
		 *
		 * @returns {Boolean}
		 */
		is_filtered_by_buscador() {
			return this.$store.state[this.model_name].filtered_without_filter_form
		},
	},

	methods: {
		/**
		 * Ejecuta la búsqueda rápida llamando al endpoint search-from-modal/{model_name}.
		 * Los resultados se cargan en el estado filtered del store del modelo.
		 * Requiere al menos 2 caracteres para disparar la búsqueda.
		 */
		buscar() {
			// Validación mínima: al menos 2 caracteres para evitar búsquedas demasiado amplias.
			if (this.query.length < 2) {
				this.$toast.error('Ingrese al menos 2 caracteres')
				return
			}

			// Indicador global de carga mientras el backend procesa la búsqueda.
			this.$store.commit('auth/setMessage', 'Buscando...')
			this.$store.commit('auth/setLoading', true)

			this.$api.post('search-from-modal/' + this.model_name, {
				query_value: this.query,
				props_to_filter: this.props_to_filter,
				per_page: this.per_page,
			})
			.then(res => {
				// Extraer las filas: el endpoint puede devolver paginado o array directo.
				let rows = []
				if (res.data.models && res.data.models.data) {
					// Respuesta paginada con estructura Laravel paginator.
					rows = res.data.models.data
				} else if (Array.isArray(res.data.models)) {
					// Respuesta como array directo.
					rows = res.data.models
				}

				// Obtener datos de paginación si el backend los incluye.
				let last_page = (res.data.models && res.data.models.last_page) ? res.data.models.last_page : 1
				let total = (res.data.models && res.data.models.total) ? res.data.models.total : rows.length

				// Cargar resultados en el store del modelo, igual que lo haría el filter form.
				this.$store.commit(this.model_name + '/setSelected', [])
				this.$store.commit(this.model_name + '/setFilterPage', 1)
				this.$store.commit(this.model_name + '/setFiltered', rows)
				this.$store.commit(this.model_name + '/setIsFiltered', true)
				this.$store.commit(this.model_name + '/setTotalFilterPages', last_page)
				this.$store.commit(this.model_name + '/setTotalFilterResults', total)
				// Marcar que el filtered fue cargado por el buscador rápido (no por el form de filtros).
				this.$store.commit(this.model_name + '/set_filtered_without_filter_form', true)

				// Avisar al usuario si la búsqueda no arrojó resultados.
				if (!rows.length) {
					this.$toast.info('No se encontraron resultados')
				}

				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
			})
			.catch(err => {
				console.log(err)
				this.$toast.error('Error al buscar')
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
			})
		},

		/**
		 * Limpia los resultados del buscador rápido y resetea el estado filtered del store
		 * a su estado vacío, como si nunca se hubiera filtrado.
		 */
		limpiar() {
			this.$store.commit(this.model_name + '/setFiltered', [])
			this.$store.commit(this.model_name + '/setIsFiltered', false)
			this.$store.commit(this.model_name + '/setSelected', [])
			this.$store.commit(this.model_name + '/setFilterPage', 1)
			this.$store.commit(this.model_name + '/setTotalFilterPages', null)
			this.$store.commit(this.model_name + '/setTotalFilterResults', 0)
			this.$store.commit(this.model_name + '/set_filtered_without_filter_form', false)

			// Limpiar el texto del input para dejar el buscador en estado inicial.
			this.query = ''
		},
	},
}
</script>
<style scoped>
/* El buscador ocupa todo el ancho disponible del contenedor padre */
.buscador-rapido {
	width: 100%;
}
</style>
