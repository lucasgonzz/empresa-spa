<template>
	<search-component
	v-if="!sale"
	class="m-l-15"
	disabled
	id="select_client_devoluciones"
	@setSelected="setSelected"
	:prop="{text: 'Cliente', key: 'client_id'}"
	:model="client"
	model_name="client"
	set_selected_model_with_model_prop
	:props_to_filter="['num', 'name', 'phone']"></search-component>
</template>
<script>
export default {
	components: {
		SearchComponent: () => import('@/common-vue/components/search/Index'),
	}, 
	computed: {
		sale() {
			return this.$store.state.devoluciones.sale
		},
		client() {
			return this.$store.state.devoluciones.client
		},
	},
	methods: {
		setSelected(result) {
			this.$store.commit('devoluciones/set_client', result.model)
		}
	}
}
</script>