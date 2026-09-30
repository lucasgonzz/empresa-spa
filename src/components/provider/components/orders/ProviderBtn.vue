<template>
	<div
	class="proveedor-btn-cont j-start"
	v-if="nombre">
		<!--
			Mision cuenta-corriente-proveedor-en-compras (30/9/2026). La columna "Proveedor" del
			listado de Compras era texto plano; ahora el nombre es el boton que abre la cuenta
			corriente de ese proveedor. Mismo criterio visual que `ventas/components/ClientBtn.vue`
			(la columna "Cliente" de Ventas): boton de texto en el azul de accion, sin relleno, con el
			icono adelante, para que la tabla siga siendo una lista de datos con acciones y no una
			lista de botones.

			🔴 El clic lleva `.stop`: la fila entera tiene su propio @click que abre el modal de la
			compra, y sin eso el clic en el proveedor abriria las dos cosas.
		-->
		<b-button
		class="proveedor-btn"
		variant="link"
		:disabled="abriendo_cuenta_corriente"
		:data-testid="'btn-compra-proveedor-cc-'+provider_order.id"
		:title="'Abrir la cuenta corriente de '+nombre"
		@click.stop="abrir">
			<i class="bi bi-journal-text"></i>
			<span class="proveedor-btn__nombre">
				{{ nombre }}
			</span>
		</b-button>
	</div>
</template>
<script>
import abrir_cuenta_corriente_del_proveedor from '@/mixins/provider_order/abrir_cuenta_corriente_del_proveedor'
export default {
	mixins: [abrir_cuenta_corriente_del_proveedor],
	props: {
		provider_order: Object,
	},
	computed: {
		nombre() {
			if (this.provider_order && this.provider_order.provider) {
				return this.provider_order.provider.name
			}
			return ''
		},
	},
	methods: {
		abrir() {
			this.abrir_cuenta_corriente_del_proveedor(this.provider_order.provider_id, this.provider_order.moneda_id)
		},
	},
}
</script>
<style scoped lang="sass">
// Con `scoped`: el b-button renderiza su raiz en esta plantilla, asi que recibe el atributo de
// scope y las reglas le llegan sin filtrarse a otras tablas.
.proveedor-btn-cont
	align-items: center
	gap: 4px

.proveedor-btn
	display: inline-flex
	align-items: center
	gap: 6px
	max-width: 100%
	padding: 4px 8px
	border: 1px solid transparent
	border-radius: 8px
	font-weight: 500
	color: var(--color-primary)
	text-decoration: none
	// 🔴 `box-shadow: none` en REPOSO, no solo en :hover: _inputs.sass le pone una sombra gris
	// desplazada a TODO <button> del sistema, y en un boton sin relleno ni borde se ve como una
	// mancha flotando (mismo motivo que en ClientBtn.vue).
	box-shadow: none
	transition: background 0.15s ease, border-color 0.15s ease

	&:hover,
	&:focus
		background: var(--bg-hover)
		border-color: var(--color-border)
		color: var(--color-primary)
		text-decoration: underline
		box-shadow: none

	// Los iconos `icon-*` del sistema se dibujan con un ::before con `top` y margenes pensados
	// para un parrafo; en un boton flex el centrado lo da el contenedor, asi que se apaga.
	i,
	i::before
		top: 0
		margin: 0
		line-height: 1
		flex-shrink: 0
		opacity: .75

// Un nombre largo no puede empujar la columna: la celda de la tabla es `nowrap` y el texto se
// cortaria contra el borde sin ningun aviso.
.proveedor-btn__nombre
	overflow: hidden
	text-overflow: ellipsis
	white-space: nowrap
</style>
