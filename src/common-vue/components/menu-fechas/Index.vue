<template>
	<div class="menu-fechas">
		<buttons
		:model_name="model_name"></buttons>

		<fechas
		:model_name="model_name"></fechas>	
	</div>
</template>
<script>
export default {
	components: {
		Buttons: () => import('@/common-vue/components/menu-fechas/buttons/Index'),
		Fechas: () => import('@/common-vue/components/menu-fechas/fechas/Index'),
	},
	props: {
		model_name: String,
	},
}
</script>
<style lang="sass">
.menu-fechas
	display: flex
	@media screen and (max-width: 992px)
		flex-direction: column
		width: 100%
	@media screen and (min-width: 992px)
		flex-direction: row
		align-items: center
		justify-content: flex-start
</style>