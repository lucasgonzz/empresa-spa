<template>
	<section class="agentes-reportes" aria-label="Reportes diarios">
		<h2>Reportes diarios</h2>
		<p v-if="loading && !ultimos.length" role="status">Buscando tus reportes…</p>
		<p v-else-if="!ultimos.length">{{ motivo === 'error' ? 'No pudimos cargar tus reportes.' : 'Cuando haya reportes listos, van a aparecer acá.' }}</p>
		<div v-else class="agentes-reportes__tarjetas">
			<button v-for="reporte in ultimos" :key="reporte.id" type="button" @click="$emit('abrir', reporte)">
				<i class="bi bi-file-earmark-bar-graph" aria-hidden="true"></i>
				<strong>{{ reporte.titulo }}</strong>
				<small v-if="reporte.fecha">{{ formato_fecha(reporte.fecha) }}</small>
			</button>
		</div>
		<button v-if="motivo === 'error'" class="agentes-reportes__enlace" type="button" @click="cargar">Reintentar</button>
		<details v-if="anteriores.length">
			<summary>Reportes anteriores</summary>
			<div class="agentes-reportes__tarjetas">
				<button v-for="reporte in anteriores" :key="reporte.id" type="button" @click="$emit('abrir', reporte)">
					<strong>{{ reporte.titulo }}</strong>
					<small v-if="reporte.fecha">{{ formato_fecha(reporte.fecha) }}</small>
				</button>
			</div>
		</details>
	</section>
</template>

<script>
import moment from 'moment'

export default {
	computed: {
		ultimos() { return this.$store.state.mostrador.ultimos },
		anteriores() { return this.$store.state.mostrador.anteriores },
		loading() { return this.$store.state.mostrador.loading },
		motivo() { return this.$store.state.mostrador.motivo_vacio },
	},
	created() {
		if (!this.loading) this.cargar()
	},
	methods: {
		cargar() { this.$store.dispatch('mostrador/getReportes', { silencioso: true }) },
		formato_fecha(fecha) { return moment(fecha).format('DD/MM/YYYY') },
	},
}
</script>

<style lang="sass" scoped>
.agentes-reportes
	width: 100%
	margin: 0 auto 20px
	h2
		font-size: .9rem
		font-weight: 700
	p, summary, small
		color: var(--ia-texto-2)
		font-size: .8rem
	summary
		margin: 12px 0 8px
		cursor: pointer
	&__tarjetas
		display: grid
		grid-template-columns: repeat(auto-fit, minmax(min(132px, 100%), 1fr))
		gap: 8px
		button
			display: grid
			align-content: start
			gap: 4px
			padding: 10px
			border: 1px solid var(--ia-borde)
			border-radius: 12px
			background: var(--ia-bg-elevado)
			color: var(--ia-texto)
			text-align: left
			font-size: .8rem
			&:hover, &:focus-visible
				border-color: var(--ia-foco)
			i
				color: var(--ia-primario)
	&__enlace
		padding: 0
		border: 0
		background: transparent
		color: var(--ia-primario)
</style>
