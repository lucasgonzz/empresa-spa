<template>
	<div>
		<load-pages-info
		model_name="panel_control">
			{{ meses_atras }}/12
		</load-pages-info>
	</div>
</template>
<script>
export default {
	computed: {
		meses_atras() {
			return this.$store.state.panel_control.meses_atras
		},
	},
	components: {
		LoadPagesInfo: () => import('@/common-vue/components/display/LoadPagesInfo'),
	},
}
</script>