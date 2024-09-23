<template>
	<div>
		<p class="title">
			{{ title }}
		</p>

		<chart
		:model_name="model_name"></chart>	
	</div>
</template> 
<script>
export default {
	props: {
		title: String,
		model_name: String,
	},
	components: {
		Chart: () => import('@/components/caja/components/charts/chart/Chart'),
	},
}
</script>