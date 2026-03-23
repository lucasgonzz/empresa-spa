<template>
	<b-input-group
	class="w-300 m-b-10"
	v-if="$store.state.sale_status.models.length"
	prepend="Estado">
		<b-form-select
		:options="get_options_simple('sale_status')"
		v-model="sale_status_id"></b-form-select>
	</b-input-group>
</template>
<script>
export default {
	computed: {
		budget() {
			return this.$store.state.vender.budget 
		},
		sale_status_id: {
			set(value) {
				this.$store.commit('vender/set_sale_status_id', value)
			}, 
			get() { 
				return this.$store.state.vender.sale_status_id 
			}
		},
	},
}
</script>