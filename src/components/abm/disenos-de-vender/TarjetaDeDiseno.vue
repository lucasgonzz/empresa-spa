<template>
	<!--
		Tarjeta de un Diseño de Vender en la solapa del ABM: la miniatura arriba (como la de un
		documento), y abajo el nombre, la insignia "En uso", cuantos campos tiene y las acciones.

		Un clic en cualquier parte de la tarjeta abre el editor; las acciones frenan el clic para no
		abrirlo ademas de hacer lo suyo. Por teclado, el camino es el boton "Editar".
	-->
	<article
	class="tarjeta-de-diseno"
	:class="{ 'tarjeta-de-diseno--en-uso': en_uso }"
	@click="$emit('editar')">

		<div class="tarjeta-de-diseno__vista">
			<miniatura-de-diseno :modelo="modelo"></miniatura-de-diseno>
		</div>

		<div class="tarjeta-de-diseno__cuerpo">
			<div class="tarjeta-de-diseno__encabezado">
				<h3
				class="tarjeta-de-diseno__nombre"
				:title="modelo.name">{{ modelo.name }}</h3>
				<span
				v-if="en_uso"
				class="tarjeta-de-diseno__insignia">
					<i class="bi bi-check-circle-fill"></i>
					En uso
				</span>
			</div>

			<p class="tarjeta-de-diseno__detalle">{{ detalle }}</p>

			<div
			class="tarjeta-de-diseno__acciones"
			@click.stop>
				<b-button
				size="sm"
				variant="outline-secondary"
				class="tarjeta-de-diseno__boton"
				:aria-label="'Editar el diseño ' + modelo.name"
				@click="$emit('editar')">
					<i class="bi bi-pencil"></i>
					Editar
				</b-button>

				<b-button
				v-if="!en_uso"
				size="sm"
				variant="outline-primary"
				class="tarjeta-de-diseno__boton"
				:aria-label="'Usar el diseño ' + modelo.name + ' en Vender'"
				@click="$emit('usar')">
					Usar este diseño
				</b-button>

				<span class="tarjeta-de-diseno__iconos">
					<button
					type="button"
					class="tarjeta-de-diseno__icono"
					title="Duplicar"
					:aria-label="'Duplicar el diseño ' + modelo.name"
					@click="$emit('duplicar')">
						<i class="bi bi-copy"></i>
					</button>

					<!--
						El que esta en uso no se elimina. El boton queda deshabilitado y la explicacion va
						en el envoltorio: un <button disabled> no recibe el mouse, asi que su propio title
						no se veria nunca.
					-->
					<span
					class="tarjeta-de-diseno__envoltorio"
					:title="en_uso ? 'No se puede eliminar el diseño en uso. Poné otro diseño en uso y después eliminá este.' : 'Eliminar'">
						<button
						type="button"
						class="tarjeta-de-diseno__icono tarjeta-de-diseno__icono--peligro"
						:disabled="en_uso"
						:aria-label="en_uso ? 'No se puede eliminar el diseño en uso' : 'Eliminar el diseño ' + modelo.name"
						@click="$emit('eliminar')">
							<i class="bi bi-trash3"></i>
						</button>
					</span>
				</span>
			</div>
		</div>
	</article>
</template>
<script>
import MiniaturaDeDiseno from './MiniaturaDeDiseno'
import { ETAPAS, KEY_SEPARADOR, esta_disponible } from '@/components/vender/layout/elementos'
import { resolver_diseno, elementos_visibles } from '@/components/vender/layout/resolver_diseno'

/**
 * Tarjeta de un Diseño de Vender en la solapa (mision diseno-vender-configurable, 28/9/2026).
 * Solo muestra y avisa (`editar`, `usar`, `duplicar`, `eliminar`): los pedidos los hace la solapa.
 */
