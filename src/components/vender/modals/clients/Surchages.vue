<template>
	<model
	:check_permissions="false"
	size="lg"
	model_name="surchage"></model>
</template>
<script>
export default {
	components: {
		Model: () => import('@/common-vue/components/ModalModel')
	},
}
</script>