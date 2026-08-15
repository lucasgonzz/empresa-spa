<template>
	<div class="whatsapp-agent-config">
		<b-form-group
		label="Personalidad del agente">
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
export default {
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	data() {
		return {
			// Copia local editable de la configuración (se sincroniza con el store al cargar/guardar).
			// Los dos delays arrancan en 0 = comportamiento de siempre (responde y envía al toque):
			// así, si el backend todavía no tiene la columna cargada, nada cambia de golpe.
			form: {
				agent_personality: '',
				ai_enabled_default: true,
				auto_send_sale_pdf: false,
				ai_reply_delay_seconds: 0,
				ai_confirm_delay_seconds: 0,
				// Arranca apagado, igual que el default de la columna en la base: prender la
				// visión sin que el dueño lo pida le sumaría un costo por cada foto que llegue.
				ai_vision_enabled: false,
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
	},
	watch: {
		config: {
			immediate: true,
			handler(value) {
				if (!value) {
					return
				}
				this.form.agent_personality = value.agent_personality || ''
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
			},
		},
	},
	methods: {
		/**
		 * Guarda la personalidad, los tres toggles y los dos tiempos de espera. Usa el indicador
		 * global de carga (además del loading local del botón) según la convención del proyecto.
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
</style>
