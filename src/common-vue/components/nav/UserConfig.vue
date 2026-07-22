<template>
	<div>
		<model
		model_name="user"
		:model_prop="user"
		:show_btn_delete="false"></model>

		<div
		v-if="has_extra_config">
			<model
			v-for="config_model_name in extra_config"
			:key="'extra-config-'+config_model_name"
			:model_name="config_model_name"
			:show_btn_delete="false">
				<!--
					Boton "Enviar correo de prueba" del correo propio (prompt 359).
					Se muestra debajo del formulario declarativo generico solo para
					online_configuration, sin forzar el renderer generico de properties
					a soportar un boton especifico de este modelo.
				-->
				<template
				v-if="config_model_name == 'online_configuration'"
				v-slot:default="slot_props">
					<test-mail-button
					v-if="slot_props.model && slot_props.model.id"></test-mail-button>

					<!--
						Seccion "Integraciones" (prompt 600): tarjetas de Mercado Pago y Zippin,
						debajo del formulario declarativo generico, igual que TestMailButton arriba.
					-->
					<integrations
					v-if="slot_props.model && slot_props.model.id"
					:model="slot_props.model"></integrations>
				</template>
			</model>
		</div>
	</div>
</template>
<script>
export default {
	components: {
		Model: () => import('@/common-vue/components/model/Index'),
		TestMailButton: () => import('@/components/online/config/TestMailButton'),
		Integrations: () => import('@/components/online/config/integrations/Index'),
	},
	created() {
		/*
		 * Al volver del OAuth de Mercado Pago o Zippin (prompt 600), la URL trae
		 * ?mp=ok|error o ?zippin=ok|error (agregado por el backend en el redirect final
		 * de los prompts 598/599). Este componente se monta siempre (parte del nav), por
		 * lo que es el lugar correcto para detectarlo apenas carga la app, sin depender
		 * de que el usuario haya abierto manualmente el modal de Configuracion online.
		 */
		this.checkIntegrationsOauthReturn()
	},
	methods: {
		/**
		 * Detecta el retorno del OAuth de Mercado Pago/Zippin por query param, refresca
		 * el online_configuration, muestra el feedback (exito/error) al usuario, abre el
		 * formulario de Configuracion online con el estado ya actualizado, y limpia el
		 * query param de la URL sin recargar la pagina.
		 *
		 * @returns {void}
		 */
		checkIntegrationsOauthReturn() {
			// Valores devueltos por el backend al volver del proveedor OAuth ('ok' | 'error')
			let mp_status = this.$route.query.mp
			let zippin_status = this.$route.query.zippin

			if (!mp_status && !zippin_status) {
				return
			}

			// Se vuelve a pedir el online_configuration para reflejar el estado real ya guardado en la base
			this.$store.dispatch('online_configuration/getModels')
			.then(() => {
				let model = this.$store.state.online_configuration.models[0]
				if (model) {
					// Abre el formulario de Configuracion online mostrando el estado ya actualizado
					this.setModel(model, 'online_configuration')
				}

				if (mp_status == 'ok') {
					this.$toast.success('Mercado Pago conectado correctamente')
				} else if (mp_status == 'error') {
					this.$toast.error('No se pudo conectar Mercado Pago. Intenta nuevamente')
				}

				if (zippin_status == 'ok') {
					this.$toast.success('Zippin conectado correctamente')
				} else if (zippin_status == 'error') {
					this.$toast.error('No se pudo conectar Zippin. Intenta nuevamente')
				}

				this.clearIntegrationsQueryParams()
			})
			.catch(err => {
				console.log(err)
				this.clearIntegrationsQueryParams()
			})
		},
		/**
		 * Limpia los query params ?mp / ?zippin de la URL actual sin recargar la pagina,
		 * preservando cualquier otro query param que pudiera traer la ruta.
		 *
		 * @returns {void}
		 */
		clearIntegrationsQueryParams() {
			let query = Object.assign({}, this.$route.query)
			delete query.mp
			delete query.zippin
			this.$router.replace({ query }).catch(() => {})
		},
	},
}
</script>