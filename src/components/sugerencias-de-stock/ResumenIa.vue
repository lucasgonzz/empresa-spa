<template>
	<div class="resumen-ia">

		<!-- Escribiendose: la corrida termino y el job del resumen esta en la cola -->
		<b-card
		v-if="estado == 'pendiente'"
		class="resumen-ia__card m-b-15">
			<div class="j-start align-center">
				<b-spinner
				small
				class="m-r-10"></b-spinner>
				<span class="text-muted">
					Lo estamos escribiendo: en un momento vas a tener un resumen de esta sugerencia.
				</span>
			</div>
		</b-card>

		<!-- Listo: el texto en criollo que escribio la IA sobre el resultado ya calculado -->
		<b-card
		v-else-if="estado == 'listo' && sugerencia.resumen_ia"
		class="resumen-ia__card m-b-15">
			<h6 class="resumen-ia__titulo">
				<i class="bi bi-stars m-r-5"></i>
				Resumen
			</h6>
			<p class="resumen-ia__texto m-b-0">
				{{ sugerencia.resumen_ia }}
			</p>
		</b-card>

		<!--
			Error: aviso discreto y nada mas; la tabla se ve igual. El estado null
			(sin IA contratada) no muestra nada a proposito: no tener el resumen
			no es una falla y no se presenta como tal.
		-->
		<p
		v-else-if="estado == 'error'"
		class="text-muted small m-b-15">
			<i class="bi bi-info-circle m-r-5"></i>
			No se pudo generar el resumen de esta sugerencia.
		</p>

	</div>
</template>
<script>
/*
	Resumen escrito por IA sobre la sugerencia ya calculada. Tres estados visibles
	(pendiente / listo / error) y uno invisible (null: la cuenta no tiene IA
	contratada, el bloque no existe).
*/
export default {
	props: {
		sugerencia: {
			type: Object,
			required: true,
		},
	},
	computed: {
		estado() {
			return this.sugerencia.resumen_ia_estado
		},
	},
}
</script>
<style lang="sass">
.resumen-ia
	&__titulo
		font-weight: 600
	&__texto
		white-space: pre-line
</style>
