<template>
	<main class="implementacion-linea">
		<header>
			<p class="implementacion-linea__leyenda"><i class="bi bi-list-check" aria-hidden="true"></i> Tu puesta en marcha</p>
			<h1>Implementación</h1>
			<p>Seguí cómo preparamos tu sistema con la información de tu negocio.</p>
		</header>
		<p v-if="!habilitada || estado.disponible === false" class="implementacion-linea__mensaje">
			El seguimiento de la implementación no está disponible para esta sesión.
		</p>
		<p v-else-if="estado.error && !estado.hitos.length" class="implementacion-linea__mensaje" role="status">
			No pudimos cargar el avance. <b-button variant="link" @click="refrescar">Volver a intentar</b-button>
		</p>
		<p v-else-if="estado.disponible === null" class="implementacion-linea__mensaje" role="status">Buscando tus avances…</p>
		<p v-else-if="!estado.hitos.length" class="implementacion-linea__mensaje">
			Acá vas a ver los avances cuando empiece la importación de tu catálogo.
		</p>
		<ol v-else class="implementacion-linea__hitos" aria-label="Etapas de tu implementación">
			<li v-for="hito in estado.hitos" :key="hito.id" :class="'hito-' + hito.estado">
				<div class="implementacion-linea__icono" aria-hidden="true">
					<i :class="'bi bi-' + (hito.icono || 'circle')"></i>
				</div>
				<article>
					<div class="implementacion-linea__estado">
						<span>Etapa {{ hito.etapa }}<template v-if="hito.implementacion === 'agente'"> · Agente de WhatsApp</template></span>
						<span>
							<i v-if="hito.estado === 'completado'" class="bi bi-check-circle-fill" aria-hidden="true"></i>
							{{ rotulos[hito.estado] }}
						</span>
					</div>
					<h2>{{ hito.titulo }}</h2>
					<p v-if="hito.detalle">{{ hito.detalle }}</p>
					<p v-if="hito.aprobado === true"><i class="bi bi-check2" aria-hidden="true"></i> Preparación aprobada</p>
					<b-button v-if="es_aviso(hito)" size="sm" variant="outline-primary" @click="abrir(hito, $event)">Ver avance</b-button>
				</article>
			</li>
		</ol>
	</main>
</template>

<script>
import { puede_ver_implementacion } from '@/store/implementacion'

export default {
	data() {
		return {
			rotulos: {
				pendiente: 'Pendiente',
				en_curso: 'En curso',
				completado: 'Completada',
				parcial: 'Avance parcial',
				error: 'Hay un problema',
			},
		}
	},
	computed: {
		habilitada() {
			return puede_ver_implementacion(this.$store.state.auth)
		},
		estado() {
			return this.$store.state.implementacion
		},
	},
	methods: {
		refrescar() {
			this.$store.dispatch('implementacion/refrescar')
		},
		es_aviso(hito) {
			return ['completado', 'parcial', 'error'].includes(hito.estado)
		},
		abrir(hito, event) {
			this.$store.commit('implementacion/abrir', { hito, foco: event.currentTarget })
		},
	},
}
</script>

<style lang="sass" scoped>
.implementacion-linea
	width: 100%
	max-width: 49rem
	margin: 0 auto
	padding: clamp(.75rem, 3vw, 2rem)
	color: var(--cc-text, inherit)
	header
		padding: clamp(1.15rem, 4vw, 2.2rem)
		border-radius: 1.15rem
		background: linear-gradient(120deg, #182a5b, #344fc1)
		color: white
		p:last-child
			margin-bottom: 0
	h1
		font-size: clamp(1.65rem, 5vw, 2.7rem)
		font-weight: 750
		overflow-wrap: anywhere
	&__leyenda
		margin-bottom: .5rem
		color: #c6dcff
		font-size: .875rem
		font-weight: 700
	&__mensaje
		margin: 1.5rem 0
	&__hitos
		margin: 1.5rem 0 0 .25rem
		padding: 0
		list-style: none
		li
			position: relative
			display: grid
			grid-template-columns: 2.5rem minmax(0, 1fr)
			gap: clamp(.45rem, 2vw, 1rem)
			padding-bottom: 1rem
			&:not(:last-child)::before
				content: ''
				position: absolute
				left: calc(1.25rem - 1px)
				top: 2.4rem
				bottom: -.15rem
				border-left: 2px solid #7b92c780
		article
			padding: .85rem 1rem
			border: 1px solid #8399d060
			border-radius: .8rem
			overflow-wrap: anywhere
			text-align: left
			h2
				font-size: 1.12rem
				font-weight: 700
				margin: .3rem 0
			p
				margin: .35rem 0
			.btn
				margin-top: .35rem
	&__icono
		z-index: 1
		display: grid
		place-items: center
		width: 2.5rem
		height: 2.5rem
		border-radius: 50%
		background: #dce8ff
		color: #223983
		.hito-completado &
			background: #d3f3e5
			color: #176b4a
		.hito-error &
			background: #ffddd5
			color: #9b361a
	&__estado
		display: flex
		flex-wrap: wrap
		gap: .2rem .65rem
		font-size: .8rem
		font-weight: 700
</style>
