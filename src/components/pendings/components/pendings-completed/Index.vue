<template> 
<view-component
v-if="view == 'realizados'"
model_name="pending_completed">
	<template #header>
		<fechas 
		model_name="pending_completed" />
	</template>
</view-component>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		Fechas: () => import('@/components/pendings/components/nav/Fechas'),
	},
}
</script>