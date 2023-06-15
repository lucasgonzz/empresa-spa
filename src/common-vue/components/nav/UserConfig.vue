<template>
	<div>
		<model
		model_name="user"
		:model_prop="user"
		:show_btn_delete="false"></model>	

		<div
		v-if="has_extra_config">
			<model
			v-for="config_model_name in extra_config"
			:model_name="config_model_name"
			:show_btn_delete="false"></model>	
		</div>
	</div>
</template>
<script>
export default {
	components: {
		Model: () => import('@/common-vue/components/model/Index')
	}
}
</script>