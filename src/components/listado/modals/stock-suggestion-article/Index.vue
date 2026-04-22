<template>
	<b-modal
	size="lg"
	hide-footer
	id="stock-suggestion-article">
		<nav-component></nav-component>
	</b-modal>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/components/listado/modals/stock-suggestion-article/NavComponent'),
	}
}
</script>
