<template>
	<b-col 
	v-if="hasExtencion('providers')"
	md="6">
		<b-form-group
		label="Proveedor">
			<b-form-select
			id="article-provider"
			v-model="article.provider_id"
			:options="getOptions({key: 'provider_id', text: 'Proveedor'})"></b-form-select>
		</b-form-group>
		<b-form-group
		v-if="provider_price_lists.length"
		label="Lista de precios">
			<b-form-select
			id="article-provider-price-list"
			v-model="article.provider_price_list_id"
			:options="options_provider_price_lists"></b-form-select>
		</b-form-group>
		<!-- <b-form-group
		v-if="show_checkboxs && article.provider_id != 0">
			<b-form-checkbox
			:disabled="article.provider_id == 0"
			v-model="article.save_provider"
	        :value="1"
	        :unchecked-value="0"
			id="article-not-provider">
				Guardar compra al proveedor
			</b-form-checkbox>
		</b-form-group> -->
		<b-form-checkbox
		v-if="percentage_gain"
		v-model="article.apply_provider_percentage_gain"
        :value="1"
        :unchecked-value="0">
			Aplicar porcentaje de ganancia ({{ percentage_gain }}%)
		</b-form-checkbox>
	</b-col>
</template>
<script>
import ingresar from '@/mixins/ingresar'
export default {
	mixins: [ingresar],
	name: 'Provider',
	props: ['article', 'show_checkboxs'],
	computed: {
		percentage_gain() {
			if (this.provider_price_list) {
				return this.provider_price_list.percentage
			} else if (this.selectedProvider(this.article) && this.selectedProvider(this.article).percentage_gain) {
				return this.selectedProvider(this.article).percentage_gain
			}
			return null 
		},
		provider_price_list() {
			let provider_price_list = this.provider_price_lists.find(model => {
				return model.id == this.article.provider_price_list_id 
			})
			if (typeof provider_price_list != 'undefined') {
				return provider_price_list
			}
			return null
		},
		provider_price_lists() {
			if (this.article.provider_id) {
				let provider = this.modelsStoreFromName('provider').find(model => {
					return model.id == this.article.provider_id
				})
				if (typeof provider != 'undefined') {
					if (provider.provider_price_lists.length && provider.provider_price_lists[0].percentage) {
						return provider.provider_price_lists
					}
				}
			}
			return []
		},
		options_provider_price_lists() {
			let options = []
			options.push({
				value: 0, text: 'Seleccione Lista de precios'
			})
			this.provider_price_lists.forEach(item => {
				options.push({value: item.id, text: item.name+' '+item.percentage+'%'})
			})
			return options
		},
	}
}
</script>
