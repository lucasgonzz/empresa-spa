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

				<!--
					Selectores de color reales para la pestaña "Diseño" (grupo 202, prompt 03).
					Cada uno reemplaza el input de texto plano de su color correspondiente
					mediante el slot por propiedad que ModelForm.vue ya expone
					(<slot :name="prop.key">). El "model" que llega en el slot es el mismo
					online_configuration del formulario, gracias al fix de model/Index.vue.
				-->
				<template
				v-if="config_model_name == 'online_configuration'"
				v-slot:primary_color="slot_props">
					<color-field
					v-if="slot_props.model"
					:prop="{ key: 'primary_color' }"
					:model="slot_props.model"></color-field>
				</template>

				<template
				v-if="config_model_name == 'online_configuration'"
				v-slot:secondary_color="slot_props">
					<color-field
					v-if="slot_props.model"
					:prop="{ key: 'secondary_color' }"
					:model="slot_props.model"></color-field>
				</template>

				<template
				v-if="config_model_name == 'online_configuration'"
				v-slot:text_color="slot_props">
					<color-field
					v-if="slot_props.model"
					:prop="{ key: 'text_color' }"
					:model="slot_props.model"></color-field>
				</template>

				<template
				v-if="config_model_name == 'online_configuration'"
				v-slot:hover_text_color="slot_props">
					<color-field
					v-if="slot_props.model"
					:prop="{ key: 'hover_text_color' }"
					:model="slot_props.model"></color-field>
				</template>

				<template
				v-if="config_model_name == 'online_configuration'"
				v-slot:background_color="slot_props">
					<color-field
					v-if="slot_props.model"
					:prop="{ key: 'background_color' }"
					:model="slot_props.model"></color-field>
				</template>

				<!--
					Generador de paleta con IA (grupo 202, prompt 03): se monta en el slot de
					la propiedad virtual "ai_palette_generator" (ver
					src/models/online_configuration.js), que existe solo para reservar un lugar
					dentro de la pestaña "Diseño". No es una columna real, el backend la ignora.
				-->
				<template
				v-if="config_model_name == 'online_configuration'"
				v-slot:ai_palette_generator="slot_props">
					<ai-palette-generator
					v-if="slot_props.model"
					:model="slot_props.model"></ai-palette-generator>
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
		ColorField: () => import('@/components/online/config/ColorField'),
		AiPaletteGenerator: () => import('@/components/online/config/AiPaletteGenerator'),
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