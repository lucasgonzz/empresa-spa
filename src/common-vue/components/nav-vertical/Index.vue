<template>
<div
v-if="show_nav">
	<nav-vertical>
		<template #nav_top>
			<slot name="nav_top">
			</slot>
		</template>
	</nav-vertical>

    <global-notification></global-notification>

    <update-models></update-models>

</div>
</template>
<script>
import nav from '@/common-vue/mixins/nav'
export default {
	mixins: [nav],
	components: {
        NavVertical: () => import('@/common-vue/components/nav-vertical/NavVertical'),
        GlobalNotification: () => import('@/common-vue/components/global-notification/Modal'),
        UpdateModels: () => import('@/common-vue/components/UpdateModels'),
	},
}
</script>
