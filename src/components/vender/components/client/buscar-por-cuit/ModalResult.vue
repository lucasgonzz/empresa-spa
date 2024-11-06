<template>
	<b-modal
	:title="title"
	hide-footer
	id="afip-data-modal">
		<p
		v-for="(item, index) in props" 
		:key="index">
			{{ item.key }}: {{ item.value }}
		</p>	
		<hr>
		<div
		v-if="client_model">
			<p>
				Nombre en el sistema: {{ client_model.name }}
			</p>
			<p>
				Saldo: {{ price(client_model.saldo) }}
			</p>

			<b-button
			block
			@click="useClient"
			variant="primary">
				Usar cliente para la venta
			</b-button>
		</div>
		<btn-loader
		v-else
		:loader="loading"
		text="Crear cliente y usar para esta venta"
		@clicked="setCreateClient"></btn-loader>
	</b-modal>
</template>
<script>
import vender from '@/mixins/vender'
export default {
	mixins: [vender],
	props: {
		title: String,
		afip_data: Object,
		client_model: Object,
	},
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	computed: {
		props() {
			if (this.afip_data) {
				return Object.entries(this.afip_data).map(([key, value]) => ({ key, value }));
			}
		},
	},
	data() {
		return {
			loading: false,
		}
	},
	methods: {
		async setCreateClient() {
			this.loading = true
			console.log('setCreateClient')
			let location_id = await this.getLocalidad()

			console.log('sigue con properties_to_override')
			let properties_to_override = [
				{
					key: 'name',
					value: this.afip_data.nombre+' '+this.afip_data.apellido,
				},
				{
					key: 'address',
					value: this.afip_data.direccion,
				},
				{
					key: 'cuit',
					value: this.afip_data.cuit,
				},
				{
					key: 'location_id',
					value: location_id,
				},
				{
					key: 'iva_condition_id',
					value: 1,
				},
			]

			console.log('properties_to_override:')
			console.log(properties_to_override)

			this.cerrar()

			this.setModel(null, 'client', properties_to_override, true, false)
			this.loading = false
		},
		getLocalidad() {

			console.log('getLocalidad')

			let localidad = this.$store.state.location.models.find(location => {
				return location.name == this.afip_data.localidad
			})
			if (typeof localidad != 'undefined') {
				return localidad.id
			} else {

				console.log('no habia localidad, por crearla')
				return new Promise((resolve, reject) => {

					this.$api.post('location', {
						'name': this.afip_data.localidad
					})
					.then(res => {
						console.log('se creo la localidad:')
						console.log(res.data.model)
						this.$store.commit('location/add', res.data.model)
						resolve(res.data.model.id)
					})
					.catch(err => {
						console.log(err)
					})

				})

			}
		},
		useClient() {
			this.$store.commit('vender/setClient', this.client_model)
			this.setPriceType()
			this.cerrar()
		},
		cerrar() {
			this.$bvModal.hide('afip-data-modal')
			document.getElementById('cuit-para-buscar').value = ''
		}
	}
}
</script>