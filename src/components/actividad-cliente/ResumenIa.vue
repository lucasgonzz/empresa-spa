<template>
	<div
	v-if="loading || resumen || error"
	class="resumen-ia-actividad m-b-15">
		<b-card class="resumen-ia-actividad__card">

			<div class="j-between align-center m-b-5">
				<h6 class="resumen-ia-actividad__titulo m-b-0">
					<i class="bi bi-stars m-r-5"></i>
					Qué estuvo haciendo en la tienda
				</h6>
				<!--
					El botón fuerza una lectura nueva salteando la caché de sesión. Es chiquito
					y de tipo link a propósito: cada click es una llamada paga a la IA, no una
					recarga gratis de la pantalla.
				-->
				<b-button
				v-if="!loading"
				class="p-0"
				size="sm"
				variant="link"
				title="Pedirle a la IA que lo vuelva a leer"
				@click="volver_a_leer">
					Volver a leer
				</b-button>
			</div>

			<!-- Escribiendose: el pedido esta en vuelo (es sincronico, no hay job de por medio) -->
			<div
			v-if="loading"
			class="j-start align-center">
				<b-spinner
				small
				class="m-r-10"></b-spinner>
				<span class="text-muted">
					Lo estamos leyendo: en un momento te contamos qué estuvo haciendo este cliente.
				</span>
			</div>

			<!--
				🔴 El texto va INTERPOLADO, nunca con v-html: es contenido generado por IA y
				renderizarlo como HTML sería meter en el DOM lo que un modelo escribió. Los
				saltos de línea los respeta `white-space: pre-line` en el sass, que es el molde
				exacto de `ofertas/ResumenIa.vue`.
			-->
			<p
			v-else-if="resumen"
			class="resumen-ia-actividad__texto m-b-0">
				{{ resumen }}
			</p>

			<!--
				Error: aviso discreto con el mensaje que mandó el backend TAL CUAL. Los tres 422
				posibles ya vienen escritos en criollo (la cuenta no tiene IA, no hay actividad
				en el periodo, la IA no está contestando) y cada uno le dice al operador algo
				distinto sobre si tiene sentido reintentar. No tener el resumen no es una falla
				de la pantalla: los números salen igual, los calcula el backend y no la IA.
			-->
			<p
			v-else-if="error"
			class="text-muted small m-b-0">
				<i class="bi bi-info-circle m-r-5"></i>
				{{ error }}
			</p>

		</b-card>
	</div>
</template>
<script>
/**
 * La lectura en criollo de la actividad del cliente, escrita por la IA.
 *
 * Va ARRIBA de todo en el modal, que es el pedido textual: una lectura en castellano y no una
 * tabla cruda de eventos. Los números de abajo son la prueba de lo que este párrafo dice.
 *
 * Lee del store en vez de recibir props porque el store es singleton y el modal ya es único por
 * vista: pasar cuatro props para reflejar cuatro claves del mismo módulo sería ruido.
 *
 * El pedido lo dispara el modal al abrirse (y al cambiar de periodo); acá adentro solo vive el
 * "Volver a leer", que es el único camino que saltea la caché de sesión.
 */
export default {
	computed: {
		loading() {
			return this.$store.state.actividad_cliente.resumen_loading
		},
		resumen() {
			return this.$store.state.actividad_cliente.resumen
		},
		error() {
			return this.$store.state.actividad_cliente.resumen_error
		},
	},
	methods: {
		volver_a_leer() {
			this.$store.dispatch('actividad_cliente/getResumen', {
				forzar: true,
			})
		},
	},
}
</script>
<style lang="sass">
.resumen-ia-actividad
	&__titulo
		font-weight: 600
	&__texto
		white-space: pre-line
</style>
