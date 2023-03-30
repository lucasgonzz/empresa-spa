export default {
	methods: {
		listenChannels() {
            this.Echo.channel('added_model.'+this.owner_id)
            .notification((notification) => {
                console.log('added_model: '+this.routeString(notification.model_name))
                if (!notification.check_added_by || notification.added_by != this.user.id) {
                    this.$api.get(this.routeString(notification.model_name)+'/'+notification.model_id)
                    .then(res => {
                        this.$store.commit(notification.model_name.toLowerCase()+'/add', res.data.model)
                    })
                    .catch(err => {
                        console.log(err)
                    })
                } else {
                    console.log('Ya estaba')
                }
            })
            this.Echo.channel('deleted_model.'+this.owner_id)
            .notification((notification) => {
                console.log('deleted_model')
                if (!notification.check_added_by || notification.added_by != this.user.id) {
                    this.$store.commit(notification.model_name.toLowerCase()+'/setDelete', {
                        id: notification.model_id
                    })
                    this.$store.commit(notification.model_name.toLowerCase()+'/delete')
                }
            })
            this.Echo.channel('update_models.'+this.owner_id)
            .notification((notification) => {
                console.log('update_models')
                console.log(notification)
                if (!notification.check_added_by || notification.added_by != this.user.id) {
                    this.$store.commit('general/setModelNameToUpdate', notification.model_name)
                    setTimeout(() => {
                        this.$bvModal.show('update-models')
                    }, 500)
                }
            })
            console.log('esuchando update_models.'+this.owner_id)
		},
	}
}