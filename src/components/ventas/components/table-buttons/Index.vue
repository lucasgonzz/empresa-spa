<template>
	<div>
		<text-info
		:model="model"></text-info>

		<afip-buttons
		:model="model"></afip-buttons>
	</div>
</template>
<script>
export default {
	props: {
		model: Object,
	},
	components: {
		TextInfo: () => import('@/components/ventas/components/table-buttons/TextInfo'),
		AfipButtons: () => import('@/components/ventas/components/table-buttons/AfipButtons'),
	}
}
</script>