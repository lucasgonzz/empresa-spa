<template>
	<!--
		"Nota de crédito" de una compra (misión devoluciones-compras-y-rediseno): lleva al módulo de
		Devoluciones en modo Compra con esta compra ya cargada. Es el gemelo de
		components/ventas/modals/details/BtnNotaCredito.vue, del lado proveedor.

		Se dibuja en dos lugares (orders/Index.vue): debajo del campo Proveedor del formulario de la
		compra (al lado de "Ver cuenta corriente") y como botón de fila del listado. Solo con la
		compra ya guardada (`model.id`): una compra a medio cargar no tiene nada que devolver.
	-->
	<b-button
	v-if="model && model.id"
	size="sm"
	variant="outline-danger"
	:class="{'m-l-15': en_fila}"
	:data-testid="'devolucion-compra-btn-nota-credito-'+model.id"
	title="Hacer una nota de crédito al proveedor sobre esta compra"
	@click.stop="nota_credito">
		<i class="bi bi-arrow-counterclockwise"></i>
		Nota de crédito
	</b-button>
</template>
<script>
import set_from_provider_order from '@/mixins/devoluciones/set_from_provider_order'
export default {
	mixins: [set_from_provider_order],
	props: {
		// La compra (el `model` de la fila o del formulario).
		model: Object,
		// true en la columna de opciones del listado: lleva el margen de los otros botones de fila.
		en_fila: {
			type: Boolean,
			default: false,
		},
	},
	methods: {
		/**
		 * Pasa Devoluciones a modo Compra con el número de esta compra, navega y la busca.
		 *
		 * 🔴 El número se toma ANTES de cerrar el modal: al cerrarse, el formulario genérico
		 * resetea el modelo del store de la compra. Y el modal se cierra antes de navegar para no
		 * dejar el `modal-open` de bootstrap pegado en el <body> de la pantalla siguiente.
		 */
		nota_credito() {
			let num = this.model.num

			this.$bvModal.hide('provider_order')

			// Arranca de cero: si en Devoluciones quedó otra nota a medias, no se mezcla con esta.
			this.limpiar_devolucion()
			this.$store.commit('devoluciones/set_tipo', 'compra')
			this.$store.commit('devoluciones/set_num_provider_order', num)

			let navegacion = this.$router.push({name: 'devoluciones'})
			// vue-router 3 rechaza la promesa si ya se está en /devoluciones: no es un error.
			if (navegacion && typeof navegacion.catch == 'function') {
				navegacion.catch(() => {})
			}

			this.search_provider_order()
		},
	},
}
</script>
