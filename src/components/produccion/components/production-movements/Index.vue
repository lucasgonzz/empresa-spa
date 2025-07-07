<template>
	<div
	v-if="view == 'movimientos'">
		<current-amounts></current-amounts>

		<view-component 
		model_name="production_movement"
		:show_btn_delete="show_btn_delete"
		show_filter_modal
		order_list_by="order_production_status"
		change_from_dates_option
		:show_previus_days="$store.state.production_movement.from_dates"
		show_previus_days>
			<!-- <template #horizontal_nav_center>
				<b-button
				class="m-l-15 m-t-15"
				v-b-modal="'current-amounts'"
				variant="primary">
					<i class="icon-eye"></i>
					Cantidades actuales
				</b-button>
			</template> -->

			<template #order_production_status_id="props">
				<select-order-production-status></select-order-production-status>
			</template>

			<template #amount="props">
				<input-amount></input-amount>
			</template>
		</view-component>
	</div>
</template>
<script>
export default {
	components: {
		CurrentAmounts: () => import('@/components/produccion/modals/production-movements/CurrentAmounts'),
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		SelectOrderProductionStatus: () => import('@/components/produccion/components/production-movements/SelectOrderProductionStatus'),
		InputAmount: () => import('@/components/produccion/components/production-movements/InputAmount'),
	},
	computed: {
		model() {
			return this.$store.state.production_movement.model 
		},
	},
	watch: {
		model() {
			this.set_show_btn_delete()
		}
	},
	data() {
		return {
			show_btn_delete: false,
		}
	},
	methods: {
		set_show_btn_delete() {
			if (this.model.id && this.model.article_id) {
				
				this.show_btn_delete = false

				console.log('enviando show_btn_delete')
				this.$api.get('production-movement/es-el-ultimo-creado/'+this.model.id+'/'+this.model.article_id)
				.then(res => {
					console.log('llego show_btn_delete')
					console.log(res.data.es_el_ultimo)
					this.show_btn_delete = res.data.es_el_ultimo
				})
				.catch(err => {
					this.show_btn_delete = false
					console.log(err)
				})
			}
		}
	}
}
</script>