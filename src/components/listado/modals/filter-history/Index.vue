<template>
<b-modal
hide-footer
title="Movimiento de deposito"
size="lg"
id="filter-history">
	<view-component 
	model_name="filter_history"
	change_from_dates_option
	:check_permissions="false"
	:show_btn_save="false"
	:show_btn_delete="false"
	:show_previus_days="true">
	</view-component>
</b-modal>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
	computed: {
	},
	data() {
		return {
		}
	},
	methods: {
	}
}
</script>