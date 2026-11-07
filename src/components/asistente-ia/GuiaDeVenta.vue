<template>
	<div class="asistente-guia-venta">
		<button type="button" :disabled="cargando || activa" @click="iniciar">
			<i class="bi bi-signpost-split" aria-hidden="true"></i>
			{{ activa ? 'Recorrido en curso' : 'Guiame para cargar una venta' }}
		</button>
		<small v-if="aviso" role="status">{{ aviso }}</small>
	</div>
</template>

<script>
import { ajustar_guia_a_vender, pasos_de_guia } from '@/tours/guia-vender'

const PASOS = [
	{ id: 'abrir_buscador', texto: 'Abrí el buscador para agregar un artículo a la venta.' },
	{ id: 'escribir_nombre', texto: 'Escribí el nombre del artículo.' },
	{ id: 'buscar_nombre', texto: 'Presioná Enter para buscarlo.' },
	{ id: 'elegir_resultado', texto: 'Elegí el artículo que querés agregar.' },
]

function visible(selector) {
	const elemento = document.querySelector(selector)
	return Boolean(elemento && elemento.getClientRects().length)
}

export default {
	data() {
		return { activa: false, cargando: false, aviso: '' }
	},
	beforeDestroy() {
		this.terminar()
	},
	methods: {
		iniciar() {
			this.aviso = ''
			const buscador = visible('#search-article') || visible('#search-article-search-modal.show')
			const codigo = visible('[data-tour="vender.campo_codigo_barras"]')
			if (!buscador && !codigo) {
				this.aviso = 'Volvé a la etapa donde agregás los artículos para iniciar el recorrido.'
				return
			}
			const guia = buscador ? PASOS : [{ id: 'codigo_barras', texto: 'Escaneá el código de un artículo o escribilo y presioná Enter.' }]
			this.cargando = true
			import('@/tours/motor').then(motor => {
				if (this._isDestroyed) return
				this.motor = motor
				this.$emit('vista-lateral')
				this.$emit('activa', true)
				this.$nextTick(() => {
					if (this._isDestroyed) return
					const pasos = ajustar_guia_a_vender(pasos_de_guia(guia)).concat({
						selector: '[data-tour="vender.boton_guardar_venta"]',
						texto: 'Revisá los artículos y el total. Cuando quieras registrar la venta, usá Guardar venta.',
						avanza: 'boton',
					})
					this.activa = motor.iniciar_tour({ id: 'asistente-venta', pasos }, {
						root: this.$root,
						router: this.$router,
						al_faltar_pasos: () => {
							this.aviso = 'El recorrido se interrumpió porque cambió la pantalla. Podés iniciarlo de nuevo.'
						},
						al_terminar: () => this.limpiar(),
					})
					if (!this.activa) this.limpiar()
				})
			}).catch(() => {
				this.limpiar()
				this.aviso = 'No se pudo iniciar el recorrido. Probá de nuevo.'
			})
		},
		terminar() {
			if (this.activa && this.motor) this.motor.cortar_tour()
			this.limpiar()
		},
		limpiar() {
			this.activa = false
			this.cargando = false
			this.$emit('activa', false)
		},
	},
}
</script>

<style lang="sass" scoped>
.asistente-guia-venta
	display: flex
	align-items: center
	flex-wrap: wrap
	gap: .5rem
	padding: .35rem 1rem
	button
		padding: .35rem .65rem
		border: 1px solid rgba(165, 180, 252, .42)
		border-radius: 9px
		background: transparent
		color: inherit
		font-size: .85rem
		i
			margin-right: .3rem
</style>
