<template>
	<div class="meli-aviso-sin-conexion">
		<div class="meli-aviso-sin-conexion__texto">
			<p class="meli-aviso-sin-conexion__titulo">
				Tu cuenta de Mercado Libre no está conectada
			</p>
			<p
			v-if="cuenta_mercado_libre && cuenta_mercado_libre.error_conexion"
			class="meli-aviso-sin-conexion__detalle">
				{{ cuenta_mercado_libre.error_conexion }}
			</p>
			<p
			v-else
			class="meli-aviso-sin-conexion__detalle">
				Mientras no la conectes, el sistema no actualiza tus publicaciones ni trae los pedidos nuevos.
			</p>
		</div>

		<b-button
		variant="primary"
		size="sm"
		data-testid="meli-aviso-conectar"
		@click="conectar_mercado_libre">
			Conectar mi cuenta
		</b-button>
	</div>
</template>
<script>
import mercado_libre_conexion from '@/mixins/mercado_libre_conexion'

/**
 * Aviso que muestran las solapas del módulo de Mercado Libre (todas menos "Cuenta") cuando la
 * cuenta del comercio no está conectada, con el botón para conectarla ahí mismo (misión
 * mercado-libre-integracion, 27/10/2026). Si la conexión se cortó sola (Mercado Libre la dio de
 * baja), muestra el motivo que manda la API en `error_conexion`.
 */
export default {
	name: 'MeliAvisoSinConexion',
	mixins: [mercado_libre_conexion],
}
</script>
<style lang="sass">
// Colores solo con los tokens del tema (_dark_theme.sass): el aviso queda bien en claro y en oscuro.
.meli-aviso-sin-conexion
	display: flex
	align-items: center
	justify-content: space-between
	flex-wrap: wrap
	gap: 12px
	margin: 0 0 16px
	padding: 14px 16px
	border-radius: 12px
	border: 1px solid var(--color-border)
	background: var(--bg-warning-soft)
	// La vista del módulo hereda `text-align: center`: el aviso se lee alineado a la izquierda
	text-align: left

	.meli-aviso-sin-conexion__texto
		flex: 1
		min-width: 220px

	.meli-aviso-sin-conexion__titulo
		margin: 0 0 4px
		font-weight: 600
		color: var(--color-text-warning-strong)

	.meli-aviso-sin-conexion__detalle
		margin: 0
		font-size: 13px
		color: var(--color-text-secondary)

@media (max-width: 575px)
	.meli-aviso-sin-conexion
		.btn
			width: 100%
</style>