export default {
	name: 'TarjetaDeDiseno',
	components: {
		MiniaturaDeDiseno,
	},
	props: {
		/* El vender_layout */
		modelo: {
			type: Object,
			required: true,
		},
		/* Si es el diseño en uso (lo decide la solapa con diseno_en_uso) */
		en_uso: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		/**
		 * La linea de detalle: si es el diseño del sistema, cuantos campos se ven en Vender y cuantos
		 * estan sacados (de los que este negocio puede usar).
		 *
		 * @returns {string}
		 */
		detalle() {
			let self = this
			let resuelto = resolver_diseno(this.modelo.layout, this)
			let campos = 0
			let sacados = 0

			ETAPAS.forEach(function (etapa) {
				elementos_visibles(resuelto, etapa, self).forEach(function (item) {
					if (item.key !== KEY_SEPARADOR) {
						campos++
					}
				})
			})

			resuelto.sacados.forEach(function (key) {
				if (esta_disponible(key, self)) {
					sacados++
				}
			})

			let partes = []

			if (this.modelo.layout === null || typeof this.modelo.layout == 'undefined') {
				partes.push('Diseño original del sistema')
			}

			partes.push(campos + (campos === 1 ? ' campo' : ' campos'))

			if (sacados) {
				partes.push(sacados + (sacados === 1 ? ' sacado' : ' sacados'))
			}

			return partes.join(' · ')
		},
	},
}
</script>
<style lang="sass">
// Tarjeta calma: borde sutil por token, radio de 12px y sin sombra en reposo (la sombra del sistema
// queda para lo que se esta arrastrando en el editor). El que esta en uso se distingue por la
// insignia y por el borde en el color primario.
.tarjeta-de-diseno
	display: flex
	flex-direction: column
	min-width: 0
	border: 1px solid var(--color-border)
	border-radius: 12px
	background: var(--bg-card)
	overflow: hidden
	cursor: pointer
	transition: border-color .15s ease, box-shadow .15s ease

	&:hover
		border-color: var(--color-border-tertiary)
		box-shadow: 0 4px 14px var(--shadow-color)

.tarjeta-de-diseno--en-uso
	border-color: var(--color-primary)

	&:hover
		border-color: var(--color-primary)

.tarjeta-de-diseno__vista
	padding: 14px 16px 12px
	border-bottom: 1px solid var(--color-border-secondary)
	background: var(--bg-section)

.tarjeta-de-diseno__cuerpo
	display: flex
	flex-direction: column
	gap: 4px
	flex: 1 1 auto
	padding: 12px 16px 14px

.tarjeta-de-diseno__encabezado
	display: flex
	align-items: center
	gap: 10px
	min-width: 0

.tarjeta-de-diseno__nombre
	flex: 1 1 auto
	min-width: 0
	margin: 0
	font-size: 0.95rem
	font-weight: 600
	color: var(--color-text-primary)
	white-space: nowrap
	overflow: hidden
	text-overflow: ellipsis

// "En uso": pastilla azul suave (fondo --bg-nav-hover, el azulado del sistema, con su variante oscura)
.tarjeta-de-diseno__insignia
	display: inline-flex
	align-items: center
	gap: 5px
	flex: 0 0 auto
	padding: 3px 10px
	border-radius: 999px
	background: var(--bg-nav-hover)
	color: var(--color-primary)
	font-size: 0.72rem
	font-weight: 700
	letter-spacing: .2px

.tarjeta-de-diseno__detalle
	margin: 0
	color: var(--color-text-secondary)
	font-size: 0.78rem

.tarjeta-de-diseno__acciones
	display: flex
	flex-wrap: wrap
	align-items: center
	gap: 8px
	margin-top: 10px
	cursor: default

.tarjeta-de-diseno__boton.btn
	display: inline-flex
	align-items: center
	gap: 6px
	border-radius: 8px
	white-space: nowrap

.tarjeta-de-diseno__iconos
	display: inline-flex
	align-items: center
	gap: 2px
	margin-left: auto

.tarjeta-de-diseno__envoltorio
	display: inline-flex

.tarjeta-de-diseno__icono
	display: inline-flex
	align-items: center
	justify-content: center
	width: 32px
	height: 32px
	padding: 0
	border: 0
	border-radius: 8px
	background: transparent
	color: var(--color-text-secondary)
	font-size: 0.9rem
	cursor: pointer
	transition: background .15s ease, color .15s ease

	&:hover:not(:disabled)
		background: var(--bg-hover)
		color: var(--color-text-primary)

	&:focus
		outline: none

	&:focus-visible
		box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)

	// Un boton deshabilitado no recibe el mouse: asi el title del envoltorio si se ve
	&:disabled
		opacity: .35
		cursor: default
		pointer-events: none

.tarjeta-de-diseno__icono--peligro:hover:not(:disabled)
	background: var(--btn-peligro-fondo)
	color: var(--btn-peligro-texto)
</style>
