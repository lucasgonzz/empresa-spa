<template>
	<div>
		<div
		v-if="model && model.id && !model[prop_to_set]">
			<label 
			class="form-label">
				<i class="icon-right"></i>
				{{ text }}
			</label>
			<b-form-input
			class="m-b-15"
			@keyup.enter="searchUser"
			:placeholder="placeholder"
			v-model="prop_value"></b-form-input>
			<btn-loader
			variant="outline-primary"
			size="sm" 
			:block="false"
			@clicked="searchUser"
			:loader="loading"
			text="Buscar"></btn-loader>
		</div>
		<div
		v-else-if="model && model.id && model[prop_to_set]">
			<label 
			class="form-label">
				<i class="icon-right"></i>
				Usuario de ComercioCity
			</label>
			<p>
				<i class="icon-user"></i>
				{{ model[prop_to_set][prop_to_find_model] }}
			</p>
		</div>
		<hr> 
	</div>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
export default {
	props: {
		model: Object,
		model_name: String,
		model_name_to_attach: {
			type: String,
			default: 'user',
		},
		text: {
			type: String,
			default: 'Asignar a un usuario de ComercioCity',
		},
		prop_to_find_model: {
			type: String,
			default: 'company_name',
		},
		prop_to_set: {
			type: String,
			default: 'comercio_city_user'
		},
		placeholder: {
			type: String,
			default: `Nombre del negocio en ComercioCity`
		},
	},
	components: {
		BtnLoader,
	},
	data() {
		return {
			prop_value: '',
			loading: false
		}
	},
	methods: {
		searchUser() {
			this.loading = true 
			this.$api.post('set-comercio-city-user', {
				model_name_to_attach: this.model_name_to_attach,
				prop_to_find_model: this.prop_to_find_model,
				prop_value: this.prop_value,
				model_name: this.model_name,
				model_id: this.model.id,
			})
			.then(res => {
				this.loading = false 
				if (res.data.user_finded) {
					this.$store.commit(this.model_name+'/add', res.data.model)
					this.$toast.success('Actualizado')
					this.$bvModal.hide(this.model_name)
				} else {
					this.$toast.error('No se encontraron coincidencias')
				}
			})
			.catch(err => {
				this.loading = false 
				this.$toast.error('Error al buscar usuario')
				console.log(err)
			})
		}
	}
}
</script>