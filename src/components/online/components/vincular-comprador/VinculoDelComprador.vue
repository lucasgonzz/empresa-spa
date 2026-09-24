<template>
	<!--
		Bloque "Cliente del sistema" del modal de un comprador, en Tienda online → Clientes. Reemplaza
		al campo "Asignar a un cliente ya cargado en el sistema" (`ComercioCityUser`), que pedía
		escribir el nombre TAL CUAL figuraba y tomaba el primero de varios homónimos.

		Si el comprador ya está vinculado, dice con quién. Si no, ofrece un botón que abre el modal de
		vincular (vincular-comprador/Index.vue), donde se ven todas las coincidencias y se elige por id.

		Termina con el <hr> que tenía `ComercioCityUser`: separa este bloque del resto del formulario.
	-->
	<div>
		<div
		v-if="model && model.id && vinculado"
		data-testid="vincular-comprador-cliente-vinculado">
			<label class="form-label">
				<i class="icon-right"></i>
				Cliente del sistema
			</label>
			<p>
				<i class="icon-user"></i>
				{{ nombre_del_cliente }}
			</p>
		</div>
		<div v-else-if="model && model.id">
			<label class="form-label">
				<i class="icon-right"></i>
				Cliente del sistema
			</label>
			<p class="vinculo-comprador__ayuda">
				Este comprador de la tienda todavía no está asociado a ningún cliente del sistema.
			</p>
			<b-button
			variant="outline-primary"
			size="sm"
			data-testid="vincular-comprador-abrir"
			@click="abrir">
				<i class="bi bi-link-45deg"></i>
				<span class="vinculo-comprador__btn-texto">
					Vincular con un cliente del sistema
				</span>
			</b-button>
		</div>
		<hr>
	</div>
</template>
<script>
import sin_vincular from '@/components/online/components/vincular-comprador/sin_vincular'

/**
 * Bloque de vínculo del modal del comprador (misión vincular-comprador-desde-pedidos, 24/9/2026).
 *
 * No vincula nada por sí mismo: el botón cierra el modal del comprador y le pide al modal de
 * vincular —montado una sola vez en views/Online.vue— que se abra con este comprador, por el
 * evento global `vincular-comprador:abrir`. Cuando se vincula, el store de compradores se
 * actualiza y la fila de la tabla ya muestra el cliente.
 */
export default {
	props: {
		/** Comprador de la fila (el `model` que entrega el modal genérico en su slot por defecto). */
		model: {
			type: Object,
			default: null,
		},
	},
	computed: {
		/**
		 * true si el comprador está vinculado a un cliente del sistema vivo: es la regla inversa de
		 * "sin vincular" (sin_vincular.js), la misma que usa el badge de Pedidos.
		 *
		 * @returns {Boolean}
		 */
		vinculado() {
			return !!this.model && !sin_vincular(this.model)
		},
		/**
		 * Nombre del cliente vinculado. Si la API mandó el id pero no la relación cargada (una versión
		 * vieja), se muestra el número: es un vínculo válido aunque no se pueda nombrar.
		 *
		 * @returns {String}
		 */
		nombre_del_cliente() {
			let cliente = this.model ? this.model.comercio_city_client : null

			if (cliente && cliente.name) {
				return cliente.name
			}

			return this.model && this.model.comercio_city_client_id ? 'Cliente N° ' + this.model.comercio_city_client_id : ''
		},
	},
	methods: {
		/**
		 * Cierra el modal del comprador y abre el de vincular.
		 *
		 * @returns {void}
		 */
		abrir() {
			this.$bvModal.hide('buyer')
			this.$root.$emit('vincular-comprador:abrir', { buyer: this.model })
		},
	},
}
</script>
<style lang="sass">
// Bloque del modal de un comprador. Sin `scoped`: el modal cuelga de <body>, y el prefijo
// `vinculo-comprador` es propio de este componente.
.vinculo-comprador__ayuda
	margin-bottom: 10px
	color: var(--color-text-secondary)
	font-size: 0.875rem
	line-height: 1.4
	text-align: left

// 🔴 El margen va en el <span> y no en el <i>: con el `whitespace: condense` de Vue, un <i> y un
// <span> en líneas separadas quedan pegados.
.vinculo-comprador__btn-texto
	margin-left: 6px
</style>
