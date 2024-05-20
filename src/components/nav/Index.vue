<template>
	<div>
        <update-features></update-features>
		
		<nav-vertical></nav-vertical>
		
		<tasks></tasks>	

	</div>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/common-vue/components/nav/Index'),
		NavVertical: () => import('@/common-vue/components/nav-vertical/Index'),
		TasksButton: () => import('@/components/nav/tasks/TasksButton'),
		Tasks: () => import('@/components/nav/tasks/modal/Index'),
		AlertInfos: () => import('@/components/nav/alert-infos/Index'),
		UpdateFeatures: () => import('@/components/common/UpdateFeatures'),
	},
	methods: {
		versionAnterior() {
			window.open('https://empresa.comerciocity.com')
		}
	}
}
</script>