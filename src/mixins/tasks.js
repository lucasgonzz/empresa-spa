export default {
	methods: {
		isForUser(task) {
			let is_for_user = false 
			task.to_users.forEach(to_user => {
				if (to_user.id == this.user.id) {
					is_for_user = true 
				}
			})
			return is_for_user
		},
		isFinished(task) {
			let is_finished = false 
			task.to_users.forEach(to_user => {
				if (to_user.pivot.is_finished) {
					is_finished = true
				}
			})
			return is_finished
		},
	}
}