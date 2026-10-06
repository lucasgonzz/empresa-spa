<template>
<div
class="cat-eleccion"
data-testid="categorias-resumen-eleccion"
:data-propuesta="run.propuesta_elegida_id">

	<span
	class="cat-eleccion__icono"
	aria-hidden="true">
		<i class="bi bi-check2-circle"></i>
	</span>

	<div class="cat-eleccion__cuerpo">
		<p
		class="cat-eleccion__titulo"
		data-testid="categorias-eleccion-titulo">
			<template v-if="propuesta">
				Elegiste el sistema «{{ propuesta.nombre }}»
			</template>
			<template v-else>
				Ya elegiste un sistema de categorías
			</template>
		</p>

		<p
		v-for="(frase, indice) in frases"
		:key="'frase-' + indice"
		class="cat-eleccion__frase">
			{{ frase }}
		</p>

		<!-- Lo que falta, con los conteos vivos de la revisión (bajan a medida que se aprueba o se rechaza). -->
		<p
		class="cat-eleccion__frase cat-eleccion__frase--queda"
		data-testid="categorias-eleccion-queda">
			{{ queda }}
		</p>

		<!--
			Por qué ya no se puede cambiar de sistema. Lo dice la API (`motivo_no_puede_cambiar`); si el
			motivo no se conoce o no hay, no se inventa uno: simplemente no se ofrece el botón.
		-->
		<p
		v-if="!run.puede_cambiar && motivo"
		class="cat-eleccion__nota"
		data-testid="categorias-no-se-puede-cambiar">
			Ya no se puede cambiar de sistema: {{ motivo }}.
		</p>
	</div>

	<b-button
	v-if="run.puede_cambiar && run.puede_gestionar"
	class="btn-modulo cat-eleccion__cambiar"
	variant="outline-secondary"
	data-testid="categorias-cambiar-sistema"
	:disabled="ocupado"
	@click="$emit('cambiar')">
		Cambiar de sistema
	</b-button>

</div>
</template>
<script>
import { frases_del_resultado, frase_de_lo_que_queda, texto_de_motivo_no_puede_cambiar } from '@/components/alertas/components/lista-de-alertas-table/catalogo/categorias/textos'

/**
 * El cartel de arriba de la revisión cuando el dueño ya eligió un sistema de categorías: cuál eligió,
 * qué hizo (qué se creó y cuántos artículos quedaron en su categoría), qué falta revisar y, si la API
 * dice que todavía se puede, "Cambiar de sistema".
 *
 * 🔴 "Cambiar de sistema" aparece o no según `run.puede_cambiar`, que calcula la API con la misma
 * función que usa para aceptar el pedido (solo mientras nadie haya revisado ni editado nada a mano).
 * Esta pantalla NO lo deduce de los conteos ni de nada propio: dibuja lo que dice la API. Cuando no
 * se puede, muestra el motivo que mande (`motivo_no_puede_cambiar`).
 *
 * Props: `run` (el de `actual`, normalizado), `propuesta` (el sistema elegido, o null si no se
 * encuentra entre las tarjetas), `conteos` (los vivos de la revisión) y `ocupado` (hay una acción
 * en curso). Evento: `cambiar` (la confirmación y el pedido los hace Index.vue).
 */
export default {
	props: {
		/** La corrida elegida: `{propuesta_elegida_id, resultado, puede_cambiar, motivo_no_puede_cambiar, puede_gestionar}`. */
		run: {
			type: Object,
			required: true,
		},
		/** La tarjeta elegida, o null. */
		propuesta: {
			type: Object,
			default: null,
		},
		/** `{a_revisar, asignados, sin_categoria}`. */
		conteos: {
			type: Object,
			default: () => ({ a_revisar: 0, asignados: 0, sin_categoria: 0 }),
		},
		/** true mientras hay una acción en curso: el botón se apaga. */
		ocupado: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		/**
		 * Lo que hizo la elección (se creó, se reutilizó, se quitó, se ubicó), en frases.
		 *
		 * @returns {Array<String>}
		 */
		frases() {
			return frases_del_resultado(this.run.resultado)
		},
		/**
		 * Lo que falta, con los conteos vivos.
		 *
		 * @returns {String}
		 */
		queda() {
			return frase_de_lo_que_queda(this.conteos)
		},
		/**
		 * El motivo por el que ya no se puede cambiar de sistema, traducido ('' si no se sabe).
		 *
		 * @returns {String}
		 */
		motivo() {
			return texto_de_motivo_no_puede_cambiar(this.run.motivo_no_puede_cambiar)
		},
	},
}
</script>
<style lang="sass">
// Sin scope a proposito (reglas prefijadas con cat-eleccion). Verde apagado del sistema (los tokens
// de las cajas abiertas, con par claro y oscuro) y texto por token.
.cat-eleccion
	display: flex
	align-items: flex-start
	gap: 14px
	margin-bottom: 18px
	padding: 16px 18px
	border-radius: 14px
	background: var(--caja-abierta-fondo, #f2f7f4)
	text-align: left

.cat-eleccion__icono
	flex: 0 0 auto
	font-size: 1.5rem
	line-height: 1
	color: var(--caja-abierta-acento, #2f7d5d)

.cat-eleccion__cuerpo
	flex: 1 1 auto
	min-width: 0

.cat-eleccion__titulo
	margin: 0 0 4px
	font-size: 1rem
	font-weight: 600
	line-height: 1.35
	color: var(--caja-abierta-texto, #1e6047)
	overflow-wrap: anywhere

.cat-eleccion__frase
	margin: 2px 0 0
	font-size: 0.875rem
	line-height: 1.45
	color: var(--color-text-primary, #212529)

.cat-eleccion__frase--queda
	font-weight: 600

.cat-eleccion__nota
	margin: 6px 0 0
	font-size: 0.8125rem
	line-height: 1.4
	color: var(--color-text-secondary, #6c757d)

.cat-eleccion__cambiar
	flex: 0 0 auto
	align-self: center

// Telefono: el cartel en columna y el boton a lo ancho, que es donde el dedo lo encuentra.
@media (max-width: 575px)
	.cat-eleccion
		flex-wrap: wrap
		padding: 14px

	.cat-eleccion__cuerpo
		flex-basis: calc(100% - 50px)

	.cat-eleccion__cambiar.btn
		flex: 1 1 100%
		width: 100%
</style>
