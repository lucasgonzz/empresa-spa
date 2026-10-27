<template>
	<div
	v-if="view == 'cuenta'"
	class="meli-cuenta">

		<div class="meli-cuenta__encabezado">
			<p class="meli-cuenta__intro">
				Desde acá conectás tu cuenta de Mercado Libre y ves cómo está: tu reputación, si Mercado Libre te deja publicar y cómo viene la sincronización de tus artículos y pedidos.
			</p>
			<b-button
			size="sm"
			variant="outline-secondary"
			data-testid="meli-cuenta-actualizar"
			@click="cargar_cuenta_mercado_libre()">
				<i class="icon-refresh"></i>
				Actualizar
			</b-button>
		</div>

		<b-row
		v-if="cuenta_mercado_libre">
			<b-col
			cols="12"
			:lg="mercado_libre_conectado ? 6 : 12"
			class="m-b-15">
				<conexion></conexion>
			</b-col>

			<b-col
			v-if="mercado_libre_conectado"
			cols="12"
			lg="6"
			class="m-b-15">
				<reputacion
				:reputacion="cuenta_mercado_libre.reputacion"></reputacion>
			</b-col>

			<b-col
			v-if="mercado_libre_conectado"
			cols="12"
			lg="6"
			class="m-b-15">
				<sincronizacion
				:cuenta="cuenta_mercado_libre"></sincronizacion>
			</b-col>

			<b-col
			cols="12"
			:lg="mercado_libre_conectado ? 6 : 12"
			class="m-b-15">
				<que-tenes-que-saber
				:abierto_por_defecto="!mercado_libre_conectado"></que-tenes-que-saber>
			</b-col>
		</b-row>
	</div>
</template>
<script>
import mercado_libre_conexion from '@/mixins/mercado_libre_conexion'

/**
 * Solapa "Cuenta" del módulo de Mercado Libre (misión mercado-libre-integracion, 27/10/2026).
 *
 * Orquesta cuatro tarjetas que leen la misma respuesta de `GET mercado-libre/cuenta` (guardada en
 * el store `meli`):
 * - Conexion: estado de la conexión, cuenta conectada y botones Conectar / Reconectar / Desconectar.
 * - Reputacion: el termómetro de colores, MercadoLíder y qué le baja la reputación.
 * - Sincronizacion: si Mercado Libre deja publicar, la cola de publicaciones y el control de pedidos.
 * - QueTenesQueSaber: lo que el comercio tiene que saber de Mercado Libre, en lenguaje llano.
 *
 * Sin la cuenta conectada se muestran solo la conexión y lo que hay que saber (abierto).
 */
