<template>
<div
v-if="show_nav">
	<nav-vertical>
		<template #nav_top>
			<slot name="nav_top">
			</slot>
		</template>
	</nav-vertical>
</div>
</template>
<script>
import nav from '@/common-vue/mixins/nav'
export default {
	mixins: [nav],
	components: {
        NavVertical: () => import('@/common-vue/components/nav-vertical/NavVertical'),
	},
}
</script>
