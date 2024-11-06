<template>
	<div>

		<modal-component
		:model_name="model_name"></modal-component>

		<b-button
		v-b-modal="'props-to-show'"
		variant="primary">
			<i class="icon-eye"></i>
			<i class="icon-list p-l-10"></i>
		</b-button>
	</div>
</template>
<script>
export default {
	props: {
		model_name: String,
	},
	components: {
		ModalComponent: () => import('@/common-vue/components/view/header/props-to-show/Modal'),
	},
}
</script>