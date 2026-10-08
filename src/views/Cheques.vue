<template>
	<div>
		<cheques-index></cheques-index>

		<!--
			El modal del cheque (lo abre el click en una fila de la tabla). Reportes.vue conserva
			el suyo porque el drill-down de Flujo de Caja también abre cheques desde ahí.

			Misión cheque-edicion-acotada (8/10/2026): después de guardar se recarga la lista
			agrupada (`cheque/getModels`). El store de cheques no es una lista plana, así que no
			sirve la actualización puntual del modal (ver la mutación `add` de store/cheque.js), y
			la recarga hace que un cheque con otra fecha de pago aparezca en la solapa que le toca.
		-->
		<model-index
		model_name="cheque"
		:actions_after_save="['cheque/getModels']"></model-index>
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

	Misión cheques-solapa-endosados (2/10/2026): la ruta pasó a ser
	/cheques/:sub_view?/:sub_sub_view? con sub_view = recibido | emitido | endosado. Endosado es
	una sola lista y NO lleva sub_sub_view. Qué combinaciones son válidas y a cuál se normaliza
	cada una vive en components/cheques/solapas.js (`ruta_normalizada`), para que esta vista, las
	pestañas y la tabla no tengan tres versiones de la misma regla.
*/
import { ruta_normalizada } from '@/components/cheques/solapas'

export default {
	components: {
		ChequesIndex: () => import('@/components/cheques/Index'),
		ModelIndex: () => import('@/common-vue/components/model/Index'),
	},
	created() {
		// El store de cheques sobrevive a la navegación: si en una visita anterior quedó un
		// filtro u orden puesto, se descarta (components/cheques/Index.vue ya lo limpia al irse
		// del módulo; esto cubre cualquier otro camino por el que se llegue con restos).
		this.$store.dispatch('cheque/reiniciar_busqueda_de_columnas')

		this.$store.dispatch('cheque/getModels')

		this.completar_solapas()
	},
	watch: {
		/*
			Si se llega a /cheques a secas estando ya en la vista (por ejemplo desde el menú, que
			manda los params por defecto, pero también por un favorito viejo), las solapas se
			completan igual.

			También corrige lo que deja HorizontalNav al cambiar de solapa: hace un `$router.push`
			RELATIVO y vue-router lo mezcla con los params actuales, así que el `sub_sub_view`
			anterior se conserva (de Recibido/Pendientes a Endosado queda /cheques/endosado/pendientes,
			y de Endosado a Recibido queda /cheques/recibido sin estado).
		*/
		'$route.params'() {
			this.completar_solapas()
		},
	},
	methods: {
		/**
		 * Deja la ruta siempre en una combinación que se pueda dibujar: sin ella NavComponent y
		 * list/Index no tienen qué mostrar. Lo que falta se completa (recibido/pendientes por
		 * defecto), lo que sobra se saca (Endosado no lleva segundo nivel) y la URL de antes de
		 * la solapa Endosado (/cheques/recibido/endosados, y /reportes/cheques/recibido/endosados
		 * que ya redirige acá) se lleva a /cheques/endosado. Ver `ruta_normalizada`.
		 *
		 * Es un replace y no un push para no dejar en el historial una entrada inválida a la que
		 * "volver". Con una ruta ya válida no hace nada, así que no puede entrar en loop.
		 *
		 * @returns {void}
		 */
		completar_solapas() {
			/** Combinación válida a la que corresponde la ruta actual. */
			let destino = ruta_normalizada(this.sub_view, this.sub_sub_view)

			// La ruta ya es la que corresponde (el sub_sub_view de Endosado es null, y en la ruta
			// la ausencia llega como undefined: se comparan los dos como "sin valor").
			if (destino.sub_view == this.sub_view && (destino.sub_sub_view || null) == (this.sub_sub_view || null)) {
				return
			}

			/**
			 * Params exactos de la ruta nueva. `router.replace` con `name` NO mezcla con los
			 * actuales: lo que no se pasa (el sub_sub_view de Endosado) queda afuera de la URL.
			 */
			let params = {sub_view: destino.sub_view}
			if (destino.sub_sub_view) {
				params.sub_sub_view = destino.sub_sub_view
			}

			// El catch vacío es el mismo de App.vue: vue-router 3 rechaza la promesa si la
			// navegación se pisa con otra, y acá no hay nada que hacer con eso.
			this.$router.replace({
				name: 'cheque',
				params: params,
			}).catch(() => {})
		},
	},
}
</script>
