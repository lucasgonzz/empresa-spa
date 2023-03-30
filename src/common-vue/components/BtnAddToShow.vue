<template>
	<b-button
	v-if="show"
	class="m-t-15 m-b-15"
	variant="primary"
	@click="add">
		<i class="icon-plus"></i>
		Ver mas
	</b-button>
</template>
<script>
export default {
	props: {
		models: Array,
		models_to_show: Array,
	},
	computed: {
		show() {
			return this.models_to_show.length < this.models.length
		},
	},
	methods: {
		add() {
			this.$emit('add')
		}
	}
}
</script>