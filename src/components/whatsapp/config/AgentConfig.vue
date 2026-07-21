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
			form: {
				agent_personality: '',
				ai_enabled_default: true,
				auto_send_sale_pdf: false,
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
			},
		},
	},
	methods: {
		/**
		 * Guarda la personalidad y los dos toggles. Usa el indicador global de carga (además
		 * del loading local del botón) según la convención del proyecto.
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
