<template>
<view-component
show_filter_modal
emit_on_saved_instead_continue
@modelSaved="modelSaved"
model_name="employee"></view-component>	
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index')
	},
	methods: {
		modelSaved(model) {
			if (!model) {
				this.$toast.error('Ya hay un empleado con ese numero de documento')
			} else {
				this.$store.commit('employee/add', model)
			}
		}
	}
}
</script>