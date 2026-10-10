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
				:disabled="solo_sus_hojas"
				:options="options"></b-form-select>
			</b-input-group>
		</b-col>
	</b-row>
</template>
<script>
export default {
	computed: {
		solo_sus_hojas() {
			return this.can('road_map.terminadas.only_your') && !this.can('road_map.terminadas.all')
		},
		options() {
			// Con "solo sus hojas" el select tiene una única opción, la del propio usuario.
			if (this.solo_sus_hojas) {
				return [{value: this.user.id, text: this.user.name}]
			}
			// getOptions antepone "Seleccione ": el texto va sin eso (antes salía "Seleccione Seleccione Repartidor").
			return this.getOptions({key: 'employee_id', store: 'employee', text: 'Repartidor'})
		},
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
