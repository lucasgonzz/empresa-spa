<template>
<div>
	
	<b-sidebar
	right
	no-header
	width="360px"
	id="download-resources"
	v-model="visibility"
	shadow>
		<template v-slot:default="{ hide }">
			<div class="recursos-panel">

				<div class="recursos-panel__header">

					<div class="recursos-panel__titulo-linea">
						<h4 class="recursos-panel__titulo">
							Recursos
						</h4>
						<button
						type="button"
						class="recursos-panel__cerrar"
						@click="hide">
							<i class="icon-cancel"></i>
						</button>
					</div>

					<p class="recursos-panel__subtitulo">
						{{ subtitulo }}
					</p>

					<div class="recursos-panel__barra">
						<div
						class="recursos-panel__barra-relleno"
						:style="{ width: porcentaje_descargado + '%' }"></div>
					</div>

				</div>

				<div class="recursos-panel__lista">
					<div
					class="recursos-panel__fila"
					:class="clase_fila(model)"
					v-for="model in models_to_download"
					:key="model.model_name">
						<span class="recursos-panel__estado">
							<b-spinner
							v-if="model.downloading"></b-spinner>
							<i
							v-else-if="model.downloaded"
							class="icon-check"></i>
							<span
							v-else
							class="recursos-panel__punto"></span>
						</span>
						<span class="recursos-panel__nombre">
							{{ plural(model.model_name) }}
						</span>
					</div>
				</div>

				<div class="recursos-panel__pie">
					<button
					type="button"
					class="recursos-panel__redescargar"
					@click="$store.commit('download_resources/setStartDownload')">
						Volver a descargar
					</button>
				</div>

			</div>
		</template>
	</b-sidebar>

	<recursos-progress
	:models_to_download="models_to_download"></recursos-progress>
