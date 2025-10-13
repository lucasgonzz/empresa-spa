<template>
	<div>
		<nav-component></nav-component>

		<orders></orders>
		<sync-to-meli-article></sync-to-meli-article>
		<sync-from-meli-article></sync-from-meli-article>
		<sync-from-meli-order></sync-from-meli-order>
	</div>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/components/mercado-libre/components/Nav'),
		Orders: () => import('@/components/mercado-libre/components/Orders'),
		SyncToMeliArticle: () => import('@/components/mercado-libre/components/SyncToMeliArticle'),
		SyncFromMeliArticle: () => import('@/components/mercado-libre/components/SyncFromMeliArticle'),
		SyncFromMeliOrder: () => import('@/components/mercado-libre/components/SyncFromMeliOrder'),
	}
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