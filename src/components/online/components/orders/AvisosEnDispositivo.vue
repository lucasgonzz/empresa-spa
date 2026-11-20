<template>
	<section class="mb-3" aria-label="Avisos de pedidos en este dispositivo">
		<p class="mb-1" role="status">{{ texto_estado }}</p>
		<p class="small mb-2">Sólo avisa mientras el sistema esté abierto y conectado en este navegador. No avisa con el sistema cerrado. Como alternativa, configurá los correos de pedidos en la configuración de tu tienda.</p>
		<b-button v-if="estado.elegido" size="sm" variant="outline-secondary" @click="deshabilitar">Desactivar en este dispositivo</b-button>
		<b-button v-else size="sm" variant="outline-primary" :disabled="!puede_habilitar || estado.pendiente" @click="habilitar">Activar en este dispositivo</b-button>
	</section>
</template>
<script>
import { avisador_pedidos } from '@/utils/aviso_pedido_dispositivo'

export default {
	data() {
		return { estado: avisador_pedidos.estado(), cancelar_suscripcion: null }
	},
	computed: {
		puede_habilitar() {
			return ['desactivado', 'habilitado'].indexOf(this.estado.codigo) !== -1
		},
		texto_estado() {
			const textos = {
				sin_soporte: 'Avisos no disponibles en este navegador. Usá un navegador compatible con conexión segura y almacenamiento habilitado.',
				denegado: 'Permiso de avisos denegado. Podés cambiarlo en los permisos del navegador.',
				desconectado: 'Avisos desconectados: necesitás una sesión y conexión en vivo.',
				habilitado: 'Avisos habilitados en este dispositivo.',
				desactivado: 'Avisos desactivados en este dispositivo.',
			}
			if (this.estado.pendiente) return 'Esperando el permiso del navegador…'
			// Este navegador tiene la API pero no deja crear avisos desde la página (Chrome y similares en Android).
			if (this.estado.codigo === 'sin_soporte' && this.estado.motivo === 'constructor') {
				return 'Este navegador no permite mostrar avisos desde esta página (pasa en Chrome y otros navegadores de Android). Usá los correos de pedidos de la configuración de tu tienda.'
			}
			// Permiso y opt-in no prueban que el navegador pueda mostrar el aviso: eso se confirma con el primer pedido.
			if (this.estado.codigo === 'habilitado' && !this.estado.verificado) {
				return textos.habilitado + ' Todavía no se comprobó que el navegador pueda mostrarlos: se confirmará con el primer pedido nuevo.'
			}
			return textos[this.estado.codigo]
		},
	},
	mounted() {
		let self = this
		this.cancelar_suscripcion = avisador_pedidos.suscribir(function actualizar(estado) { self.estado = estado })
		window.addEventListener('focus', this.refrescar)
		window.addEventListener('storage', this.refrescar)
		this.refrescar()
	},
	beforeDestroy() {
		this.cancelar_suscripcion()
		window.removeEventListener('focus', this.refrescar)
		window.removeEventListener('storage', this.refrescar)
	},
	methods: {
		habilitar() { return avisador_pedidos.habilitar() },
		deshabilitar() { avisador_pedidos.deshabilitar() },
		refrescar() { avisador_pedidos.refrescar() },
	},
}
</script>