</div>
</template>
<script>
import call_methods from '@/mixins/call_methods'
import { mark_dynamic_dependency_ready } from '@/common-vue/helpers/dynamic_column_dependencies_status'
import { reconcile_article_dynamic_columns_if_needed } from '@/common-vue/helpers/column_preferences_helper'
export default {
	mixins: [call_methods],
	components: {
		RecursosProgress: () => import('@/common-vue/components/download-resources/Progress'),
	},
	computed: {
		visibility: {
			get() {
				if (this.testing_dusk) {
					return false
				}
				return this.$store.state.download_resources.visibility
			},
			set(value) {
				// this.$store.commit('download_resources/setVisibility')
			}
		},
		start_download() {
			return this.$store.state.download_resources.start_download
		},
		// Cantidad de recursos que ya terminaron de descargar. La lista ya viene
		// filtrada desde setModels(), asi que alcanza con contar.
		descargados_count() {
			return this.models_to_download.filter(model => model.downloaded).length
		},
		// Indica si ya terminaron de bajar todos los recursos de la lista.
		todo_listo() {
			return this.models_to_download.length > 0 && this.descargados_count == this.models_to_download.length
		},
		// Porcentaje de avance para la barra de progreso del header.
		porcentaje_descargado() {
			if (!this.models_to_download.length) {
				return 0
			}
			return Math.round(this.descargados_count * 100 / this.models_to_download.length)
		},
		// Texto de estado que se muestra debajo del titulo "Recursos".
		subtitulo() {
			if (this.todo_listo) {
				return 'Todo listo'
			}
			return this.descargados_count + ' de ' + this.models_to_download.length + ' listos'
		},
	},
	created() {
		setTimeout(() => {
			this.setModels()
			this.downloadModels()
		}, 1000)
	},
	watch: {
		start_download() {
			console.log('watch de start_download')
			this.setModels()
			this.downloadModels()
		}
	},
	data() {
		return {
			models_to_download: [],
		}
	},
	methods: {
		/**
		 * Clase de la fila segun en que estado esta ese recurso.
		 *
		 * @param {object} model
		 * @returns {string}
		 */
		clase_fila(model) {
			if (model.downloading) {
				return 'recursos-panel__fila--descargando'
			}
			if (model.downloaded) {
				return 'recursos-panel__fila--listo'
			}
			return 'recursos-panel__fila--pendiente'
		},
		setModels() {
			// Se vacia la lista antes de armarla porque setModels() tambien se llama cuando cambia
			// start_download (el boton de volver a descargar). Sin este reset los recursos quedaban
			// duplicados y el porcentaje de la tarjeta de progreso se calculaba sobre el doble.
			this.models_to_download = []

			call_methods.forEach(model => {

				let model_name = typeof model == 'object' ? model.model_name : model
				let if_has_extencion = typeof model == 'object' ? model.if_has_extencion : null

				if (model_name == 'article') {
					return
				}

				// No entran a la lista los recursos que esta sesion no va a descargar: los que
				// dependen de una extencion que el comercio no tiene contratada, y los que estan
				// marcados para no bajarse en celular. Antes se agregaban igual y se quedaban para
				// siempre con el icono de reloj, como si la descarga hubiera quedado colgada.
				if (if_has_extencion && !this.hasExtencion(if_has_extencion)) {
					return
				}

				// El orden importa: downloadOnMobile() accede a this.$store.state[model_name] sin
				// guarda, asi que solo se evalua cuando de verdad estamos en celular.
				if (this.is_mobile && !this.downloadOnMobile(model_name)) {
					return
				}

				this.models_to_download.push({
					downloaded: false,
					downloading: false,
					model_name: model_name,
					if_has_extencion: if_has_extencion,
				})
			})
		},
		async downloadModels() {
			let model_name
            console.log('downloadModels:')
            for (var i = 0; i < this.models_to_download.length; i++) {
            	model_name = this.models_to_download[i].model_name
            	
        		if (this.models_to_download[i].if_has_extencion) {

        			if (!this.hasExtencion(this.models_to_download[i].if_has_extencion)) {
						// Desde este prompt la lista ya viene filtrada desde setModels(), asi que aca
						// nunca deberia entrar. Se deja como guarda / ultima linea de defensa.
        				continue
        			}
        		}



            	if ((!this.is_mobile || this.downloadOnMobile(model_name)) && (model_name != 'article' || this.download_articles)) {
            		if (this.yaSeDescargaron(model_name)) {
						this.models_to_download[i].downloaded = true
						// Marca la dependencia como lista si ya estaba descargada de antes (ver
						// dynamic_column_dependencies_status.js). Ignora sin romper nada los
						// model_name que no son dependencia de columnas dinamicas de article.
						mark_dynamic_dependency_ready(model_name)
            		} else {
						this.models_to_download[i].downloading = true
		                await this.$store.dispatch(model_name+'/getModels')
						if (model_name === 'table_column_preference') {
							this.$store.dispatch('table_column_preference/bootstrap_module_preferences')
						}
						// Marca la dependencia como lista recien despues de terminar de descargarla.
						mark_dynamic_dependency_ready(model_name)
						this.models_to_download[i].downloading = false
						this.models_to_download[i].downloaded = true
            		}
            	}

            }

            // Reconciliación: ahora que las 3 colecciones dinámicas (address, price_type,
            // current_acount_payment_method_discount) terminaron de descargar en paralelo,
            // sana un props_to_show de article que haya quedado corto (por la guarda del
            // prompt 460, o por staleness de una preferencia guardada antes de que exista
            // una sucursal nueva). Ver reconcile_article_dynamic_columns_if_needed.
            reconcile_article_dynamic_columns_if_needed(this.$store)
		},
		/**
		 * Indica si un recurso ya está en store y no hace falta volver a pedirlo al inicio.
		 *
		 * @param {string} model_name
		 * @returns {boolean}
		 */
		yaSeDescargaron(model_name) {
			if (model_name === 'pdf_column_profile') {
				return this.$store.state.pdf_column_profile.all_profiles_loaded
			}
			return this.$store.state[model_name].models.length
		}
	},
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'

#download-resources
	// El header propio reemplaza al header por defecto de b-sidebar (por eso no-header),
	// asi que el body arranca pegado al borde de arriba y el padding lo pone cada bloque.
	.b-sidebar-body
		padding: 0
		overflow-x: hidden

	.recursos-panel
		display: flex
		flex-direction: column
		min-height: 100%
		background: #FFF
		color: #1d1d1f
		text-align: left

		// La regla global de _inputs.sass le pone box-shadow a input, button, textarea y select.
		// Adentro del panel no queremos ningun relieve.
		button
			box-shadow: none

	.recursos-panel__header
		position: sticky
		top: 0
		z-index: 2
		background: rgba(255, 255, 255, .88)
		backdrop-filter: saturate(180%) blur(20px)
		-webkit-backdrop-filter: saturate(180%) blur(20px)
		padding: 18px 20px 0 20px
		box-shadow: inset 0 -1px 0 rgba(0, 0, 0, .06)

	.recursos-panel__titulo-linea
		display: flex
		flex-direction: row
		justify-content: space-between
		align-items: center

	.recursos-panel__titulo
		margin: 0
		font-size: 21px
		font-weight: 600
		letter-spacing: -0.02em
		color: #1d1d1f

	.recursos-panel__cerrar
		border: 0
		background: rgba(0, 0, 0, .04)
		color: rgba(0, 0, 0, .5)
		width: 28px
		height: 28px
		border-radius: 50%
		display: flex
		align-items: center
		justify-content: center
		font-size: 13px
		padding: 0
		transition: background .15s ease, color .15s ease

		&:hover
			background: rgba(0, 0, 0, .08)
			color: rgba(0, 0, 0, .75)

	.recursos-panel__subtitulo
		margin: 2px 0 12px 0
		font-size: 13px
		color: rgba(0, 0, 0, .45)

	.recursos-panel__barra
		height: 3px
		border-radius: 999px
		background: rgba(0, 0, 0, .07)
		overflow: hidden
		margin-bottom: 14px

	.recursos-panel__barra-relleno
		height: 100%
		border-radius: 999px
		background: $blue
		transition: width .4s cubic-bezier(.22, .61, .36, 1)

	.recursos-panel__lista
		flex: 1 1 auto
		padding: 4px 8px 8px 8px

	.recursos-panel__fila
		display: flex
		flex-direction: row
		align-items: center
		gap: 10px
		padding: 8px 12px
		border-radius: 8px
		font-size: 14px
		line-height: 1.2
		transition: background .15s ease, color .2s ease

		&:hover
			background: rgba(0, 0, 0, .03)

	.recursos-panel__fila--pendiente
		color: rgba(0, 0, 0, .38)

	.recursos-panel__fila--descargando
		color: #1d1d1f
		font-weight: 500

	.recursos-panel__fila--listo
		color: rgba(0, 0, 0, .8)

	.recursos-panel__estado
		flex: 0 0 18px
		width: 18px
		height: 18px
		display: flex
		align-items: center
		justify-content: center

		.spinner-border
			width: 14px
			height: 14px
			border-width: 2px
			color: $blue

		.icon-check
			font-size: 13px
			color: $blue
			// Aparece con un escalado corto cuando el recurso termina de bajar. Es el unico
			// momento animado de la fila: el resto se mantiene quieto a proposito.
			animation: recursos-check-in .28s cubic-bezier(.22, .61, .36, 1)

	.recursos-panel__punto
		width: 6px
		height: 6px
		border-radius: 50%
		background: rgba(0, 0, 0, .18)

	.recursos-panel__nombre
		flex: 1 1 auto
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap

	.recursos-panel__pie
		position: sticky
		bottom: 0
		background: rgba(255, 255, 255, .88)
		backdrop-filter: saturate(180%) blur(20px)
		-webkit-backdrop-filter: saturate(180%) blur(20px)
		box-shadow: inset 0 1px 0 rgba(0, 0, 0, .06)
		padding: 10px 20px

	.recursos-panel__redescargar
		border: 0
		background: transparent
		padding: 0
		font-size: 13px
		color: $blue
		transition: opacity .15s ease

		&:hover
			opacity: .65

@keyframes recursos-check-in
	from
		opacity: 0
		transform: scale(.6)
	to
		opacity: 1
		transform: scale(1)

@if ($theme == 'dark')
	#download-resources
		.recursos-panel
			background: #1d1d1d
			color: rgba(255, 255, 255, .92)

		.recursos-panel__header, .recursos-panel__pie
			background: rgba(29, 29, 29, .88)

		.recursos-panel__titulo
			color: rgba(255, 255, 255, .95)

		.recursos-panel__subtitulo
			color: rgba(255, 255, 255, .5)

		.recursos-panel__fila--pendiente
			color: rgba(255, 255, 255, .4)

		.recursos-panel__fila--descargando, .recursos-panel__fila--listo
			color: rgba(255, 255, 255, .92)

		.recursos-panel__fila:hover
			background: rgba(255, 255, 255, .06)

		.recursos-panel__punto
			background: rgba(255, 255, 255, .22)
</style>