export default {
	name: 'MeliCuenta',
	mixins: [mercado_libre_conexion],
	components: {
		Conexion: () => import('@/components/mercado-libre/cuenta/Conexion'),
		Reputacion: () => import('@/components/mercado-libre/cuenta/Reputacion'),
		Sincronizacion: () => import('@/components/mercado-libre/cuenta/Sincronizacion'),
		QueTenesQueSaber: () => import('@/components/mercado-libre/cuenta/QueTenesQueSaber'),
	},
	watch: {
		/*
			La solapa se monta una vez con la vista y se muestra con `v-if`: cada vez que el
			comercio vuelve a "Cuenta" se consulta de nuevo, para que la cola y la reputación no
			queden viejas.
		*/
		view: {
			immediate: true,
			handler(valor) {
				if (valor == 'cuenta') {
					this.cargar_cuenta_mercado_libre()
				}
			},
		},
	},
}
</script>
<style lang="sass">
// Estilos de la solapa "Cuenta" y de sus tarjetas (Conexion, Reputacion, Sincronizacion,
// QueTenesQueSaber), que no declaran estilos propios: todo vive acá para no repetir la tarjeta.
// Colores solo con los tokens del tema (_dark_theme.sass), salvo los del termómetro, que son los
// colores de la reputación de Mercado Libre y valen igual en claro y en oscuro.
.meli-cuenta
	width: 100%

	.meli-cuenta__encabezado
		display: flex
		align-items: flex-start
		justify-content: space-between
		gap: 12px
		margin: 0 0 20px
		padding-top: 4px

	.meli-cuenta__intro
		margin: 0
		max-width: 780px
		font-size: 14px
		line-height: 1.55
		color: var(--color-text-secondary)

	.meli-card
		height: 100%
		padding: 20px
		background: var(--bg-card)
		border: 1px solid var(--color-border)
		border-radius: 14px
		box-shadow: 0 1px 2px var(--shadow-color)

	.meli-card__encabezado
		display: flex
		justify-content: space-between
		align-items: flex-start
		gap: 12px
		margin-bottom: 10px

	.meli-card__titulo
		margin: 0
		font-size: 15px
		font-weight: 600
		color: var(--color-text-primary)

	.meli-card__texto
		margin: 0 0 10px
		font-size: 13px
		line-height: 1.5
		color: var(--color-text-secondary)

	.meli-card__dato
		margin: 0 0 10px
		font-size: 14px
		color: var(--color-text-primary)

	.meli-card__aviso
		margin: 0 0 10px
		padding: 10px 12px
		border-radius: 10px
		font-size: 13px
		line-height: 1.5
		background: var(--bg-section)
		color: var(--color-text-secondary)

	.meli-card__aviso--info
		background: var(--bg-info-soft)

	.meli-card__aviso--alerta
		background: var(--bg-warning-soft)

	.meli-card__aviso--error
		background: var(--bg-danger-soft)
		color: var(--color-text-danger-strong)

	.meli-card__acciones
		display: flex
		flex-wrap: wrap
		gap: 10px
		margin-top: 16px
		padding-top: 14px
		border-top: 1px solid var(--color-border-secondary)

	.badge
		flex-shrink: 0
		padding: 5px 11px
		border-radius: 999px
		font-size: 11px
		font-weight: 600
		letter-spacing: .2px

	// Termómetro de reputación: cinco tramos del rojo al verde
	.meli-termometro
		display: flex
		gap: 4px
		margin: 6px 0 12px

	.meli-termometro__tramo
		flex: 1
		height: 10px
		border-radius: 999px
		opacity: .25
		transition: opacity .2s ease, height .2s ease

	.meli-termometro__tramo--activo
		opacity: 1
		height: 14px
		margin-top: -2px

	.meli-termometro__tramo--gris
		background: var(--color-border-tertiary)
		opacity: .6

	.meli-termometro__tramo--rojo
		background: #e5483b

	.meli-termometro__tramo--naranja
		background: #f2802b

	.meli-termometro__tramo--amarillo
		background: #f5c518

	.meli-termometro__tramo--verde-claro
		background: #8cc63f

	.meli-termometro__tramo--verde
		background: #2f9e44

	.meli-reputacion__nivel
		margin: 0 0 6px
		font-size: 16px
		font-weight: 600
		color: var(--color-text-primary)

	// Indicadores (reclamos, cancelaciones, demoras, ventas)
	.meli-indicadores
		display: grid
		grid-template-columns: repeat(2, minmax(0, 1fr))
		gap: 10px
		margin: 12px 0

	.meli-indicador
		padding: 10px 12px
		border-radius: 10px
		background: var(--bg-section)

	.meli-indicador__valor
		display: block
		font-size: 18px
		font-weight: 600
		color: var(--color-text-primary)

	.meli-indicador__nombre
		display: block
		font-size: 12px
		line-height: 1.35
		color: var(--color-text-secondary)

	.meli-indicadores--tres
		grid-template-columns: repeat(3, minmax(0, 1fr))

	.meli-saber__toggle
		flex-shrink: 0
		font-size: 13px

	.meli-lista
		margin: 0
		padding-left: 18px
		font-size: 13px
		line-height: 1.55
		color: var(--color-text-secondary)

		li
			margin-bottom: 6px

@media (max-width: 575px)
	.meli-cuenta
		.meli-cuenta__encabezado
			flex-direction: column

		.meli-card
			padding: 16px

		.meli-indicadores--tres
			grid-template-columns: repeat(2, minmax(0, 1fr))

		.meli-card__acciones
			.btn
				flex: 1
</style>
