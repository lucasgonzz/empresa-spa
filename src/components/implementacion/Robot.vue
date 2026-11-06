<template>
	<svg viewBox="0 0 120 132" class="robot-implementacion" :class="'pose-' + pose" aria-hidden="true" focusable="false">
		<path class="propulsion" fill="#ff9b32" d="M47 103q13 5 26 0-1 13-13 24-12-11-13-24z"/>
		<path class="propulsion" fill="#ffe182" d="M53 105q7 3 14 0-1 8-7 15-6-7-7-15z"/>
		<path fill="#4057b8" d="M44 92h32l-5 13a4 4 0 0 1-4 3H53a4 4 0 0 1-4-3z"/>
		<g class="brazo izquierdo">
			<path fill="none" stroke="#81a5f6" stroke-width="9" stroke-linecap="round" d="M41 74Q25 84 17 68"/>
			<circle cx="15" cy="65" r="7" fill="#e0eeff"/>
		</g>
		<g class="brazo derecho">
			<path fill="none" stroke="#81a5f6" stroke-width="9" stroke-linecap="round" d="M79 74Q95 84 103 68"/>
			<circle cx="105" cy="65" r="7" fill="#e0eeff"/>
		</g>
		<rect x="38" y="64" width="44" height="35" rx="14" fill="#e0eeff" stroke="#839df3" stroke-width="2"/>
		<image x="49" y="71" width="22" height="22" :href="logo"/>
		<path stroke="#8099f3" stroke-width="4" stroke-linecap="round" d="M60 25V13"/>
		<circle cx="60" cy="9" r="5" fill="#ff9b32"/>
		<rect x="25" y="24" width="70" height="48" rx="21" fill="#e0eeff" stroke="#8ca9fa" stroke-width="2"/>
		<rect x="32" y="31" width="56" height="34" rx="15" fill="#182a5b"/>
		<path stroke="#8af3f4" stroke-width="3" stroke-linecap="round" fill="none" d="M43 46q4-6 8 0m18 0q4-6 8 0m-23 7q6 6 12 0"/>
	</svg>
</template>

<script>
import logo from '@/assets/isotipo-comerciocity.svg'

export default {
	props: {
		pose: { type: String, default: 'saludo' },
	},
	data() {
		return { logo }
	},
}
</script>

<style lang="sass" scoped>
.robot-implementacion
	display: block
	width: 100%
	overflow: visible
	animation: flotar 1.9s ease-in-out infinite
	.propulsion
		transform-origin: 50% 80%
		animation: propulsar .32s ease-in-out infinite alternate
	.izquierdo
		transform-origin: 35% 57%
	.derecho
		transform-origin: 65% 57%
	&.pose-saludo .derecho
		animation: saludar .8s ease-in-out infinite alternate
	&.pose-saludo .izquierdo
		animation: festejar 1.2s ease-in-out infinite alternate
	&.pose-senalar .derecho
		transform: rotate(30deg)
	&.pose-senalar .izquierdo
		transform: rotate(-43deg)
	&.pose-pensar .derecho
		transform-origin: 75% 65%
		animation: pensar 1.2s ease-in-out infinite alternate

@keyframes pensar
	from
		transform: rotate(-35deg)
	to
		transform: rotate(-12deg)

@keyframes flotar
	0%, 100%
		transform: translateY(0)
	50%
		transform: translateY(-5%)
@keyframes propulsar
	to
		transform: scaleY(.72)
@keyframes saludar
	from
		transform: rotate(-9deg)
	to
		transform: rotate(-44deg)
@keyframes festejar
	to
		transform: rotate(25deg)
@media (prefers-reduced-motion: reduce)
	.robot-implementacion, .robot-implementacion *
		animation: none !important
</style>
