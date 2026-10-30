<template>
	<!-- La pantalla de una conversación en blanco, la de ia-spa (chat/PantallaVacia.vue): el saludo
	«¿En qué te ayudo hoy, {nombre}?» y cuatro sugerencias pensadas para un comercio. Tocar una la
	manda como primer mensaje (lo hace el compositor: ver Panel.vue::usar_sugerencia).

	Como allá, se dibuja en dos pedazos (`solo_saludo` / `solo_sugerencias`): el saludo va en la
	conversación y las sugerencias van abajo del compositor (escritorio) o arriba (teléfono). -->
	<div class="asistente-ia-vacia">
		<h1
		v-if="!solo_sugerencias"
		class="asistente-ia-vacia__saludo">{{ saludo }}</h1>
		<ul
		v-if="!solo_saludo"
		class="asistente-ia-vacia__sugerencias"
		aria-label="Sugerencias">
			<li
			v-for="sugerencia in sugerencias"
			:key="sugerencia.titulo">
				<button
				type="button"
				class="asistente-ia-vacia__sugerencia"
				@click="$emit('sugerencia', sugerencia.texto)">
					<icono
					class="asistente-ia-vacia__icono"
					:nombre="sugerencia.icono"
					:tamano="18"></icono>
					<span class="asistente-ia-vacia__textos">
						<span class="asistente-ia-vacia__titulo">{{ sugerencia.titulo }}</span>
						<span class="asistente-ia-vacia__detalle">{{ sugerencia.detalle }}</span>
					</span>
				</button>
			</li>
		</ul>
	</div>
</template>

<script>
import Icono from '@/components/asistente-ia/Icono'
import { nombre_corto } from '@/components/asistente-ia/identidad'

/**
 * Las sugerencias de la conversación en blanco. Son las de ia-spa adaptadas a lo que la ventana del
 * sistema muestra: acá la respuesta es texto plano (D43, sin gráficos ni tablas), así que la de "las
 * ventas de la semana" pide la comparación en texto, y la cuarta muestra lo que el agente puede
 * CARGAR con una tarjeta que la persona confirma (lo que decía la bienvenida de antes).
 *
 * `texto` es exactamente lo que se manda como primer mensaje.
 */
const SUGERENCIAS = [
	{
		icono: 'caja',
		titulo: '¿Qué tengo que reponer?',
		detalle: 'lo que se está quedando sin stock',
		texto: '¿Qué artículos tengo que reponer? Pasame los que tienen poco stock y lo que vendí de cada uno.',
	},
	{
		icono: 'billetera',
		titulo: '¿Quién me debe?',
		detalle: 'los saldos de cuenta corriente',
		texto: '¿Quién me debe plata? Pasame los clientes con saldo en cuenta corriente, de mayor a menor.',
	},
	{
		icono: 'grafico',
		titulo: 'Las ventas de la semana',
		detalle: 'comparadas con la semana pasada',
		texto: '¿Cuánto vendí esta semana? Comparalo con la semana pasada.',
	},
	{
		icono: 'nuevo',
		titulo: 'Cargar un gasto',
		detalle: 'te dejo una tarjeta para confirmar',
		texto: 'Quiero cargar un gasto. Preguntame lo que necesites.',
	},
]

export default {
	components: {
		Icono,
	},
	props: {
		/**
		 * true dibuja solo el saludo (la parte que va en la conversación).
		 */
		solo_saludo: {
			type: Boolean,
			default: false,
		},
		/**
		 * true dibuja solo las sugerencias (la parte que va junto al compositor).
		 */
		solo_sugerencias: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			sugerencias: SUGERENCIAS,
		}
	},
	computed: {
		/**
		 * El saludo con el nombre de pila de la persona, o sin nombre si no lo hay.
		 *
		 * @returns {String}
		 */
		saludo() {
			let nombre = nombre_corto(this.user)
			return nombre ? '¿En qué te ayudo hoy, ' + nombre + '?' : '¿En qué te ayudo hoy?'
		},
	},
}
</script>

<style lang="sass">
.asistente-ia-vacia
	display: flex
	flex-direction: column
	align-items: center
	width: 100%

	// 🔴 Color, letra y margen explícitos: es un <h1> y el sistema les pone color, peso y margen
	// propios (bootstrap y common-vue/sass/_texts.sass), que acá adentro no corresponden.
	&__saludo
		margin: 0 0 28px 0
		padding: 0 12px
		font-family: inherit
		font-size: 1.9rem
		font-weight: 500
		letter-spacing: -.015em
		line-height: 1.25
		text-align: center
		color: var(--ia-texto)

	&__sugerencias
		list-style: none
		margin: 0
		padding: 0
		display: grid
		grid-template-columns: repeat(2, minmax(0, 1fr))
		gap: 10px
		width: 100%

	&__sugerencia
		display: flex
		align-items: flex-start
		gap: 12px
		width: 100%
		height: 100%
		padding: 12px 14px
		border: 1px solid var(--ia-borde)
		border-radius: 16px
		background: transparent
		color: var(--ia-texto)
		font-family: inherit
		text-align: left
		cursor: pointer
		transition: background var(--ia-transicion)

		&:hover
			background: var(--ia-bg-hover)

		&:focus
			outline: none

		&:focus-visible
			outline: 2px solid var(--ia-foco)
			outline-offset: 2px

	&__icono
		margin-top: 2px
		color: var(--ia-acento)

	&__textos
		display: flex
		flex-direction: column
		min-width: 0
		line-height: 1.35

	&__titulo
		font-size: .92rem
		font-weight: 500

	&__detalle
		font-size: .84rem
		color: var(--ia-texto-3)

// Teléfono: el saludo más chico y las sugerencias en una fila que se desliza de costado, con
// enganche por tarjeta, como ia-spa.
@media screen and (max-width: 767px)
	.asistente-ia-vacia__saludo
		font-size: 1.5rem
		margin-bottom: 0

	.asistente-ia-vacia__sugerencias
		display: flex
		overflow-x: auto
		scroll-snap-type: x mandatory
		scroll-padding: 0 16px
		gap: 8px
		padding: 0 16px 4px 16px
		margin: 0 -16px
		width: calc(100% + 32px)
		scrollbar-width: none

		&::-webkit-scrollbar
			display: none

		li
			flex: 0 0 auto
			width: 220px
			scroll-snap-align: start

@media (prefers-reduced-motion: reduce)
	.asistente-ia-vacia__sugerencia
		transition: none
</style>
