<template>
	<model
	model_name="user"
	:model_prop="user"
	:show_btn_delete="false"></model>	
</template>
<script>
export default {
	components: {
		Model: () => import('@/common-vue/components/model/Index')
	}
}
</script>