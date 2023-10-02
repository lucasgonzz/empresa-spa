<template>
	<div>
        <update-features></update-features>
		<!-- <nav-component>
			<template #right_dropdown>
				<tasks-button></tasks-button>
				<alert-infos></alert-infos>
			</template>
			<template #nav_dropdown>
                <b-dropdown-item
                @click="versionAnterior">
                	<i class="icon-undo"></i>
                    Version anterior
                </b-dropdown-item>
        		<b-dropdown-divider></b-dropdown-divider>
			</template>
		</nav-component> -->
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