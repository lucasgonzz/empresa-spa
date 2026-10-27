import axios from 'axios'
import { env } from '@/runtime_config'
axios.defaults.withCredentials = true
axios.defaults.baseURL = env('VUE_APP_API_URL')

export default {
	namespaced: true,
	state: {
		meli_category: null,
		article_meli_attributes: [],
		categories_predictor: [],

		/*
			Estado de la cuenta de Mercado Libre del comercio (misión mercado-libre-integracion,
			27/10/2026). Es la respuesta de `GET mercado-libre/cuenta` tal cual:
			{conectado, nickname, meli_user_id, reputacion, puede_publicar, motivos_no_publica,
			user_product_seller, multiorigen, cola, ultimo_poll_pedidos, error_conexion}.

			Vive en el store y no en la solapa "Cuenta" porque la leen también las otras solapas
			del módulo (para mostrar el aviso de "conectá tu cuenta") y la vista que las orquesta.
			`null` = todavía no se consultó.
		*/
		cuenta: null,

		/*
			Categorías ya resueltas con `POST meli-category/resolve`, por id LOCAL de la categoría.
			El formulario del artículo reparte sus campos en solapas y el componente de Mercado
			Libre se destruye y se vuelve a montar cada vez que el usuario cambia de solapa: sin
			este cache, cada vuelta a la solapa volvía a pedir la categoría con todos sus atributos.
		*/
		categorias_resueltas: {},
	},
	mutations: {
		set_categories_predictor(state, value) {
			state.categories_predictor = value
		},
		set_meli_category(state, value) {
			state.meli_category = value
		},
		set_article_meli_attributes(state, value) {
			state.article_meli_attributes = value
		},
		set_cuenta(state, value) {
			state.cuenta = value
		},
		/**
		 * Guarda una categoría resuelta en el cache, por su id local.
		 *
		 * @param {Object} state
		 * @param {Object} categoria `model` de `POST meli-category/resolve`.
		 */
		guardar_categoria_resuelta(state, categoria) {
			if (!categoria || !categoria.id) {
				return
			}
			let nuevas = {
				...state.categorias_resueltas,
			}
			nuevas[categoria.id] = categoria
			state.categorias_resueltas = nuevas
		},
	},
}
