<template>
<div>
	
	<b-sidebar
	right
	id="download-resources" 
	v-model="visibility"
	shadow>
		<h4
		@click="$store.commit('download_resources/setStartDownload')">
			Descarga de recursos
		</h4>
		<p
		v-for="model in models_to_download">
			<b-spinner
			v-if="model.downloading"
			variant="primary"></b-spinner>
			<i 
			v-else-if="model.downloaded"
			class="icon-check"></i>
			<i 
			v-else-if="!model.downloaded"
			class="icon-clock"></i>
			<span>
				{{ plural(model.model_name) }}
			</span>
		</p>    


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
		setModels() {
			call_methods.forEach(model => {
				// console.log('agregando '+model)
				if (model != 'article') {
					this.models_to_download.push({
						downloaded: false,
						downloading: false,
						model_name: typeof model == 'object' ? model.model_name : model,
						if_has_extencion: typeof model == 'object' ? model.if_has_extencion : null,
					})
				}
			})
		},
		async downloadModels() {
			let model_name
            console.log('downloadModels:')
            for (var i = 0; i < this.models_to_download.length; i++) {
            	model_name = this.models_to_download[i].model_name
            	
        		if (this.models_to_download[i].if_has_extencion) {

        			if (!this.hasExtencion(this.models_to_download[i].if_has_extencion)) {
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
	@if ($theme == 'dark') 
		background: #333 !important
	padding: 20px
	h4 	
		margin: 15px 0
	p 
		text-align: left
		display: flex 
		align-items: center 
		.spinner-border 
			width: 20px
			height: 20px
		span 
			padding-left: 10px
</style>