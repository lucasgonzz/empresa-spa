<template>
	<div>
		<b-form-group
		class="m-0"
		label="Usar una configuracion de columnas existente">
			<b-form-select
			v-model="column_position_id"
			:options="getOptions({key: 'column_position_id', store: 'column_position', text: 'Posicion de columnas'})"></b-form-select>
		</b-form-group>
	</div>
</template>
<script>
export default {
	computed: {
		column_position_id: {
			set(value) {
				this.$store.commit('column_position/set_selected_column_position_id', value)
			},
			get() {
				return this.$store.state.column_position.selected_column_position_id
			}
		},
	},
}
</script>