<template>
	<b-modal
	title="Pendientes recurrentes"	
	hide-footer	
	size="lg"
	@show="on_show"
	@hide="on_hide"
	id="pendings-recurrentes">
		<list
		:recurrentes="recurrentes"
		:loading="loading"></list>
	</b-modal>
</template>
<script>
export default {
	components: {
		List: () => import('@/components/pendings/modals/pendings/recurrentes/List'),
	},
	data() {
		return {
			recurrentes: [],
			loading: false,
		}
	},
	methods: {
		on_show() {
			this.$store.commit('pending/set_modal_recurrente_abierto', true)
			this.get_recurrentes()
		},
		on_hide() {
			this.$store.commit('pending/set_modal_recurrente_abierto', false)
		},
		get_recurrentes() {
			this.loading = true
			
			this.$api.get('pending-recurrentes')
			.then(res => {
				this.loading = false
				this.recurrentes = res.data.models 
			})
			.catch(err => {
				this.loading = false
				console.log(err)
			})
		}
	}
}
</script>
