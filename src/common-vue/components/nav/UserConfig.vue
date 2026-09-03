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
						Las integraciones se mudaron a ABM -> Integraciones -> Tienda online, que es
						donde conviven con las del sistema (Mercado Libre, Tienda Nube) y con el bot
						de WhatsApp. Aca queda el puntero: el dueño del negocio ya venia entrando por
						esta pantalla a conectar Mercado Pago y no tiene por que enterarse solo de
						que se mudo.
					-->
					<div
					v-if="slot_props.model && slot_props.model.id"
					class="integraciones-puntero">
						<hr>
						<h5 class="m-b-5">Integraciones</h5>
						<p class="text-muted m-b-10">
							Mercado Pago y los envíos de Zippin se conectan desde ABM → Integraciones →
							Tienda online.
						</p>
						<b-button
						variant="outline-primary"
						size="sm"
						@click="irAIntegraciones">
							Ir a Integraciones
						</b-button>
					</div>
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
		ColorField: () => import('@/components/online/config/ColorField'),
		AiPaletteGenerator: () => import('@/components/online/config/AiPaletteGenerator'),
	},
	created() {
		/*
		 * Al volver del OAuth de Mercado Pago o Zippin, la URL trae ?mp=ok|error o
		 * ?zippin=ok|error (lo agrega el backend en el redirect final). Este componente se
		 * monta siempre --es parte del nav--, asi que es el unico lugar que puede atajar ese
		 * retorno caiga en la URL que caiga.
		 */
		this.checkIntegrationsOauthReturn()
	},
	methods: {
		/**
		 * Si el usuario vuelve de un OAuth de integraciones y NO cayo en la pantalla de
		 * Integraciones, lo manda ahi con la query intacta. El aviso de exito o error, y la
		 * limpieza del query param, los hace esa pantalla
		 * (components/abm/integraciones/TiendaOnline.vue), que es la que muestra el estado.
		 *
		 * Hace falta porque la URL de retorno la decide el backend por .env
		 * (MP_OAUTH_SPA_REDIRECT_URL / ZIPPIN_OAUTH_SPA_REDIRECT_URL) y puede quedar apuntando
		 * a una URL vieja en un cliente que todavia no actualizo esa variable.
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

			// Ya esta parado en Integraciones: esa pantalla se encarga del resto.
			if (this.$route.name == 'abm' && this.$route.params.view == 'integraciones') {
				return
			}

			this.$router.push({
				name: 'abm',
				params: {
					view: 'integraciones',
					sub_view: 'tienda-online',
				},
				// La query viaja tal cual: el ?mp / ?zippin lo lee y lo limpia la pantalla destino.
				query: this.$route.query,
			}).catch(() => {})
		},
		/**
		 * Lleva al usuario a ABM -> Integraciones -> Tienda online, cerrando antes el modal de
		 * Configuracion online si estaba abierto (el modal usa el model_name como id).
		 *
		 * @returns {void}
		 */
		irAIntegraciones() {
			this.$bvModal.hide('online_configuration')
			this.$router.push({
				name: 'abm',
				params: {
					view: 'integraciones',
					sub_view: 'tienda-online',
				},
			}).catch(() => {})
		},
	},
}
</script>