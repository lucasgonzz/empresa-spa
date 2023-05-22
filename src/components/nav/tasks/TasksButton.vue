<template>
	<b-button
	class="m-r-10 task-button"
	v-b-modal="'tasks'"
	variant="primary">
		<i class="icon-message"></i>
		<b-badge
		v-if="tasks_not_finished > 0"
		class="m-l-10"
		variant="danger">
			{{ tasks_not_finished }}
		</b-badge>
	</b-button>
</template>
<script>
import tasks from '@/mixins/tasks'
export default {
	mixins: [tasks],
	computed: {
		tasks_not_finished() {
			let total = 0
			this.tasks.forEach(task => {
				console.log(this.isForUser(task))
				if (this.isForUser(task) && !this.isFinished(task)) {
					total++
				}
			})
			return total
		},
		tasks() {
			return this.$store.state.task.models 
		},
	},
}
</script>
<style lang="sass">
.task-button
	.badge 
		padding: 10px 
		font-size: 15px
</style>