<template>
	<div
	class="j-start align-end m-l-15"
	v-if="!positions_seted">
		<b-form-input
		@keyup.enter="guardar_column_position"
		v-model="name"
		placeholder="Nombre de configuracion"></b-form-input>
		<b-button
		class="m-l-15"
		@click="guardar_column_position">
			Guardar
		</b-button>
	</div>
</template>
<script>
export default {
	computed: {
		se_puede_guardar() {
			return !this.positions_seted
		},
		selected_column_position_id() {
			return this.$store.state.column_position.selected_column_position_id
		},
	},
	data() {
		return {
			name: '',
		}
	},
	props: {
		columns: Array,
		positions_seted: Boolean,
		start_row: Number,
	},
	methods: {
		guardar_column_position() {

			let positions = [];
			this.columns.forEach(item => {
				positions.push({
					text: item.text,
					letra: item.letra,
					position: item.position,
				})
			  	// positions[item.text.toLowerCase()] = item.letra;
			});

			console.log('Se van a guardar estas columnas:')
			console.log(positions)

			this.$api.post('column-position', {
				  name: this.name,
				  // name: this.column_position_name,
				  model_name: 'article',
				  positions: positions,
				  start_row: this.start_row
			})
			.then(res => {
				this.$store.commit('column_position/add', res.data.model)
				this.name = ''
			})
			.catch(err => {
				this.$toast.error('Error al guardar')
			})
		}
	}
}
</script>