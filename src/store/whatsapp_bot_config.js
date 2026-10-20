import axios from 'axios'
import { env } from '@/runtime_config'
axios.defaults.withCredentials = true
axios.defaults.baseURL = env('VUE_APP_API_URL')

import __base_store from '@/store/__base_store'

/**
 * Store singleton de configuración del bot WhatsApp.
 * El endpoint real es whatsapp-bot/config (no el resource estándar whatsapp-bot-config).
 */
export default __base_store({
	state: {
		model_name: 'whatsapp_bot_config',
		route_string: 'whatsapp-bot/config',
		from_dates: false,
		use_per_page: false,
		/**
		 * Datos reales del negocio que el agente usa para el objetivo de la conversación (misión
		 * objetivo-agente-whatsapp): `{ tienda_online: string|null, sucursales: string[],
		 * hay_horario: boolean }`. Viene AL LADO de `model` en el GET y en la respuesta del PUT, y
		 * la solapa "Agente" lo muestra en el recuadro "Lo que va a usar el agente".
		 *
		 * Queda en `null` cuando la API todavía no lo manda (cliente con una versión anterior de
		 * empresa-api): la pantalla anda igual, solo que sin esa vista previa.
		 */
		objective_context: null,
	},
	mutations: {
		/**
		 * Guarda el contexto del objetivo que mandó la API (o `null` si no vino).
		 *
		 * @param {Object} state
		 * @param {Object|null} value `{ tienda_online, sucursales, hay_horario }` o null.
		 */
		setObjectiveContext(state, value) {
			state.objective_context = value || null
		},
	},
	actions: {
		/**
		 * Carga la única configuración del usuario; la expone como lista de 0 o 1 ítem para el ABM.
		 */
		_getModels({ commit, state }) {
			commit('setLoading', true)

			return axios.get('/api/' + state.route_string)
				.then(res => {
					commit('setLoading', false)

					const model = res.data.model

					if (model) {
						commit('setModels', [model])
					} else {
						commit('setModels', [])
					}

					// Contexto del objetivo del agente: opcional en el contrato. Una API vieja no
					// lo manda (undefined) y queda en null, que es "sin vista previa".
					commit('setObjectiveContext', res.data.objective_context || null)
				})
				.catch(err => {
					commit('setLoading', false)
					console.log(err)
				})
		},

		/**
		 * Guarda la configuración funcional del agente (grupo 137, Prompt 07): personalidad,
		 * habilidades, los dos toggles de automatización, los dos tiempos de espera, el
		 * interruptor de visión (misión whatsapp-sidebar-multimedia) y el de simulación desde la
		 * conversación (misión personalizacion-agente-whatsapp), y el objetivo de la conversación
		 * con sus indicaciones (misión objetivo-agente-whatsapp). Pega al mismo endpoint que la
		 * config técnica de Kapso (ABM → Integraciones y la solapa "Conexión"), pero manda solo
		 * estos 10 campos: el controller de la API arma el `updateOrCreate` con
		 * `$request->has(...)` por campo, así que no pisa los campos técnicos que esta pantalla
		 * no conoce.
		 *
		 * Compatibilidad con una API vieja (cliente sin la versión del objetivo): los dos campos
		 * del objetivo viajan igual y el controller viejo los ignora (arma el guardado solo con
		 * los campos que conoce), así que se guarda todo lo demás y el objetivo no persiste.
		 * Tampoco vuelve `objective_context`, y en ese caso no se toca lo que había en el estado.
		 *
		 * @param {Object} payload
		 * @param {string} payload.agent_personality Texto libre con la personalidad del agente.
		 * @param {string} payload.agent_skills Texto libre con el rubro/vocabulario del agente.
		 * @param {boolean} payload.ai_enabled_default Si los chats nuevos nacen con IA prendida.
		 * @param {boolean} payload.auto_send_sale_pdf Si se manda el PDF de la venta automáticamente.
		 * @param {number|string} payload.ai_reply_delay_seconds Espera antes de generar la respuesta.
		 * @param {number|string} payload.ai_confirm_delay_seconds Espera de confirmación antes de enviar.
		 * @param {boolean} payload.ai_vision_enabled Si el agente interpreta las fotos que llegan.
		 * @param {boolean} payload.chat_simulation_enabled Si se puede simular un mensaje del cliente desde la conversación.
		 * @param {string|null} payload.agent_objective Clave del objetivo (`visit_branch`, `buy_online`, `order_by_whatsapp`, `custom`) o null = sin objetivo.
		 * @param {string} payload.agent_objective_detail Indicaciones libres del dueño para el objetivo (en `custom`, el objetivo mismo).
		 * @returns {Promise}
		 */
		updateAgentConfig({ commit, state }, payload) {
			// Indicaciones del objetivo recortadas; si quedan vacías viajan como null, que es como
			// las guarda la base cuando no hay nada escrito (y lo que el backend toma como "sin
			// detalle": en `custom`, eso equivale a no tener objetivo).
			let objective_detail = (payload.agent_objective_detail || '').trim()

			return axios.put('/api/' + state.route_string, {
				agent_personality: payload.agent_personality,
				agent_personality_template: payload.agent_personality_template || null,
				agent_skills: payload.agent_skills,
				ai_enabled_default: payload.ai_enabled_default,
				auto_send_sale_pdf: payload.auto_send_sale_pdf,
				// Van casteados sí o sí: el input numérico los entrega como string y la
				// validación del backend es `integer`, así que un "30" pelado la voltea.
				ai_reply_delay_seconds: Number(payload.ai_reply_delay_seconds) || 0,
				ai_confirm_delay_seconds: Number(payload.ai_confirm_delay_seconds) || 0,
				// 🔴 El interruptor de visión y el de simulación viajan SOLO desde acá, nunca
				// desde `updateConnectionConfig`. Las dos pantallas pegan al mismo endpoint y el
				// backend arma el `updateOrCreate` con `$request->has()` campo por campo: si
				// estos campos viajaran también en la de Conexión, guardar las credenciales le
				// apagaría la visión (o la simulación) al agente sin que nadie lo pida. Es la
				// misma razón por la que la personalidad y las habilidades tampoco viajan de allá.
				ai_vision_enabled: !!payload.ai_vision_enabled,
				chat_simulation_enabled: !!payload.chat_simulation_enabled,
				// Objetivo de la conversación. Igual que la visión y la simulación, viaja SOLO
				// desde acá y nunca desde `updateConnectionConfig`: si viajara también en la de
				// Conexión, guardar las credenciales le borraría el objetivo al agente. La tarjeta
				// "Sin objetivo" no tiene clave propia en la base: viaja como null.
				agent_objective: payload.agent_objective || null,
				agent_objective_detail: objective_detail.length ? objective_detail : null,
			})
				.then(res => {
					// Refleja el modelo guardado (incluye los campos técnicos que ya tenía).
					commit('setModels', [res.data.model])
					// Si la API ya expone el contexto del objetivo, se refresca (el dueño pudo
					// haber cargado una sucursal o la tienda en el medio). Si no viene, se deja lo
					// que había: una API vieja tampoco lo mandó en el GET.
					if (res.data.objective_context !== undefined) {
						commit('setObjectiveContext', res.data.objective_context)
					}
					return res
				})
		},

		/**
		 * Guarda la configuración TÉCNICA de la conexión con Kapso (solapa "Conexión" del modal
		 * del módulo, misión whatsapp-agente): las tres credenciales y el switch de activo.
		 *
		 * Manda SOLO estos 4 campos, y es a propósito: el controller de la API arma el
		 * `updateOrCreate` leyendo campo por campo con `$request->has(...)`, así que lo que no
		 * viaja no se toca. Gracias a eso esta pantalla y la del agente (`updateAgentConfig`)
		 * pegan al mismo endpoint sin pisarse. Si alguna vez se manda el form entero desde acá,
		 * un guardado de conexión le borra la personalidad al agente (y al revés).
		 *
		 * Sin `.catch()` a propósito: el error tiene que llegar entero al componente, que es
		 * quien muestra el `message` del 422 (ej: "no se puede activar el bot sin credenciales").
		 *
		 * @param {Object} payload
		 * @param {string} payload.phone_number_id ID del número del negocio en Kapso.
		 * @param {string} payload.kapso_api_key Clave para mandarle mensajes a Kapso.
		 * @param {string} payload.webhook_secret Secreto con el que se firma cada mensaje entrante.
		 * @param {boolean} payload.is_active Si el bot está prendido.
		 * @returns {Promise}
		 */
		updateConnectionConfig({ commit, state }, payload) {
			return axios.put('/api/' + state.route_string, {
				phone_number_id: payload.phone_number_id,
				kapso_api_key: payload.kapso_api_key,
				webhook_secret: payload.webhook_secret,
				is_active: payload.is_active,
			})
				.then(res => {
					// Refleja el modelo guardado (incluye los campos del agente que ya tenía).
					commit('setModels', [res.data.model])
					return res
				})
		},
	},
})
