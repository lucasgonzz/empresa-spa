<template>
<div 
class="task s-1">
	<p class="from-user">
		De <em>{{ task.from_user.name }}</em>
	</p>		
	<p class="to-users">
		Para 
		<em
		v-for="(user, index) in task.to_users">
			{{ user.name }}
			<span
			v-if="task.to_users.length > 1 && index < task.to_users.length-1">
				-
			</span>
		</em>
	</p>
	<p class="content">
		<em>
			{{ task.content }}
		</em>
	</p>
	<p
	v-if="isFinished(task)">
		<i class="icon-check"></i>
		<strong>
			Terminado
		</strong>
	</p>
	<p
	v-else>
		<strong>
			Sin Terminar
		</strong>
	</p>
	<btn-loader
	class="m-b-15"
	size="sm"
	variant="outline-success"
	v-if="isForUser(task) && !isFinished(task)"
	@clicked="finish"
	:loader="loading"
	text="Terminado"></btn-loader>
	<p
	class="since">
		{{ since(task.created_at) }}
	</p>
</div>
</template>
<script>
import tasks from '@/mixins/tasks'
export default {
	mixins: [tasks],
	props: {
		task: Object,
	},
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	data() {
		return {
			loading: false,
		}
	},
	methods: {
		finish() {
			this.loading = true 
			this.$api.put('task-finish/'+this.task.id)
			.then(res => {
				this.loading = false 
				this.$store.commit('task/add', res.data.model)
			})
			.catch(err => {
				this.loading = false 
				console.log(err)
			})
		}
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom'
.task 
	padding: 15px
	margin-bottom: 15px
	border-radius: 5px
	border-left: 5px solid $blue 
	.from-user, .to-user 
		margin-bottom: 7px
	.content
		background: rgba(0, 0, 0, .2)
		padding: 10px 
		border-radius: 5px
	.since 
		margin-bottom: 0
		text-align: right
		color: rgba(0,0,0,.7)
</style>