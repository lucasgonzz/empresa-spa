<template>
	<model
	:check_permissions="false"
	model_name="discount"></model>
</template>
<script>
export default {
	components: {
		Model: () => import('@/common-vue/components/ModalModel')
	},
}
</script>