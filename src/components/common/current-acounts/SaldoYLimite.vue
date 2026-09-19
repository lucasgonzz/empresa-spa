<template>
<div
v-if="from_credit_account"
class="saldo-y-limite">
	<div
	data-tour="cuentas_corrientes.saldo"
	class="saldo-y-limite__items">
		<span class="saldo-y-limite__item">
			Saldo actual: <b>{{ price(from_credit_account.saldo) }}</b>
		</span>

		<template v-if="tiene_limite">
			<span class="saldo-y-limite__item">
				Límite de crédito: <b>{{ price(from_credit_account.limite_credito) }}</b>
			</span>
			<span
			class="saldo-y-limite__item"
			:class="{ 'saldo-y-limite__item--rojo': disponible <= 0 }">
				Disponible: <b>{{ price(disponible) }}</b>
			</span>
		</template>
	</div>

	<!--
		Boton de "Propiedades para mostrar" (posicion y ancho de columna) de la tabla de
		movimientos. Mismo componente compartido que ya usan Listado y otras pantallas: la
		personalizacion es genérica por model_name, no algo que haya que construir de nuevo aca.
	-->
	<props-to-show
	model_name="current_acount"></props-to-show>
</div>
</template>
<script>
import current_acounts from '@/mixins/current_acounts'

export default {
	mixins: [current_acounts],
	components: {
		PropsToShow: () => import('@/common-vue/components/view/header/props-to-show/Index'),
	},
	computed: {
		tiene_limite() {
			return this.from_credit_account
				&& this.from_credit_account.limite_credito !== null
				&& typeof this.from_credit_account.limite_credito != 'undefined'
		},
		disponible() {
			return this.from_credit_account.limite_credito - this.from_credit_account.saldo
		},
	},
}
</script>
<style lang="sass">
// Franja de una sola linea: este modal lo montan doce vistas (clientes, proveedores, ventas,
// presupuestos, alertas, rutas, listado, por-entregar, por-estado, vender...), asi que tiene que
// leerse como continuacion de la barra de arriba y no como un bloque nuevo. Tokens de color,
// nunca hexadecimales: el modal cuelga de body, fuera de #app, y un hex rompe modo oscuro.
//
// Sin `scoped`: el boton de props-to-show lo dibuja props-to-show/Index.vue, que es un
// componente NIETO desde aca (el <b-button> vive adentro de SU propio div raiz), y un estilo con
// scope no llega tan lejos. Mismo motivo que ya documentan Nav.vue y List.vue en esta carpeta.
.saldo-y-limite
	display: flex
	flex-wrap: wrap
	align-items: center
	justify-content: space-between
	gap: 16px
	padding: 10px 20px
	background: var(--bg-card)
	border-bottom: 1px solid var(--color-border)
	font-size: 0.875rem
	color: var(--color-text-primary)

	&__items
		display: flex
		flex-wrap: wrap
		align-items: center
		gap: 16px

	&__item
		color: var(--color-text-secondary)

		b
			color: var(--color-text-primary)

		&--rojo b
			color: var(--btn-peligro-texto)

	// El boton de props-to-show trae su propio chasis (`.toolbar-btn--icono` de
	// _toolbar_botones.sass), pero esas reglas viven anidadas bajo `.view-header-toolbar` -- la
	// barra de encabezado de los listados, que este modal no tiene como ancestro. Sin este
	// bloque el boton cae al outline gris chico de Bootstrap (`btn-secondary btn-sm`), que no
	// combina con nada de alrededor. Se le da el mismo trato que Nav.vue ya le da a SUS propios
	// controles: los tokens --cc-* que Index.vue declara en `.cuenta-corriente-modal` (heredan
	// por acá igual, `scoped` o no, porque son custom properties y no selectores).
	.toolbar-btn--icono.btn
		width: var(--cc-control-h, 36px)
		height: var(--cc-control-h, 36px)
		padding: 0
		display: inline-flex
		align-items: center
		justify-content: center
		border-radius: var(--cc-btn-radio, 10px)
		box-shadow: var(--cc-btn-sombra, rgba(99, 99, 99, 0.12) 0px 1px 3px 0px)
		background: var(--bg-card)
		border: 1px solid var(--color-border)
		color: var(--color-text-primary)

		&:hover,
		&:focus,
		&:not(:disabled):not(.disabled):active
			background: var(--bg-hover)
			border-color: var(--color-border)
			color: var(--color-text-primary)
			box-shadow: var(--cc-btn-sombra, rgba(99, 99, 99, 0.12) 0px 1px 3px 0px)
</style>
