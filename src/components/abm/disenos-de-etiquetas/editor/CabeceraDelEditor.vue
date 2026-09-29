<template>
	<!--
		Cabecera del editor de etiquetas (mision disenos-etiquetas-gondola, 29/9/2026): el nombre del
		diseño (es el que aparece en el menu de Listado), "Deshacer" y "Restablecer el diseño de
		siempre". El nombre es del editor (Index.vue): llega por props y vuelve con `update:nombre`.
	-->
	<div class="cabecera-etiqueta">

		<b-form-group
		class="cabecera-etiqueta__nombre"
		label="Nombre del diseño"
		label-for="cabecera-etiqueta-nombre"
		description="Así aparece para imprimir en Listado."
		:invalid-feedback="nombre_invalido ? 'Poné un nombre para el diseño.' : ''"
		:state="nombre_invalido ? false : null">
			<b-form-input
			id="cabecera-etiqueta-nombre"
			ref="nombre"
			:value="nombre"
			maxlength="120"
			autocomplete="off"
			placeholder="Por ejemplo: Etiqueta de ofertas"
			:state="nombre_invalido ? false : null"
			@input="$emit('update:nombre', $event)"></b-form-input>
		</b-form-group>

		<div class="cabecera-etiqueta__acciones">
			<b-button
			variant="outline-secondary"
			size="sm"
			:disabled="!puede_deshacer"
			title="Deshace el último cambio (Ctrl + Z)"
			@click="$emit('deshacer')">
				<i class="bi bi-arrow-counterclockwise"></i>
				Deshacer
			</b-button>
			<b-button
			variant="outline-secondary"
			size="sm"
			title="Vuelve a la etiqueta de siempre: precio grande arriba, nombre, código de barras y fecha. No cambia el nombre."
			@click="$emit('restablecer')">
				<i class="bi bi-arrow-repeat"></i>
				Restablecer el diseño de siempre
			</b-button>
		</div>
	</div>
</template>
<script>
/**
 * Cabecera del editor de etiquetas.
 */
export default {
	name: 'CabeceraDelEditorDeEtiqueta',
	props: {
		/* Nombre del diseño (.sync) */
		nombre: {
			type: String,
			default: '',
		},
		/* true despues de intentar guardar sin nombre */
		nombre_invalido: {
			type: Boolean,
			default: false,
		},
		/* Si hay algo para deshacer */
		puede_deshacer: {
			type: Boolean,
			default: false,
		},
	},
	methods: {
		/**
		 * Enfoca y selecciona el nombre (al abrir uno nuevo y al rechazar un guardado sin nombre).
		 *
		 * @returns {void}
		 */
		enfocar_nombre() {
			let campo = this.$refs.nombre
			if (campo && typeof campo.focus == 'function') {
				campo.focus()
				if (typeof campo.select == 'function') {
					campo.select()
				}
			}
		},
	},
}
</script>
<style lang="sass">
.cabecera-etiqueta
	display: flex
	flex-wrap: wrap
	align-items: flex-start
	gap: 10px 24px
	margin-bottom: 12px
	text-align: left

	.cabecera-etiqueta__nombre
		flex: 1 1 280px
		max-width: 440px
		margin-bottom: 0

		legend,
		label
			margin-bottom: 4px
			color: var(--color-text-secondary)
			font-size: 0.78rem
			font-weight: 600
			text-transform: uppercase
			letter-spacing: 0.02em

		.form-control
			border-radius: var(--metodo-pago-input-radius)
			border-width: 1px

			&:focus
				border-width: 1px
				border-color: var(--color-primary)
				box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)

	.cabecera-etiqueta__acciones
		display: flex
		flex-wrap: wrap
		gap: 8px
		margin-left: auto
		padding-top: 24px

		.btn
			display: inline-flex
			align-items: center
			gap: 6px
			border-radius: 8px
			white-space: nowrap

@media (max-width: 767.98px)
	.cabecera-etiqueta
		.cabecera-etiqueta__nombre
			max-width: none

		.cabecera-etiqueta__acciones
			margin-left: 0
			padding-top: 0
</style>
