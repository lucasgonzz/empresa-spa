<template>
	<div class="j-center w-100">
		<btn-loader
		:loader="loading"
		class="btn-add-to-show"
		variant="primary"
		block
		text="Ver mas"
		@clicked="add">
		</btn-loader> 
	</div>
</template>
<script>
export default {
	props: {
		model_name: String,
	},
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	computed: {
		loading() {
			return this.$store.state[this.model_name].loading_filtered
		},
	},
	methods: {
		add() {
			this.$emit('add')
		}
	}
}
</script>
<style lang="sass">
.btn-add-to-show 
	width: 100px !important
	display: flex !important
	flex-direction: row 
	justify-content: center
	margin: 15px
</style>