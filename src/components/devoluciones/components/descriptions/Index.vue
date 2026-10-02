<template>
	<!--
		Descripciones de la nota de crédito (extensión `nota_credito_descriptions`): renglones de
		texto libre con importe e IVA que suman al total. Valen en los dos modos.
	-->
	<tarjeta
	v-if="hasExtencion('nota_credito_descriptions')"
	titulo="Descripciones"
	subtitulo="Conceptos libres con su importe e IVA. Suman al total de la nota de crédito.">

		<template #acciones>
			<b-button
			class="dev-btn-secundario"
			variant="light"
			data-testid="devolucion-btn-agregar-descripcion"
			@click="agregar">
				<i class="bi bi-plus-lg"></i>
				Agregar
			</b-button>
		</template>

		<div class="dev-descripciones">
			<nc-description
			v-for="(description, index) in descriptions"
			:key="index"
			:description="description"></nc-description>
		</div>
	</tarjeta>
</template>
<script>
export default {
	components: {
		Tarjeta: () => import('@/components/devoluciones/components/Tarjeta'),
		NcDescription: () => import('@/components/devoluciones/components/descriptions/NcDescription'),
	},
	computed: {
		/**
		 * @returns {Array} Descripciones de la nota de crédito.
		 */
		descriptions() {
			return this.$store.state.devoluciones.descriptions
		},
	},
	created() {
		// Arranca con una fila vacía, como siempre.
		this.$store.commit('devoluciones/set_descriptions', [])
		this.$store.commit('devoluciones/add_description')
	},
	methods: {
		/**
		 * Agrega una fila vacía.
		 */
		agregar() {
			this.$store.commit('devoluciones/add_description')
		},
	},
}
</script>
<style lang="sass">
.devoluciones-modulo
	.dev-descripciones
		display: flex
		flex-direction: column
		gap: 12px
</style>
