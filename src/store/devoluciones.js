import axios from 'axios'
import { env } from '@/runtime_config'
axios.defaults.withCredentials = true
axios.defaults.baseURL = env('VUE_APP_API_URL')

/**
 * La descripcion de la variante de un renglon de la venta ("Azul 36"), o null si el renglon no tiene
 * variante. Primero la del pivot (article_sale.variant_description, que la API guarda al vender) y,
 * si no la trae, la de las variantes del articulo por id.
 *
 * @param {Object} article Articulo de sale.articles, con su pivot.
 * @returns {String|null}
 */
function descripcion_de_variante_del_renglon(article) {

	let article_variant_id = Number(article.pivot.article_variant_id || 0)

	if (!article_variant_id) {
		return null
	}

	if (article.pivot.variant_description) {
		return article.pivot.variant_description
	}

	if (!Array.isArray(article.article_variants)) {
		return null
	}

	let variante = article.article_variants.find(variant => variant.id == article_variant_id)

	return variante ? variante.variant_description : null
}

export default {
	namespaced: true,
	state: {
		/*
			Sobre qué se hace la nota de crédito: 'venta' (devolución de un cliente, el camino de
			siempre) o 'compra' (devolución a un proveedor, misión devoluciones-compras-y-rediseno).
			Arranca en 'venta' porque es lo que el módulo hacía antes de existir el selector, y los
			specs de e2e entran a /devoluciones esperando encontrar el buscador de venta.
		*/
		tipo: 'venta',

		num_sale: '',
		client: null,

		sale: null,

		/*
			Lado compra. `provider_order` es la compra traída de
			GET devoluciones/search-provider-order/{num}; `provider` es el proveedor, venga de esa
			compra o elegido a mano para una nota de crédito libre (sin compra de origen).
		*/
		num_provider_order: '',
		provider: null,
		provider_order: null,

		discounts_id: [],
		surchages_id: [],

		items: [],

		total_devolucion: 0,

		descriptions: [],

		update_unidades_devueltas: 0,
		regresar_stock: 1,
		address_id: 0,
		generar_current_acount: 1,
		facturar_nota_credito: 0,
		aplicar_recargos_directo_a_items: 0,
	},
	mutations: {
		set_tipo(state, value) {
			state.tipo = value
		},
		set_num_provider_order(state, value) {
			state.num_provider_order = value
		},
		set_provider(state, value) {
			state.provider = value
		},
		set_provider_order(state, value) {
			state.provider_order = value
		},
		set_update_unidades_devueltas(state, value) {
			state.update_unidades_devueltas = value
		},
		set_aplicar_recargos_directo_a_items(state, value) {
			state.aplicar_recargos_directo_a_items = value
		},
		set_num_sale(state, value) {
			state.num_sale = value 
		},
		set_descriptions(state, value) {
			state.descriptions = value 
		},
		add_description(state) {
			state.descriptions.push({
				notes: '',
				price: '',
				iva_id: 2,
			})
		},
		delete_description(state, description) {

			let index = state.descriptions.findIndex(d => {
				return d.notes == description.notes
				&& d.price == description.price
			})

			if (index != -1) {
				state.descriptions.splice(index, 1)
			}
		},
		set_client(state, value) {
			state.client = value 
		},
		set_sale(state, value) {
			state.sale = value 
		},
		set_discounts_id(state, value) {
			state.discounts_id = value
		},
		add_discount_id(state, value) {
			state.discounts_id.push(value)
		},
		set_surchages_id(state, value) {
			state.surchages_id = value
		},
		add_surchage_id(state, value) {
			state.surchages_id.push(value)
		},
		set_items(state, value) {
			state.items = value 
		},
		add_item(state, value) {
			state.items.push(value) 
		},
		set_total_devolucion_manual(state, value) {
			console.log('set_total_devolucion_manual: '+value)
			state.total_devolucion = value 
		},
		set_regresar_stock(state, value) {
			state.regresar_stock = value 
		},
		set_generar_current_acount(state, value) {
			state.generar_current_acount = value 
		},
		set_address_id(state, value) {
			state.address_id = value 
		},
		set_facturar_nota_credito(state, value) {
			state.facturar_nota_credito = value 
		},
		/*
			Quita un renglon de la nota libre (mision variantes-mismo-articulo-en-vender, 8/10/2026).

			Hasta esta mision buscaba el primer renglon con el mismo id: con el mismo articulo dos
			veces (dos variantes), quitar el segundo borraba el primero. Ahora se busca por
			REFERENCIA (TablaArticulos.vue pasa el mismo objeto del store) y, si no estuviera (un
			llamador que pase una copia), por la identidad del renglon: id + variante + tipo
			(articulo o servicio, que tienen ids de tablas distintas).
		*/
		remove_item(state, value) {
			let index = state.items.indexOf(value)
			if (index == -1) {
				index = state.items.findIndex(item => {
					return item.id == value.id
						&& Number(item.article_variant_id || 0) == Number(value.article_variant_id || 0)
						&& !!item.is_service == !!value.is_service
				})
			}
			if (index != -1) {
				state.items.splice(index, 1)
			}
		},


		format_items(state, sale) {

			console.log('format_articles, sale:')
			console.log(sale)

			let items = []

			sale.articles.forEach(article => {
				items.push({
					...article,
					is_article: true,
					price_vender: article.pivot.price,
					amount: article.pivot.amount,
					article_variant_id: article.pivot.article_variant_id,
					/*
						La variante del renglon ("Azul 36"), para mostrarla junto al nombre (mision
						variantes-mismo-articulo-en-vender, 8/10/2026): con el mismo articulo vendido en
						dos variantes la venta trae dos renglones con el mismo nombre, y sin esto no se
						sabia cual de los dos se estaba devolviendo. Sale del pivot
						(article_sale.variant_description) y, si no la trae, de las variantes del
						articulo por id. null si el renglon no tiene variante.
					*/
					variant_description: descripcion_de_variante_del_renglon(article),
					discount: article.pivot.discount,
					returned_amount: article.pivot.returned_amount,
					ya_devueltas: article.pivot.returned_amount,
				})
			})

			sale.services.forEach(service => {
				items.push({
					...service,
					is_service: true,
					price_vender: service.pivot.price,
					amount: service.pivot.amount,
					discount: service.pivot.discount,
					returned_amount: service.pivot.returned_amount,
					ya_devueltas: service.pivot.returned_amount,
				})
			})

			console.log('items:')
			console.log(items)
			state.items = items
			console.log(state.items)
		},
	},
	actions: {

		// search_sale({state, commit}) {
				
		// 	commit('auth/setMessage', 'Buscando venta', {root: true})
		// 	commit('auth/setLoading', true, {root: true})

		// 	return axios.get('api/devoluciones/search-sale/'+state.num_sale)
		// 	.then(res => {
				
		// 		commit('auth/setLoading', false, {root: true})

		// 		let sale = res.data.sale  

		// 		console.log('sale de devolucion:')
		// 		console.log(sale)

		// 		if (sale) {

		// 			commit('set_sale', sale)

		// 			if (sale.client) {

		// 				commit('set_client', sale.client)
		// 			}

		// 			if (sale.address_id) {

		// 				commit('set_address_id', sale.address_id)
		// 			}

		// 			if (sale.afip_ticket) {

		// 				commit('set_facturar_nota_credito', 1)
		// 			} else {

		// 				commit('set_facturar_nota_credito', 0)
		// 			}

		// 			if (
		// 				sale.client 
		// 				&& !sale.omitir_en_cuenta_corriente
		// 			) {

		// 				commit('set_generar_current_acount', 1)
		// 			} else {

		// 				commit('set_generar_current_acount', 0)
		// 			}

		// 			console.log('sale.aplicar_recargos_directo_a_items :')
		// 			console.log(sale.aplicar_recargos_directo_a_items)

		// 			if (
		// 				sale.aplicar_recargos_directo_a_items 
		// 			) {

		// 				commit('set_aplicar_recargos_directo_a_items', 1)
		// 			} else {

		// 				commit('set_aplicar_recargos_directo_a_items', 0)
		// 			}

		// 			commit('format_articles', sale)
		// 		} else {

		// 			commit('set_sale', null)
		// 		}
		// 	})
		// 	.catch(err => {
		// 		commit('auth/setLoading', false, {root: true})
		// 	})
		// },
	},
}
