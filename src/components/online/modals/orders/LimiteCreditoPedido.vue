<template>
<b-modal
id="limite-credito-pedido"
title="El cliente supera su límite de crédito"
hide-footer>
	<p>
		Si confirmás este pedido, <b>{{ info.client_name }}</b> va a superar su límite de crédito
		en {{ info.moneda_name }}.
	</p>

	<div class="limite-credito-pedido-numeros">
		<div class="limite-credito-pedido-numeros__fila">
			<span class="limite-credito-pedido-numeros__etiqueta">Saldo actual</span>
			<span class="limite-credito-pedido-numeros__valor">{{ price(info.saldo_actual) }}</span>
		</div>
		<div class="limite-credito-pedido-numeros__fila">
			<span class="limite-credito-pedido-numeros__etiqueta">Total de este pedido</span>
			<span class="limite-credito-pedido-numeros__valor">{{ price(info.total_venta) }}</span>
		</div>
		<div class="limite-credito-pedido-numeros__fila">
			<span class="limite-credito-pedido-numeros__etiqueta">Saldo si se confirma</span>
			<span class="limite-credito-pedido-numeros__valor limite-credito-pedido-numeros__valor--rojo">{{ price(info.saldo_resultante) }}</span>
		</div>
		<div class="limite-credito-pedido-numeros__fila">
			<span class="limite-credito-pedido-numeros__etiqueta">Límite de crédito</span>
			<span class="limite-credito-pedido-numeros__valor">{{ price(info.limite_credito) }}</span>
		</div>
		<div class="limite-credito-pedido-numeros__fila">
			<span class="limite-credito-pedido-numeros__etiqueta">Se pasa por</span>
			<span class="limite-credito-pedido-numeros__valor limite-credito-pedido-numeros__valor--rojo">{{ price(info.excedente) }}</span>
		</div>
	</div>

	<div class="limite-credito-pedido-acciones">
		<b-button
		variant="primary"
		@click="no_confirmar">
			No confirmar
		</b-button>
		<b-button
		variant="outline-danger"
		@click="confirmar_igual">
			Confirmar igual
		</b-button>
	</div>

	<p class="limite-credito-pedido-nota">
		El pedido ya lo hizo el comprador. Vos decidís si se lo despachás igual o si primero le
		pedís que pague.
	</p>
</b-modal>
</template>
<script>
/*
	Aviso SALTEABLE del límite de crédito al confirmar un pedido de la tienda (prompt 610).

	🔴 Es a propósito distinto de `vender/modals/LimiteCreditoExcedido.vue`, que es freno duro
	(`no-close-on-esc` + `no-close-on-backdrop`, sin ninguna forma de guardar igual). Acá el modal
	se cierra con Escape y con clic afuera, y tiene un botón para confirmar igual: en el mostrador
	hay un vendedor con el cliente adelante y se corrige en el momento, pero el pedido ya lo mandó
	el comprador y el que confirma está mirando una tanda. Decisión de Lucas del 22/8/2026.

	El botón por defecto (`primary`) es "No confirmar", que es la acción prudente. "Confirmar
	igual" queda en `outline-danger` para que se vea que es la excepción.
*/
export default {
	props: {
		/**
		 * Contenido de `limite_credito` del 422 que devolvió la API. Ver
		 * LimiteCreditoHelper::armar_respuesta_422() en empresa-api.
		 */
		info: {
			type: Object,
			default() {
				return {}
			},
		},
	},
	methods: {
		/**
		 * Le avisa al padre que el dueño decidió confirmar igual. El PUT lo repite `BtnStatus`,
		 * que es el que tiene el estado al que se está pasando.
		 *
		 * @returns {void}
		 */
		confirmar_igual() {
			this.$bvModal.hide('limite-credito-pedido')
			this.$emit('confirmar_igual')
		},
		/**
		 * Cierra sin hacer nada: el pedido queda como estaba.
		 *
		 * @returns {void}
		 */
		no_confirmar() {
			this.$bvModal.hide('limite-credito-pedido')
		},
	}
}
</script>
<style scoped lang="sass">
// Los modales de bootstrap-vue cuelgan de `body`, fuera de `#app`: por eso todos los colores de acá
// salen de tokens (`var(--color-...)`) y no de hexadecimales. Un hex acá deja el modal blanco en
// modo oscuro. Mismo criterio que vender/modals/LimiteCreditoExcedido.vue.
.limite-credito-pedido-numeros
	display: flex
	flex-direction: column
	gap: 8px
	margin: 15px 0
	padding: 12px 15px
	background: var(--bg-section)
	border-radius: 8px
	border: 1px solid var(--color-border)

	&__fila
		display: flex
		flex-wrap: wrap
		justify-content: space-between
		gap: 8px

	&__etiqueta
		color: var(--color-text-secondary)

	&__valor
		font-weight: 600
		color: var(--color-text-primary)

		&--rojo
			color: var(--btn-peligro-texto)

.limite-credito-pedido-acciones
	display: flex
	flex-wrap: wrap
	gap: 10px
	margin-bottom: 15px

.limite-credito-pedido-nota
	color: var(--color-text-secondary)
	font-size: 0.875rem
	margin-bottom: 0
</style>
