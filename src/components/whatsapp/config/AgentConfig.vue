<template>
	<div class="whatsapp-agent-config">
		<b-form-group
		label="Personalidad del agente">
			<agent-template-picker
			:templates="personality_templates"
			:selected_key="selected_personality_key"
			variant="card"
			class="whatsapp-agent-config__picker"
			@selected="onPersonalitySelected"></agent-template-picker>
			<b-form-textarea
			v-model="form.agent_personality"
			rows="5"
			max-rows="10"
			placeholder="Sos Caro, la vendedora de Distribuidora García. Tratás de vos, sos concreta y amable…"></b-form-textarea>
			<small class="text-muted whatsapp-agent-config__hint">
				Esto define el tono y la forma de hablar del agente. No puede pisar las reglas
				fijas del sistema: el agente nunca inventa precios ni stock, y nunca confirma
				pagos por su cuenta.
			</small>
		</b-form-group>

		<b-form-group
		label="Habilidades del agente">
			<agent-template-picker
			:templates="skill_templates"
			:selected_key="selected_skills_key"
			variant="chip"
			class="whatsapp-agent-config__picker"
			@selected="onSkillsSelected"></agent-template-picker>
			<b-form-textarea
			v-model="form.agent_skills"
			rows="5"
			max-rows="10"
			placeholder="Sos experto en ferretería..."></b-form-textarea>
			<small class="text-muted whatsapp-agent-config__hint">
				Definí de qué sabe el agente: el rubro, el vocabulario y qué preguntar. La
				personalidad es cómo habla; esto es qué sabe.
			</small>
		</b-form-group>

		<!-- Objetivo de la conversación (misión objetivo-agente-whatsapp, 16/10/2026): lo que el
		agente trata de lograr además de asesorar. Se guarda la CLAVE; el texto que lee el modelo lo
		arma empresa-api con los datos reales del negocio, que son los que muestra el recuadro de
		abajo. -->
		<b-form-group
		label="Objetivo de la conversación"
		class="whatsapp-agent-config__objective">
			<agent-template-picker
			:templates="objective_options"
			:selected_key="selected_objective_key"
			variant="card"
			class="whatsapp-agent-config__picker"
			@selected="onObjectiveSelected"></agent-template-picker>
			<small class="text-muted whatsapp-agent-config__hint">
				Además de asesorar, el agente va a tratar de lograr esto: primero responde lo que
				el cliente pregunta y, cuando viene al caso, lo orienta hacia el objetivo, sin
				insistir. Nunca inventa datos: usa los que tenés cargados en el sistema.
			</small>

			<!-- Indicaciones del objetivo: solo con un objetivo elegido. El rótulo y el ejemplo
			cambian según el objetivo (en "Otro objetivo" el texto ES el objetivo). -->
			<div
			v-if="selected_objective"
			class="whatsapp-agent-config__objective-detail">
				<label
				for="whatsapp-agent-objective-detail"
				class="whatsapp-agent-config__objective-label">
					{{ selected_objective.detail_label }}
				</label>
				<b-form-textarea
				id="whatsapp-agent-objective-detail"
				v-model="form.agent_objective_detail"
				rows="3"
				max-rows="6"
				maxlength="1000"
				:placeholder="selected_objective.detail_placeholder"></b-form-textarea>
				<!-- No bloquea el guardado: el backend toma "Otro objetivo" sin texto como "sin
				objetivo", y acá solo se avisa para que no le sorprenda. -->
				<small
				v-if="custom_objective_empty"
				class="whatsapp-agent-config__objective-error">
					Escribí el objetivo: si queda vacío, el agente funciona sin objetivo.
				</small>
				<!-- El agente no carga ventas: el pedido queda solo en el texto del chat. Se dice acá
				para que el dueño no espere un aviso que no existe. -->
				<small
				v-if="form.agent_objective === 'order_by_whatsapp'"
				class="text-muted whatsapp-agent-config__hint">
					El pedido queda escrito en la conversación: no se carga solo como venta ni te llega
					un aviso aparte. Lo confirmás vos (o un empleado) respondiendo en ese chat.
				</small>
			</div>

			<!-- Vista previa de los datos reales que va a usar el agente. Solo para los dos
			objetivos que dependen de datos cargados, y solo si la API manda el contexto (con una
			API vieja no viene y el recuadro no aparece). -->
			<div
			v-if="show_objective_preview"
			class="whatsapp-agent-config__objective-preview">
				<div class="whatsapp-agent-config__objective-preview-title">
					Lo que va a usar el agente
				</div>

				<template v-if="form.agent_objective === 'visit_branch'">
					<div
					v-if="objective_branches.length"
					class="whatsapp-agent-config__objective-preview-row">
						<span class="whatsapp-agent-config__objective-preview-label">
							{{ objective_branches.length > 1 ? 'Direcciones' : 'Dirección' }}
						</span>
						<ul class="whatsapp-agent-config__objective-preview-list">
							<li
							v-for="(branch, index) in objective_branches"
							:key="index"
							class="whatsapp-agent-config__objective-preview-value">{{ branch }}</li>
						</ul>
					</div>
					<div
					v-else
					class="whatsapp-agent-config__objective-warning">
						<i class="bi bi-exclamation-triangle whatsapp-agent-config__objective-warning-icon"></i>
						<span>
							No hay sucursales con domicilio cargado: el agente va a invitar a pasar,
							pero no va a dar una dirección. Cargalo en ABM → Sucursales, en «Domicilio».
						</span>
					</div>

					<div
					v-if="objective_context.hay_horario"
					class="whatsapp-agent-config__objective-preview-row">
						Horario de atención: cargado.
					</div>
					<div
					v-else
					class="whatsapp-agent-config__objective-warning">
						<i class="bi bi-exclamation-triangle whatsapp-agent-config__objective-warning-icon"></i>
						<span>
							Sin horario de atención cargado: el agente no va a decir a qué hora
							abren. Lo carga ComercioCity: pedíselo por soporte.
						</span>
					</div>
				</template>

				<template v-if="form.agent_objective === 'buy_online'">
					<div
					v-if="objective_context.tienda_online"
					class="whatsapp-agent-config__objective-preview-row">
						<span class="whatsapp-agent-config__objective-preview-label whatsapp-agent-config__objective-preview-label--inline">Tienda online:</span>
						<span class="whatsapp-agent-config__objective-preview-value whatsapp-agent-config__objective-preview-value--url">{{ objective_context.tienda_online }}</span>
					</div>
					<div
					v-else
					class="whatsapp-agent-config__objective-warning">
						<i class="bi bi-exclamation-triangle whatsapp-agent-config__objective-warning-icon"></i>
						<span>
							Tu cuenta no tiene cargada la dirección de la tienda online: hasta que
							esté, el agente funciona sin objetivo. Si tenés tienda, pedile a
							ComercioCity que la cargue.
						</span>
					</div>
				</template>
			</div>
		</b-form-group>

		<b-form-checkbox
		v-model="form.ai_enabled_default"
		switch
		class="whatsapp-agent-config__toggle">
			La IA responde sola en los chats nuevos
		</b-form-checkbox>

		<div class="whatsapp-agent-config__toggle-group">
			<b-form-checkbox
			v-model="form.auto_send_sale_pdf"
			switch>
				Enviar el comprobante automáticamente al guardar una venta
			</b-form-checkbox>
			<small class="text-muted">
				Solo a clientes con conversación de WhatsApp o teléfono cargado.
			</small>
		</div>

		<!-- Va en esta solapa y no en "Conexión" porque es comportamiento del agente, no una
		credencial. Nace apagado: prendido, cada foto que el agente mira se paga aparte. -->
		<div class="whatsapp-agent-config__toggle-group">
			<b-form-checkbox
			v-model="form.ai_vision_enabled"
			switch>
				Que la IA mire las fotos que manda el cliente
			</b-form-checkbox>
			<small class="text-muted">
				Apagado, el agente sabe que llegó una imagen pero no la interpreta. Prendido,
				cada foto que analiza tiene un costo extra.
			</small>
		</div>

		<!-- Gatea el botón de "Simular mensaje del cliente" tanto en la conversación como en el
		header de la bandeja (chats-list/Index.vue). Nace apagado: sin esto, a los clientes ya
		activos les aparecería un botón nuevo sin haberlo pedido. -->
		<div class="whatsapp-agent-config__toggle-group">
			<b-form-checkbox
			v-model="form.chat_simulation_enabled"
			switch>
				Permitir simular mensajes del cliente en la conversación
			</b-form-checkbox>
			<small class="text-muted">
				Habilita un botón en cada conversación para probar cómo responde el agente. No
				le llega nada a nadie.
			</small>
		</div>

		<b-form-group
		label="Espera antes de responder (segundos)">
			<b-form-input
			v-model="form.ai_reply_delay_seconds"
			type="number"
			min="0"
			max="600"></b-form-input>
			<small class="text-muted whatsapp-agent-config__hint">
				Segundos que espera el agente antes de responder. Si el cliente manda varios
				mensajes seguidos, el agente espera a que termine y responde una sola vez a todos.
				En 0 responde al instante.
			</small>
		</b-form-group>

		<b-form-group
		label="Espera para confirmar antes de enviar (segundos)">
			<b-form-input
			v-model="form.ai_confirm_delay_seconds"
			type="number"
			min="0"
			max="3600"></b-form-input>
			<small class="text-muted whatsapp-agent-config__hint">
				Segundos que el mensaje generado espera tu confirmación antes de enviarse solo.
				En 0 se envía automáticamente, sin esperar.
			</small>
		</b-form-group>

		<div class="whatsapp-agent-config__actions">
			<btn-loader
			text="Guardar"
			:loader="loading"
			:block="false"
			@clicked="save"></btn-loader>
		</div>
	</div>
