import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

import buyers_store from '@/store/buyer'
import generals from '@/common-vue/mixins/generals'
export default {
	namespaced: true,
	state: {
		model_name: 'message',

		models: [],
		model: {},
		to_show: [],
		selected: [],

		selected_buyer: null,
		chats_to_show: [],
		show_articles: false,
		selected_article: null,

		delete: null,
		delete_image: null,

		prop_model_to_delete: null,

		display: 'table',

		loading: false,
	},
	mutations: {
		setLoading(state, value) {
			state.loading = value
		},
		setModel(state, value) {
			if (value.model) {
				state.model = value.model
				if (value.properties.length) {
					value.properties.forEach(prop => {
						state.model[prop.key] = prop.value 
					})
				}
			} else {
				let obj = {
					id: null
				}
				require(`@/models/${state.model_name}`).default.properties.forEach(prop => {
					obj[prop.key] = prop.value 
				})
				if (value.properties.length) {
					value.properties.forEach(prop => {
						obj[prop.key] = prop.value 
					})
				}
				state.model = obj
			}
		},
		setModels(state, value) {
			if (value) {
				state.models = value
			} else {
				state.models = []
			}
		},
		setSelectedBuyer(state, buyer) {
			state.selected_buyer = buyer
		},
		setShowArticles(state, value) {
			state.show_articles = value
		},
		setSelectedArticle(state, value) {
			state.selected_article = value
		},
		setChatsToShow(state, value = null) {
			let buyers = []
			buyers_store.state.models.forEach(buyer => {
				if (buyer.messages.length) {
					buyers.push(buyer)
				}
			})
			let buyers_sort = buyers.sort((a, b) => (new Date(b.messages[b.messages.length - 1].created_at) - new Date(a.messages[a.messages.length - 1].created_at)))
			state.chats_to_show = buyers_sort
		},
		setToShow(state, value) {
			if (value) {
				state.to_show = value
			} else {
				state.to_show = state.models.slice(0, 20)
			}
		},
		addToShow(state, value) {
			state.to_show = state.to_show.concat(state.models.slice(state.to_show.length, state.to_show.length + 20))
		},
		setSelected(state, value) {
			state.selected = []
		},
		add(state, value) {
			let index = state.models.findIndex(item => {
				return item.id == value.id
			})
			if (index == -1) {
				state.models.unshift(value)
			} else {
				state.models.splice(index, 1, value)
			}
		},
		setDelete(state, value) {
			state.delete = value
		},
		delete(state) {
			let index = state.models.findIndex(model => {
				return model.id == state.delete.id
			})
			state.models.splice(index, 1)
		},
		setDeleteImage(state, value) {
			state.delete_image = value
		},
		setPropModelToDelete(state, value) {
			state.prop_model_to_delete = value
		},
		deletePropModel(state) {
			let index = state.model[state.prop_model_to_delete.key].findIndex(model => {
				return model.id == state.prop_model_to_delete.id
			})
			state.model[state.prop_model_to_delete.key].splice(index, 1)
		},
		deleteImage(state, value) {
			let index = state.models.images.findIndex(model => {
				return model.id == state.delete.id
			})
			state.models.splice(index, 1)
		},
		setDisplay(state, value) {
			state.display = value 
		},
	},
	actions: {
		getModels({ commit, state }, buyer_id = null) {
			if (!buyer_id) {
				buyer_id = state.selected_buyer.id
			}
			commit('setLoading', true)
			return axios.get(`/api/${generals.methods.routeString(state.model_name)}/${buyer_id}`)
			.then(res => {
				commit('setLoading', false)
				let index = buyers_store.state.models.findIndex(buyer => {
					return buyer.id == buyer_id
				})
				buyers_store.state.models[index].messages = res.data.models 
			})
			.catch(err => {
				commit('setLoading', false)
				console.log(err)
			})
		},
		setMessagesRead({ state }) {
			return axios.get('api/message/set-read/'+state.selected_buyer.id)
			.catch(err => {
				console.log(err)
			})
			console.log('Se marcaron como leidos')
		},
		delete({ commit, state }) {
			return axios.delete(`/api/${generals.methods.routeString(state.model_name)}/${state.delete.id}`)
			.then(() => {
				commit('delete')
				commit('setToShow')
			})
			.catch((err) => {
				console.log(err)
			})
		},
		deleteImage({ commit, state }) {
			return axios.delete(`/api/${generals.methods.routeString(state.model_name)}/image/${state.delete_image.id}`)
			.then((res) => {
				commit('add', res.data.model)
			})
			.catch((err) => {
				console.log(err)
			})
		},
		deletePropModel({ commit, state }) {
			return axios.delete(`/api/${generals.methods.routeString(state.prop_model_to_delete.has_many.model_name)}/${state.prop_model_to_delete.id}`)
			.then(res => {
				commit('deletePropModel')
			})
			.catch(err => {
				console.log(err)
			})
		}
	},
}
