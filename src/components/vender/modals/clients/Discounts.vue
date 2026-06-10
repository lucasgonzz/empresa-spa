<template>
	<model
	:check_permissions="false"
	size="lg"
	model_name="discount"></model>
</template>
<script>
export default {
	components: {
		Model: () => import('@/common-vue/components/ModalModel')
	},
}
</script>