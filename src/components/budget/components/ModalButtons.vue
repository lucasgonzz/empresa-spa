<template>
	<div>
		<btn-loader
		v-if="show_btn_produccion"
		variant="outline-primary"
		:loader="loading"
		text="Crear orden de produccion"
		@clicked="createOrderProduction" />
		<b-button-group
		v-if="model.id"
		class="m-t-15 w-100">
			<b-button
			@click="printWithoutPrices"
			variant="danger">
				<i class="icon-print"></i>
				Sin precios
			</b-button>
			<b-button
			@click="printWithPrices"
			variant="outline-danger">
				<i class="icon-print"></i>
				Con precios
			</b-button>
			<b-button
			@click="printWithImages"
			variant="danger">
				<i class="icon-print"></i>
				Con Imagenes
			</b-button>
		</b-button-group>
		<hr>
	</div>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
export default {
	components: {
		BtnLoader,
	},
	computed: {
		model_name() {
			return 'budget'
		},
		model() {
			return this.$store.state[this.model_name].model
		},
		show_btn_produccion() {
			if (
				this.model.budget_status 
				&& this.model.budget_status.name == 'Confirmado' 
				&& !this.model.order_production
				&& this.hasExtencion('production')
			) {
				return true
			}
			return false
		},
	},
	data() {
		return {
			loading: false,
		}
	},
	methods: {
		createOrderProduction() {
			this.loading = true 
			this.$api.post('order-production', {
				...this.model,
				order_production_status_id: this.$store.state.order_production_status.models[0].id,
				finished: 0,
				budget_id: this.model.id
			})
			.then(res => {
				this.loading = false 
				this.$toast.success('Orden de Produccion creada')
				this.$bvModal.hide('budget')
				this.$store.commit('order_production/add', res.data.model)
				this.$router.push({name: 'produccion', params: {view: 'ordenes'}})
			})
			.catch(err => {
				this.loading = false 
				console.log(err)
				this.$toast.error('Error al crear Orden de Produccion')
			})
		},
		printWithoutPrices() {
            var link = process.env.VUE_APP_API_URL+'/budget/pdf/'+this.model.id+'/0/0'
            window.open(link)
		},
		printWithPrices() {
            var link = process.env.VUE_APP_API_URL+'/budget/pdf/'+this.model.id+'/1/0'
            window.open(link)
		},
		printWithImages() {
            var link = process.env.VUE_APP_API_URL+'/budget/pdf/'+this.model.id+'/1/1'
            window.open(link)
		},
	}
}
</script>