<template>
<div>
	<create-task></create-task>	
	<b-modal
	title="Tareas"
	hide-footer
	id="tasks">
		<div
		v-if="tasks.length">
			<task-component
			v-for="task in tasks"
			:task="task"></task-component>
		</div>
		<p 
		v-else
		class="text-with-icon">
			<i class="icon-check"></i>
			No hay tareas
		</p>
		<create-button></create-button>
	</b-modal>
</div>
</template>
<script>
export default {
	components: {
		CreateTask: () => import('@/components/nav/tasks/create/Index'),
		TaskComponent: () => import('@/components/nav/tasks/modal/TaskComponent'),
		CreateButton: () => import('@/components/nav/tasks/modal/CreateButton'),
	},
	computed: {
		tasks() {
			return this.$store.state.task.models 
		},
	},
}
</script>