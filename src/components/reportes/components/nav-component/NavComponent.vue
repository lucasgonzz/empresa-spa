<template>
	<horizontal-nav
	@setSelected="setSelected"
	set_view
	:show_display="false"
	:items="items"></horizontal-nav>
</template>
<script>
import article_performance from '@/mixins/article_performance'
export default {
	mixins: [article_performance],
	name: 'NavComponentOnline',
	components: {
		HorizontalNav: () => import('@/common-vue/components/horizontal-nav/Index'),
	},
	computed: {
		items() {
			let items = []

			/* La seccion "Generales" (tarjetas sueltas) se elimina (decision de Lucas, 4/7/2026):
			   queda reemplazada por estas 3 secciones contables nuevas del grupo 227. Se reutiliza
			   el mismo permiso 'reportes.cards' que ya gateaba Generales, para no depender de
			   abilities nuevas que este prompt (UI-only) no crea en el backend. `route_value` evita
			   que el acento de "Posición" termine en el parametro de ruta (routeString no le quita
			   tildes al texto). */
			if (this.can('reportes.cards')) {

				items.push({
					name: 'Estado de Resultados',
					route_value: 'estado-de-resultados',
				})

				items.push({
					name: 'Flujo de Caja',
					route_value: 'flujo-de-caja',
				})

				items.push({
					name: 'Posición Fiscal',
					route_value: 'posicion-fiscal',
				})
			}

			if (this.can('reportes.articulos')) {

				items.push({
					name: 'articulos',
				})
			}

			if (this.can('reportes.graficos')) {

				items.push({
					name: 'graficos',
				})
			}

			if (this.can('reportes.cheques')) {

				items.push({
					name: 'cheques',
				})
			}

			return items
		},
		loading() {
			return this.$store.state.panel_control.loading
		},
	},
	watch: {
		loading() {
			console.log('watch loading: '+this.loading)
			if (!this.loading) {
				this.setProvidersFormated()
			}
		},
	},
	methods: {
		setSelected(item) {
			if (item.name == 'graficos') {
				console.log('sobree escibiendo sub_view con ingresos')
				this.$router.push({params: {sub_view: 'ingresos'}})
			}
			if (item.name == 'proveedores') {
				this.$store.dispatch('panel_control/getModels', 12)
			}
			if (item.name == 'cheques') {
				this.$store.dispatch('cheque/getModels')
				this.$router.push({params: {sub_view: 'recibido', sub_sub_view: 'pendientes'}})
			}
		},
	}
}
</script>