<template>
	<div>
		
		<modal-result
		:title="modal_title"
		:afip_data="afip_data"
		:client_model="client_model"></modal-result>

		<div 
		v-if="index_previus_sales == 0 && !budget"
		class="buscar-por-cuit m-b-15">
			<div class="cont-search">
				<div 
				class="bg-withe icon">
					<i class="icon-search"></i>
				</div>
				<b-form-input
				class="input-search"
				id="cuit-para-buscar"
				v-model="cuit"
				@keyup.enter="search"
				placeholder="Buscar por CUIT"></b-form-input>
			</div>
		</div>
	</div>
</template>
<script>
import vender from '@/mixins/vender'
export default {
	mixins: [vender],
	components: {
		ModalResult: () => import('@/components/vender/components/client/buscar-por-cuit/ModalResult'),
	},
	data() {
		return {
			cuit: '',
			client_model: null,
			modal_title: '',
			afip_data: null,
		}
	},
	methods: {
		search() {
			this.$store.commit('auth/setMessage', 'Consultando a AFIP')
			this.$store.commit('auth/setLoading', true)
			this.$api.get('client/get-afip-information-by-cuit/'+this.cuit)
			.then(res => {
				this.$store.commit('auth/setLoading', false)
				let data = res.data 
				if (data.hubo_un_error) {
					this.$toast.error('Afip dice: '+data.error, {
						duration: 7000
					})
					this.afip_data = null
					this.client_model = null
				} else {
					this.afip_data = data.afip_data
					if (data.client_model) {
						this.modal_title = 'Cliente ya existente en el sistema'
						this.client_model = data.client_model 
					} else {
						this.modal_title = 'Resultados (cliente no registrado en sistema)'
						this.client_model = null 
					}
					this.$bvModal.show('afip-data-modal')
				}
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
				console.log(err)
				this.$toast.error('Error al buscar')
			})
		}
	}
}
</script>
<style lang="sass">
.buscar-por-cuit
	display: flex 
	flex-direction: row 
	justify-content: flex-end
	.cont-search
		width: 300px
</style>