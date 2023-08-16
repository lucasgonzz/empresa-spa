<template>
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
</template>
<script>
import call_methods from '@/mixins/call_methods'
export default {
	mixins: [call_methods],
	computed: {
		visibility: {
			get() {
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
				this.models_to_download.push({
					downloaded: false,
					downloading: false,
					model_name: model,
				})
			})
		},
		async downloadModels() {
			let model_name
            for (var i = 0; i < this.models_to_download.length; i++) {
            	model_name = this.models_to_download[i].model_name
            	if ((!this.is_mobile || this.downloadOnMobile(model_name)) && (model_name != 'article' || this.downloadArticles())) {
            		if (this.yaSeDescargaron(model_name)) {
						this.models_to_download[i].downloaded = true
            		} else {
						this.models_to_download[i].downloading = true
		                await this.$store.dispatch(model_name+'/getModels')
						this.models_to_download[i].downloading = false
						this.models_to_download[i].downloaded = true
            		}
            	}
            }
		},
		yaSeDescargaron(model_name) {
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