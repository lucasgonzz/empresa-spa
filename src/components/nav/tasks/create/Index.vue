<template>
<b-modal
v-if="user"
title="Nueva tarea"
hide-footer
id="create-task">
	<b-form-textarea
	class="m-b-15"
	v-model="task.content"
	placeholder="Ingrese el contenido de la tarea"></b-form-textarea>
	<p
	class="m-b-0">
		Seleccione los usuarios
	</p>
	<b-form-checkbox
	v-for="user in users"
	:value="user.id"
	v-model="task.to_users">
		{{ user.name }}
	</b-form-checkbox>
	<btn-loader
	class="m-t-15"
	@clicked="save"
	:loader="loading"
	text="Guardar"></btn-loader>
</b-modal>
</template>
<script>
export default {
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	computed: {
		users() {
			let users = []
			if (!this.is_owner) {
				users.push(this.owner)
			}
			users = users.concat(this.employees)
			return users
		},
		employees() {
			return this.$store.state.employee.models 
		},
	},
	data() {
		return {
			task: {
				content: '',
				to_users: [],
			},
			loading: false,
		}
	},
	methods: {
		save() {
			this.loading = true 
			this.$api.post('task', this.task)
			.then(res => {
				this.loading = false
				this.$store.commit('task/add', res.data.model)
				this.$bvModal.hide('create-task')
				this.$toast.success('Tarea creada')
				this.clear()
			})
			.catch(err => {
				this.loading = false
				console.log(err)
			})
		},
		clear() {
			this.task = {
				content: '',
				to_users: [],
			}
		}
	}
}
</script>