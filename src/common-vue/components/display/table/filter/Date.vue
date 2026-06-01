<template>

	<div 

	v-if="field.type == 'date'"

	class="numbers date-filter-with-time">

		<b-form-group

		v-for="criterion in date_filter_criteria"

		:key="criterion.key"

		:label="criterion.label">

			<div

			class="date-filter-criterion"

			:data-date-filter-criterion="criterion.key">

				<b-form-input

				class="date-filter-date"

				@input="on_date_part_input(criterion.key, 'date', $event)"

				@keyup.enter="filtrar"

				:value="local_dates[criterion.key]"

				type="date"

				:placeholder="criterion.label"></b-form-input>

				<b-form-input

				v-if="show_time_inputs"

				class="date-filter-time"

				@input="on_date_part_input(criterion.key, 'time', $event)"

				@keyup.enter="filtrar"

				:value="local_times[criterion.key]"

				type="time"

				placeholder="Hora (opcional)"></b-form-input>

			</div>

		</b-form-group>

	</div>

</template>

<script>

export default {

	props: {

		field: Object,

		model_name: String,

	},

	data() {

		return {

			// Partes fecha/hora en UI; el store guarda el valor combinado (YYYY-MM-DD o YYYY-MM-DDTHH:mm).

			local_dates: {

				menor_que: '',

				igual_que: '',

				mayor_que: '',

			},

			local_times: {

				menor_que: '',

				igual_que: '',

				mayor_que: '',

			},

		}

	},

	computed: {

		/**

		 * Filtro de la columna en el store del modelo.

		 */

		filter() {

			return this.$store.state[this.model_name].filters.find(filter => filter.key == this.field.key)

		},

		/**

		 * Criterios menor / igual / mayor del filtro date.

		 */

		date_filter_criteria() {

			return [

				{ key: 'menor_que', label: 'Menor que' },

				{ key: 'igual_que', label: 'Igual que' },

				{ key: 'mayor_que', label: 'Mayor que' },

			]

		},

		/**

		 * Muestra input time salvo columnas marcadas solo-fecha en el modelo.

		 */

		show_time_inputs() {

			return !(this.field && this.field.filter_date_only)

		},

	},

	watch: {

		/**

		 * Al cambiar el filtro en store (limpiar, cargar), sincroniza partes locales.

		 */

		filter: {

			deep: true,

			handler(filter) {

				this.sync_local_parts_from_filter(filter)

			},

			immediate: true,

		},

	},

	methods: {

		/**

		 * Separa valor guardado en store en fecha y hora para los inputs.

		 *

		 * @param {string} stored_value Valor en menor_que / igual_que / mayor_que.

		 * @returns {{ date: string, time: string }}

		 */

		split_stored_date_filter(stored_value) {

			let value = typeof stored_value === 'string' ? stored_value.trim() : ''

			if (value === '') {

				return { date: '', time: '' }

			}

			let separator_index = value.indexOf('T')

			if (separator_index === -1) {

				separator_index = value.indexOf(' ')

			}

			if (separator_index === -1) {

				return { date: value, time: '' }

			}

			let date_part = value.substring(0, separator_index)

			let time_part = value.substring(separator_index + 1)

			if (time_part.length >= 5) {

				time_part = time_part.substring(0, 5)

			}

			return { date: date_part, time: time_part }

		},

		/**

		 * Combina fecha y hora opcional para persistir en store y enviar al API.

		 *

		 * @param {string} date_val YYYY-MM-DD

		 * @param {string} time_val HH:mm (opcional)

		 * @returns {string}

		 */

		combine_date_and_time(date_val, time_val) {

			let date = typeof date_val === 'string' ? date_val.trim() : ''

			if (date === '') {

				return ''

			}

			if (this.field && this.field.filter_date_only) {

				return date

			}

			let time = typeof time_val === 'string' ? time_val.trim() : ''

			if (time === '') {

				return date

			}

			if (time.length > 5) {

				time = time.substring(0, 5)

			}

			return date + 'T' + time

		},

		/**

		 * Actualiza local_dates/local_times desde el objeto filtro del store.

		 *

		 * @param {Object|undefined} filter

		 */

		sync_local_parts_from_filter(filter) {

			let keys = ['menor_que', 'igual_que', 'mayor_que']

			if (!filter) {

				keys.forEach(key => {

					this.local_dates[key] = ''

					this.local_times[key] = ''

				})

				return

			}

			keys.forEach(key => {

				let parts = this.split_stored_date_filter(filter[key])

				this.local_dates[key] = parts.date

				this.local_times[key] = parts.time

			})

		},

		/**

		 * Cambio en input date o time de un criterio; persiste valor combinado en store.

		 *

		 * @param {string} field_name menor_que | igual_que | mayor_que

		 * @param {string} part 'date' | 'time'

		 * @param {string} value

		 */

		on_date_part_input(field_name, part, value) {

			let normalized = typeof value === 'string' ? value : ''

			if (part === 'date') {

				this.local_dates[field_name] = normalized

			} else {

				this.local_times[field_name] = normalized

			}

			this.commit_date_filter_field(field_name)

		},

		/**

		 * Escribe en Vuex el criterio combinado (fecha + hora opcional).

		 *

		 * @param {string} field_name

		 */

		commit_date_filter_field(field_name) {

			if (!this.filter) {

				return

			}

			let combined = this.combine_date_and_time(

				this.local_dates[field_name],

				this.local_times[field_name]

			)

			this.$store.commit(this.model_name + '/addFilter', {

				...this.filter,

				[field_name]: combined,

			})

		},

		/**

		 * Confirma los tres criterios en store antes de filtrar.

		 */

		sync_date_filter_from_dom() {

			if (!this.filter) {

				return

			}

			let patch = { ...this.filter }

			let keys = ['menor_que', 'igual_que', 'mayor_que']

			keys.forEach(key => {

				patch[key] = this.combine_date_and_time(this.local_dates[key], this.local_times[key])

			})

			this.$store.commit(this.model_name + '/addFilter', patch)

		},

		/**

		 * Dispara filtrado en el componente padre (Enter); sincroniza valores antes.

		 */

		filtrar() {

			this.sync_date_filter_from_dom()

			this.$emit('filtrar')

		},

	},

}

</script>

<style scoped>

.date-filter-criterion {

	display: flex;

	flex-wrap: wrap;

	gap: 8px;

	align-items: center;

}

.date-filter-criterion .date-filter-date {

	flex: 1 1 140px;

	min-width: 140px;

}

.date-filter-criterion .date-filter-time {

	flex: 0 1 110px;

	min-width: 100px;

}

</style>

