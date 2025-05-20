<template>
	<b-row>
		<b-col
		cols="12"
		md="5">
			<b-input-group
			class="m-t-15"
			prepend="Que pertenezcan al repartidor">
				<b-form-select
				v-model="employee_id"
				:options="getOptions({key: 'employee_id', store: 'employee', text: 'Seleccione Repartidor'})"></b-form-select>
			</b-input-group>
		</b-col>
	</b-row>
</template>
<script>
export default {
	computed: {
		employee_id: {
			get() {
				return this.$store.state.road_map.route_prefix
			},
			set(value) {
				this.$store.commit('road_map/set_route_prefix', value)
				this.$store.dispatch('road_map/getModels')
			}
		}
	}
}
</script>
