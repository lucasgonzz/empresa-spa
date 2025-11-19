<template>
	<div>
		<nav-component></nav-component>

		<orders></orders>	
		<sync-to-t-n-article></sync-to-t-n-article>
	</div>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/components/tienda-nube/components/Nav'),
		Orders: () => import('@/components/tienda-nube/components/Orders'),
		SyncToTNArticle: () => import('@/components/tienda-nube/components/SyncToTNArticle'),
	},
}
</script>
<style lang="sass">
@import '@/sass/_custom'

.sync-meli-success
	td
		background: $green !important

.sync-meli-primary
	td
		background: $blue !important

.sync-meli-warning
	td
		background: $yellow !important

.sync-meli-danger
	td
		background: $red !important
</style>