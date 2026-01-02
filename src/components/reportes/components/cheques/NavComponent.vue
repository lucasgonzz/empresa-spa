<template>
	<b-row>
		<b-col
		v-if="!filtro_activo">
			<horizontal-nav
			set_sub_view
			:show_display="false"
			:items="items"></horizontal-nav>

			<horizontal-nav
			set_sub_sub_view
			:show_display="false"
			:items="sub_items"></horizontal-nav>
		</b-col>

		<b-col
		v-else>
			
			<nav-filtrados></nav-filtrados>
		</b-col>
	</b-row>
</template>
<script>
export default {
	components: {
		HorizontalNav: () => import('@/common-vue/components/horizontal-nav/Index'),
		NavFiltrados: () => import('@/components/reportes/components/cheques/NavFiltrados'),
	},
	data() {
		return {
			selected_item: {name: 'Recibidos'},
		}
	},
	computed: {
		filtro_activo() {
			return this.$store.state.cheque.filtered.length
		},
		cheques() {
			return this.$store.state.cheque.models 
		},
		items() {
			let items = [
				{
					name: 'Recibido',
				},
				{
					name: 'Emitido',
				},
			]
			
			return items 
		},
		sub_items() {
			if (this.sub_view == 'recibido') {
				return [
					{
						name: 'Pendientes',
						alert: this.cheques.recibido.pendientes.length,
					},

					{
						name: 'Disponibles para cobrar',
						alert: this.cheques.recibido.disponibles_para_cobrar.length,
					},

					{
						name: 'Pronto a vencerse',
						alert: this.cheques.recibido.pronto_a_vencerse.length,
					},

					{
						name: 'Vencidos',
						alert: this.cheques.recibido.vencidos.length,
					},

					{
						name: 'Cobrados',
						alert: this.cheques.recibido.cobrados.length,
					},

					{
						name: 'Rechazados',
						alert: this.cheques.recibido.rechazados.length,
					},

					{
						name: 'Endosados',
						alert: this.cheques.recibido.endosados.length,
					},

				]
			} else {
				return [
					{
						name: 'Pendientes',
						alert: this.cheques.emitido.pendientes.length,
					},

					{
						name: 'Disponibles para cobrar',
						alert: this.cheques.emitido.disponibles_para_cobrar.length,
					},

					{
						name: 'Cobrados',
						alert: this.cheques.emitido.cobrados.length,
					},

					{
						name: 'Rechazados',
						alert: this.cheques.emitido.rechazados.length,
					},

				]
			}	
		},
	},
	methods: {
		setSelected(item) {
			console.log(item)
			this.selected_item = item
			return
			if (item.name == 'graficos') {
				console.log('sobree escibiendo sub_view con ingresos')
				this.$router.push({params: {sub_view: 'ingresos'}})
			}
		},
	}
}
</script>