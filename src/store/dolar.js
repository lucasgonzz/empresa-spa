import axios from 'axios'
export default {
	namespaced: true,
	state: {
		promedio: 0,
	},
	mutations: {
		setPromedio(state, value) {
			state.promedio = value
		},
		// setDolar(state, value) {
		// 	let dolar_blue = value.find(data => {
		// 		return data.casa.nombre == "Dolar Blue"
		// 	})
		// 	let compra = Number(dolar_blue.casa.compra.replace(',', '.'))
		// 	let venta = Number(dolar_blue.casa.venta.replace(',', '.'))
		// 	state.dolar.compra = compra
		// 	state.dolar.venta = venta
		// 	state.dolar.promedio = (compra + venta) / 2
		// 	console.log('dolar:')
		// 	console.log(state.dolar)
		// },
		incrementFilterPage(state) {
			state.filter_page++
		},
		setFilterPage(state, value) {
			state.filter_page = value 
		},
		setTotalFilterPages(state, value) {
			state.total_filter_pages = value 
		},
		setTotalFilterResults(state, value) {
			state.total_filter_results = value 
		},
		addFiltered(state, value) {
			state.filtered = state.filtered.concat(value)
		},
		setLoadingFiltered(state, value) {
			state.loading_filtered = value 
		},
	},
	actions: {
		getDolar({ commit }) {
			return fetch('https://api.bluelytics.com.ar/v2/latest')
			.then(res => {
				console.log('dolar:')
				res.json()
				.then(data => {
					console.log(data.blue.value_avg)
					commit('setPromedio', data.blue.value_avg)
				})
			})
			.catch(err => {
				console.log(err)
			})
		}
	}
}