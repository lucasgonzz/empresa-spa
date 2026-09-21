<template>
	<div>
		<cheques-index></cheques-index>

		<!--
			El modal del cheque (lo abre el click en una fila de la tabla). Reportes.vue conserva
			el suyo porque el drill-down de Flujo de Caja también abre cheques desde ahí.
		-->
		<model-index model_name="cheque"></model-index>
	</div>
</template>
<script>
/*
	Misión cheques-endoso-y-bancos (21/9/2026): el módulo de Cheques sale de Reportes y pasa a
	ser un submódulo de Tesorería (debajo de Gastos), con ruta propia
	/cheques/:sub_view?/:sub_sub_view?. El permiso sigue siendo `reportes.cheques` (decisión 3
	del plan): quien ya lo tenía lo ve en el lugar nuevo sin tocar nada.

	El store de cheques se llena desde acá y no por `setRoute` del menú (la ruta no lleva
	model_name a propósito): GET cheque no devuelve una lista sino los cheques agrupados por
	tipo y estado, y ese es el único formato que el módulo sabe dibujar.
*/
export default {
	components: {
		ChequesIndex: () => import('@/components/cheques/Index'),
		ModelIndex: () => import('@/common-vue/components/model/Index'),
	},
	created() {
		this.$store.dispatch('cheque/getModels')

		this.completar_solapas()
	},
	watch: {
		/*
			Si se llega a /cheques a secas estando ya en la vista (por ejemplo desde el menú, que
			manda los params por defecto, pero también por un favorito viejo), las solapas se
			completan igual.
		*/
		'$route.params'() {
			this.completar_solapas()
		},
	},
	methods: {
		/**
		 * Deja la ruta siempre con las dos solapas cargadas: sin ellas NavComponent y list/Index no
		 * tienen qué mostrar. Es un replace y no un push para no dejar en el historial una entrada
		 * sin solapas a la que "volver".
		 *
		 * @returns {void}
		 */
		completar_solapas() {
			if (this.sub_view && this.sub_sub_view) {
				return
			}

			// El catch vacío es el mismo de App.vue: vue-router 3 rechaza la promesa si la
			// navegación se pisa con otra, y acá no hay nada que hacer con eso.
			this.$router.replace({
				name: 'cheque',
				params: {
					sub_view: this.sub_view || 'recibido',
					sub_sub_view: this.sub_sub_view || 'pendientes',
				},
			}).catch(() => {})
		},
	},
}
</script>