</template>
<script>
import { WHATSAPP_PERSONALITY_TEMPLATES, WHATSAPP_SKILL_TEMPLATES } from '@/constants/whatsapp_agent_templates'
import { WHATSAPP_AGENT_OBJECTIVES } from '@/constants/whatsapp_agent_objectives'
import AgentTemplatePicker from '@/components/whatsapp/config/AgentTemplatePicker'

export default {
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
		AgentTemplatePicker,
	},
	data() {
		return {
			// Listas cerradas de plantillas precargadas (no son reactivas: son constantes de módulo).
			personality_templates: WHATSAPP_PERSONALITY_TEMPLATES,
			skill_templates: WHATSAPP_SKILL_TEMPLATES,
			// Las 5 tarjetas del objetivo de la conversación (incluida "Sin objetivo", que en la
			// base es null). También es una constante de módulo.
			objective_options: WHATSAPP_AGENT_OBJECTIVES,
			// Copia local editable de la configuración (se sincroniza con el store al cargar/guardar).
			// Los dos delays arrancan en 0 = comportamiento de siempre (responde y envía al toque):
			// así, si el backend todavía no tiene la columna cargada, nada cambia de golpe.
			form: {
				agent_personality: '',
				// Es texto libre, igual que la personalidad: el rubro/vocabulario del negocio.
				agent_skills: '',
				ai_enabled_default: true,
				auto_send_sale_pdf: false,
				ai_reply_delay_seconds: 0,
				ai_confirm_delay_seconds: 0,
				// Arranca apagado, igual que el default de la columna en la base: prender la
				// visión sin que el dueño lo pida le sumaría un costo por cada foto que llegue.
				ai_vision_enabled: false,
				// Arranca apagado por el mismo motivo: sin esto, a los clientes ya activos les
				// aparecería de golpe un botón nuevo que nadie pidió.
				chat_simulation_enabled: false,
				// Clave del objetivo de la conversación (`visit_branch`, `buy_online`,
				// `order_by_whatsapp` o `custom`). null = sin objetivo, que es como viene: el
				// agente solo asesora y el prompt queda igual que antes de la misión.
				agent_objective: null,
				// Indicaciones libres del dueño para el objetivo (en `custom`, el objetivo mismo).
				// Hasta 1000 caracteres, igual que el máximo que acepta la API.
				agent_objective_detail: '',
			},
			loading: false,
		}
	},
	computed: {
		/**
		 * La API expone la config como lista de 0 o 1 ítem (mismo patrón que el resto del ABM).
		 */
		config() {
			return this.$store.state.whatsapp_bot_config.models[0] || null
		},
		/**
		 * Clave de la plantilla de personalidad cuyo texto coincide EXACTO con lo que hay en el
		 * textarea, o null si no coincide con ninguna (porque está vacío o el dueño lo editó a
		 * mano). Alimenta el picker para que la marca de "seleccionada" se apague sola apenas se
		 * toca una letra.
		 *
		 * @returns {string|null}
		 */
		selected_personality_key() {
			let found = this.personality_templates.find(item => item.text === this.form.agent_personality)
			return found ? found.key : null
		},
		/**
		 * Igual que `selected_personality_key`, pero contra las plantillas de habilidades.
		 *
		 * @returns {string|null}
		 */
		selected_skills_key() {
			let found = this.skill_templates.find(item => item.text === this.form.agent_skills)
			return found ? found.key : null
		},
		/**
		 * Clave de la tarjeta de objetivo marcada en el picker. Sin objetivo (null) se marca la
		 * tarjeta "Sin objetivo", que existe solo en la pantalla.
		 *
		 * @returns {string}
		 */
		selected_objective_key() {
			return this.form.agent_objective || 'none'
		},
		/**
		 * Ítem completo del objetivo elegido (con su rótulo y ejemplo del detalle), o null si no
		 * hay objetivo. Alimenta el textarea de indicaciones, que solo se muestra con objetivo.
		 *
		 * @returns {Object|null}
		 */
		selected_objective() {
			if (!this.form.agent_objective) {
				return null
			}
			let found = this.objective_options.find(item => item.key === this.form.agent_objective)
			return found || null
		},
		/**
		 * Si el objetivo es "Otro objetivo" y todavía no tiene texto: en ese caso el backend lo
		 * toma como "sin objetivo", y la pantalla lo avisa en rojo (sin bloquear el guardado).
		 *
		 * @returns {boolean}
		 */
		custom_objective_empty() {
			return this.form.agent_objective === 'custom'
				&& !(this.form.agent_objective_detail || '').trim()
		},
		/**
		 * Datos reales del negocio que el agente usa para el objetivo
		 * (`{ tienda_online, sucursales, hay_horario }`), tal cual los manda la API. null si la
		 * API no los manda (versión anterior de empresa-api).
		 *
		 * @returns {Object|null}
		 */
		objective_context() {
			return this.$store.state.whatsapp_bot_config.objective_context
		},
		/**
		 * Textos de las sucursales con domicilio que va a dar el agente, uno por sucursal y tal
		 * cual vienen de la API. Se protege contra un contexto incompleto para no romper el
		 * recuadro si algún día la clave no viene.
		 *
		 * @returns {string[]}
		 */
		objective_branches() {
			if (!this.objective_context || !Array.isArray(this.objective_context.sucursales)) {
				return []
			}
			return this.objective_context.sucursales
		},
		/**
		 * Si se muestra el recuadro "Lo que va a usar el agente": solo para los objetivos que
		 * dependen de datos cargados en el sistema (pasar por el local y comprar en la tienda) y
		 * solo si la API mandó el contexto.
		 *
		 * @returns {boolean}
		 */
		show_objective_preview() {
			if (!this.objective_context) {
				return false
			}
			return this.form.agent_objective === 'visit_branch'
				|| this.form.agent_objective === 'buy_online'
		},
	},
	watch: {
		config: {
			immediate: true,
			handler(value) {
				if (!value) {
					return
				}
				this.form.agent_personality = value.agent_personality || ''
				this.form.agent_skills = value.agent_skills || ''
				// Si todavía no está seteado en backend (registro viejo), se respeta el default true/false.
				this.form.ai_enabled_default = value.ai_enabled_default === undefined || value.ai_enabled_default === null
					? true
					: !!value.ai_enabled_default
				this.form.auto_send_sale_pdf = !!value.auto_send_sale_pdf
				// `Number(...) || 0` de una: la API los manda como número, pero un registro viejo
				// (anterior a la migración) los trae null/undefined y el input numérico devuelve
				// string. En los dos casos el fallback correcto es 0 = sin espera.
				this.form.ai_reply_delay_seconds = Number(value.ai_reply_delay_seconds) || 0
				this.form.ai_confirm_delay_seconds = Number(value.ai_confirm_delay_seconds) || 0
				// `!!` de una: un registro anterior a la migración lo trae null/undefined, y en
				// los dos casos el default correcto es apagado. Además la API lo puede mandar
				// como 0/1 si algún día se le cae el cast del modelo.
				this.form.ai_vision_enabled = !!value.ai_vision_enabled
				this.form.chat_simulation_enabled = !!value.chat_simulation_enabled
				// Con una API vieja los dos campos no vienen (undefined): quedan sin objetivo y
				// sin detalle. Un valor que no está entre las tarjetas también se toma como sin
				// objetivo, igual que hace el backend con un valor desconocido.
				this.form.agent_objective = this.normalize_objective(value.agent_objective)
				this.form.agent_objective_detail = value.agent_objective_detail || ''
			},
		},
	},
	methods: {
		/**
		 * Aplica la plantilla de personalidad elegida en el picker. Si el textarea está vacío o
		 * ya tiene el texto de OTRA plantilla conocida, reemplaza directo (no hay nada propio del
		 * dueño que perder). Si tiene contenido propio, confirma antes de pisarlo.
		 *
		 * @param {Object} template Plantilla completa emitida por el picker ({ key, name, text, ... }).
		 * @returns {void}
		 */
		onPersonalitySelected(template) {
			let self = this
			if (!this.form.agent_personality.trim() || this.selected_personality_key) {
				this.form.agent_personality = template.text
				return
			}
			this.$bvModal.msgBoxConfirm('Ya escribiste algo acá. ¿Lo reemplazo por la plantilla "' + template.name + '"?', {
				okTitle: 'Reemplazar',
				cancelTitle: 'Cancelar',
			}).then(function (confirmed) {
				if (confirmed) {
					self.form.agent_personality = template.text
				}
			})
		},
		/**
		 * Igual que `onPersonalitySelected`, para el textarea de habilidades.
		 *
		 * @param {Object} template Plantilla completa emitida por el picker ({ key, name, text, ... }).
		 * @returns {void}
		 */
		onSkillsSelected(template) {
			let self = this
			if (!this.form.agent_skills.trim() || this.selected_skills_key) {
				this.form.agent_skills = template.text
				return
			}
			this.$bvModal.msgBoxConfirm('Ya escribiste algo acá. ¿Lo reemplazo por la plantilla "' + template.name + '"?', {
				okTitle: 'Reemplazar',
				cancelTitle: 'Cancelar',
			}).then(function (confirmed) {
				if (confirmed) {
					self.form.agent_skills = template.text
				}
			})
		},
		/**
		 * Aplica el objetivo elegido en el picker. A diferencia de personalidad y habilidades, no
		 * copia ningún texto: solo cambia la clave, así que no hay nada del dueño que pisar ni
		 * nada que confirmar. Las indicaciones ya escritas se conservan al cambiar de objetivo
		 * (vuelven a verse en el textarea al elegir cualquier objetivo; con «Sin objetivo» el textarea se oculta, el texto viaja igual y la API lo ignora).
		 *
		 * @param {Object} objective Ítem emitido por el picker ({ key, name, ... }).
		 * @returns {void}
		 */
		onObjectiveSelected(objective) {
			// "Sin objetivo" no existe en la base: se guarda null.
			this.form.agent_objective = objective.key === 'none' ? null : objective.key
		},
		/**
		 * Traduce el objetivo que vino de la API al valor del formulario: una clave conocida
		 * queda igual; null, undefined (API vieja), 'none' o cualquier valor que no esté entre
		 * las tarjetas pasan a null = sin objetivo.
		 *
		 * @param {*} value Valor de `agent_objective` tal cual vino en el modelo.
		 * @returns {string|null}
		 */
		normalize_objective(value) {
			if (!value || value === 'none') {
				return null
			}
			let found = this.objective_options.find(item => item.key === value)
			return found ? found.key : null
		},
		/**
		 * Guarda la personalidad, las habilidades, el objetivo de la conversación (con sus
		 * indicaciones), los toggles y los dos tiempos de espera. Usa
		 * el indicador global de carga (además del loading local del botón) según la convención
		 * del proyecto.
		 */
		save() {
			this.loading = true
			this.$store.commit('auth/setMessage', 'Guardando configuración del agente')
			this.$store.commit('auth/setLoading', true)

			this.$store.dispatch('whatsapp_bot_config/updateAgentConfig', this.form)
			.then(() => {
				this.loading = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				this.$toast.success('Configuración guardada')
			})
			.catch(err => {
				this.loading = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				console.log(err)
				this.$toast.error('No se pudo guardar la configuración')
			})
		},
	},
}
</script>
<style lang="sass">
.whatsapp-agent-config
	&__picker
		margin-bottom: 10px
	&__hint
		display: block
		margin-top: 6px
	&__toggle
		margin-bottom: 14px
	&__toggle-group
		margin-bottom: 18px
	&__actions
		display: flex
		justify-content: flex-end
	// Objetivo de la conversación (misión objetivo-agente-whatsapp). Todo por token para que
	// ande igual en modo oscuro: los avisos de dato faltante van con el fondo ámbar suave del
	// sistema (advertencia, no error) y el aviso de "Otro objetivo" vacío, en el rojo de texto.
	&__objective-detail
		margin-top: 12px
	&__objective-label
		display: block
		margin-bottom: 4px
		font-size: .875rem
		font-weight: 600
		color: var(--color-text-primary)
	&__objective-error
		display: block
		margin-top: 6px
		font-size: .8rem
		color: var(--color-text-danger-strong, var(--danger))
	&__objective-preview
		margin-top: 12px
		padding: 10px 12px
		border: 1px solid var(--color-border)
		border-radius: 10px
		background: var(--bg-section)
		display: flex
		flex-direction: column
		gap: 8px
	&__objective-preview-title
		font-size: .75rem
		font-weight: 700
		text-transform: uppercase
		letter-spacing: .03em
		color: var(--color-text-secondary)
	&__objective-preview-row
		font-size: .875rem
		color: var(--color-text-primary)
	&__objective-preview-label
		display: block
		font-weight: 600
		margin-bottom: 2px
		// "Tienda online:" va en el mismo renglón que la URL.
		&--inline
			display: inline
			margin-bottom: 0
			// El espacio entre los dos <span> lo descarta el compilador de templates (los renglones
			// en blanco entre elementos no llegan al DOM): sin este margen sale "Tienda online:http…".
			margin-right: 4px
	&__objective-preview-list
		list-style: none
		margin: 0
		padding: 0
	// Los textos vienen de la base tal cual (domicilios, la URL de la tienda) y no pueden
	// desbordar el recuadro a 360 px. `anywhere` corta solo cuando no entra (y, a diferencia de
	// `break-word`, achica el ancho mínimo, así que tampoco empuja al modal); `break-word` queda
	// de respaldo para los navegadores que no conocen `anywhere`.
	&__objective-preview-value
		word-break: break-word
		overflow-wrap: anywhere
		// Una URL no tiene espacios donde cortar: se la deja cortar en cualquier letra.
		&--url
			word-break: break-all
	&__objective-warning
		display: flex
		align-items: flex-start
		gap: 8px
		padding: 8px 10px
		border-radius: 8px
		font-size: .85rem
		background: var(--bg-warning-soft, #fff4d6)
		color: var(--color-text-primary)
	&__objective-warning-icon
		flex-shrink: 0
		margin-top: 2px
		color: var(--color-text-warning-strong, #7a5b00)
</style>
