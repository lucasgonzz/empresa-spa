import moment from 'moment'
export default {
	methods: {
		listenChannels() {
            this.Echo.channel('added_model.'+this.owner_id)
            .notification((notification) => {
                let model_name = notification.model_name
                console.log('added_model: '+this.routeString(model_name))

                if (!notification.check_added_by || notification.added_by != this.user.id) {

                    /* 
                        * Si se buscan los modelos por fecha, no lo agrego
                        * Para evitar que por ejemplo se agregue una venta del dia actual cuando estan viendo 
                        las ventas de otra fecha
                    
                    */
                    if (this.store_use_from_dates(model_name)) {
                        console.log('el modelo '+model_name+' usa from_dates')
                        console.log('comparando '+this.get_from_date(model_name)+' con '+moment().format('YYYY-MM-DD'))
                    }
                    if (!this.store_use_from_dates(model_name)
                        || this.get_from_date(model_name) == moment().format('YYYY-MM-DD')) {

                        console.log('se va a agregar')
                        this.$api.get(this.routeString(model_name)+'/'+notification.model_id)
                        .then(res => {
                            this.$store.commit(model_name.toLowerCase()+'/add', res.data.model)
                        })
                        .catch(err => {
                            console.log(err)
                        })

                    }

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
            this.Echo.channel('global_notification.'+this.owner_id)
            .notification((notification) => {
                console.log(notification)
                if (!notification.is_only_for_auth_user || notification.is_only_for_auth_user != this.user.id) {
                    
                    this.$store.commit('global_notification/set_functions_to_execute', notification.functions_to_execute)
                    this.$store.commit('global_notification/set_message_text', notification.message_text)
                    this.$store.commit('global_notification/set_color_variant', notification.color_variant)

                    this.$bvModal.show('global-notification')

                }
            })
		},
	}
}