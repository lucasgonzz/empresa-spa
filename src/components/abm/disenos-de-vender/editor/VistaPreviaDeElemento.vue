<template>
	<!--
		Dibujo del control de un campo de Vender, adentro de su tarjeta en el editor. Es solo
		ilustracion: aria-hidden porque el nombre del campo ya lo lee la tarjeta, y sin ningun
		<input>/<select> real (ver el comentario de vistas_previas.js).
	-->
	<div
	class="vista-previa-vender"
	:class="'vista-previa-vender--' + vista.tipo"
	aria-hidden="true">

		<!-- Grupo con prepend y un select (o una fecha) falso -->
		<div
		v-if="vista.tipo === 'select' || vista.tipo === 'fecha'"
		class="vista-previa-vender__grupo">
			<span class="vista-previa-vender__prepend">{{ vista.prepend }}</span>
			<span class="vista-previa-vender__campo">
				<span class="vista-previa-vender__valor">{{ vista.valor }}</span>
				<i
				class="bi vista-previa-vender__flecha"
				:class="vista.tipo === 'fecha' ? 'bi-calendar3' : 'bi-chevron-down'"></i>
			</span>
			<span
			v-if="vista.append === 'mas'"
			class="vista-previa-vender__append vista-previa-vender__append--acento">
				<i class="bi bi-plus-lg"></i>
			</span>
			<span
			v-else-if="vista.append === 'info'"
			class="vista-previa-vender__append">
				<i class="bi bi-info-circle"></i>
			</span>
		</div>

		<!-- Campo de texto, con prepend o icono opcionales -->
		<div
		v-else-if="vista.tipo === 'input'"
		class="vista-previa-vender__grupo">
			<span
			v-if="vista.prepend"
			class="vista-previa-vender__prepend">{{ vista.prepend }}</span>
			<span class="vista-previa-vender__campo">
				<i
				v-if="vista.icono"
				class="bi vista-previa-vender__icono"
				:class="vista.icono"></i>
				<span class="vista-previa-vender__placeholder">{{ vista.placeholder }}</span>
			</span>
		</div>

		<!-- Buscador redondeado con lupa -->
		<div
		v-else-if="vista.tipo === 'buscador'"
		class="vista-previa-vender__buscador">
			<i
			class="bi vista-previa-vender__icono"
			:class="vista.icono || 'bi-search'"></i>
			<span class="vista-previa-vender__placeholder">{{ vista.placeholder }}</span>
		</div>

		<!-- Interruptor tipo iPhone con su texto -->
		<div
		v-else-if="vista.tipo === 'toggle'"
		class="vista-previa-vender__opcion">
			<span
			class="vista-previa-vender__pista"
			:class="{ 'vista-previa-vender__pista--prendida': vista.encendido }">
				<span class="vista-previa-vender__perilla"></span>
			</span>
			<span class="vista-previa-vender__texto">{{ vista.texto }}</span>
		</div>

		<!-- Casilla con su texto -->
		<div
		v-else-if="vista.tipo === 'checkbox'"
		class="vista-previa-vender__opcion">
			<span class="vista-previa-vender__casilla"></span>
			<span class="vista-previa-vender__texto">{{ vista.texto }}</span>
		</div>

		<!-- Etiqueta arriba y un area de texto de un renglon -->
		<div
		v-else-if="vista.tipo === 'textarea'"
		class="vista-previa-vender__area">
			<span class="vista-previa-vender__etiqueta">{{ vista.etiqueta }}</span>
			<span class="vista-previa-vender__campo">
				<span class="vista-previa-vender__placeholder">{{ vista.placeholder }}</span>
			</span>
		</div>

		<!-- Panel: descuentos, recargos, puntos, nota de credito -->
		<div
		v-else-if="vista.tipo === 'panel'"
		class="vista-previa-vender__panel"
		:class="vista.acento ? 'vista-previa-vender__panel--' + vista.acento : ''">
			<span class="vista-previa-vender__panel-cabecera">
				<span class="vista-previa-vender__panel-titulo">{{ vista.titulo }}</span>
				<span class="vista-previa-vender__panel-subtitulo">{{ vista.subtitulo }}</span>
			</span>
			<span
			v-for="fila in 2"
			:key="fila"
			class="vista-previa-vender__panel-fila">
				<span class="vista-previa-vender__pista">
					<span class="vista-previa-vender__perilla"></span>
				</span>
				<span class="vista-previa-vender__renglon"></span>
			</span>
		</div>

		<!-- Barra de resumen de la etapa 2: total, cliente y metodo de pago -->
		<div
		v-else-if="vista.tipo === 'resumen'"
		class="vista-previa-vender__resumen">
			<span class="vista-previa-vender__resumen-bloque">
				<span class="vista-previa-vender__total">$ 0,00</span>
				<span class="vista-previa-vender__resumen-detalle">0 productos</span>
			</span>
			<span class="vista-previa-vender__resumen-bloque">
				<span class="vista-previa-vender__resumen-detalle">
					<i class="bi bi-person"></i>
					Sin cliente
				</span>
			</span>
			<span class="vista-previa-vender__resumen-bloque">
				<span class="vista-previa-vender__resumen-detalle">Efectivo</span>
			</span>
		</div>

		<!-- La linea del separador -->
		<div
		v-else-if="vista.tipo === 'separador'"
		class="vista-previa-vender__separador"></div>

		<!-- Campo sin vista previa propia (uno que se agregue a Vender en el futuro) -->
		<div
		v-else
		class="vista-previa-vender__generico"></div>
	</div>
</template>
<script>
import { vista_previa } from './vistas_previas'

/**
 * Vista previa del control de un campo de Vender (mision diseno-vender-configurable, 28/9/2026).
 *
 * Presentacional pura: recibe la key y dibuja lo que dice vistas_previas.js. No maneja eventos ni
 * tiene estado; el arrastre y el ancho los maneja la tarjeta que la contiene (ElementoDelEditor.vue).
 */
export default {
	name: 'VistaPreviaDeElemento',
	props: {
		/* Key del elemento del catalogo ('metodo_de_pago', 'separador', ...). No puede llamarse `key`: es un atributo reservado de Vue. */
		clave: {
			type: String,
			required: true,
		},
	},
	computed: {
		/**
		 * Descripcion de la vista previa de esta key (o la generica).
		 *
		 * @returns {Object}
		 */
		vista() {
			return vista_previa(this.clave)
		},
	},
}
</script>
<style lang="sass">
// Sin `scoped` a proposito: mientras se arrastra una tarjeta, Sortable dibuja un clon que sigue al
// puntero colgado de <body>, fuera del componente, y ese clon tiene que verse igual que la tarjeta.
// Las clases llevan todas el prefijo vista-previa-vender__ para no chocar con nada del sistema.
//
// Todo en una escala mas chica que los controles reales (alto de 28px contra los 36px de Vender):
// es una miniatura dentro de una tarjeta, no el control. Colores solo por token.
.vista-previa-vender
	width: 100%
	min-width: 0
	pointer-events: none
	font-size: 0.72rem
	line-height: 1.2
	color: var(--color-text-secondary)

	// Grupo: prepend + campo (+ append), con un solo borde alrededor como un b-input-group
	.vista-previa-vender__grupo
		display: flex
		align-items: stretch
		height: 28px
		min-width: 0
		border: 1px solid var(--color-border)
		border-radius: 6px
		overflow: hidden
		background: var(--bg-card)

	.vista-previa-vender__prepend
		display: flex
		align-items: center
		flex: 0 1 auto
		min-width: 0
		max-width: 60%
		padding: 0 8px
		background: var(--bg-section)
		border-right: 1px solid var(--color-border)
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	.vista-previa-vender__campo
		display: flex
		align-items: center
		gap: 6px
		flex: 1 1 auto
		min-width: 0
		padding: 0 8px
		color: var(--color-text-primary)
		white-space: nowrap
		overflow: hidden

	.vista-previa-vender__valor
		flex: 1 1 auto
		min-width: 0
		overflow: hidden
		text-overflow: ellipsis

	.vista-previa-vender__flecha
		flex: 0 0 auto
		font-size: 0.65rem
		color: var(--color-text-secondary)

	.vista-previa-vender__append
		display: flex
		align-items: center
		justify-content: center
		flex: 0 0 28px
		background: var(--bg-section)
		border-left: 1px solid var(--color-border)

	// El boton de varios metodos de pago es verde en Vender: aca, el acento verde de la etapa 2
	.vista-previa-vender__append--acento
		color: var(--color-text-success-strong, var(--success))

	.vista-previa-vender__placeholder
		flex: 1 1 auto
		min-width: 0
		color: var(--color-text-secondary)
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	.vista-previa-vender__icono
		flex: 0 0 auto
		color: var(--color-text-secondary)

	.vista-previa-vender__buscador
		display: flex
		align-items: center
		gap: 6px
		height: 28px
		min-width: 0
		padding: 0 10px
		border: 1px solid var(--color-border)
		border-radius: 999px
		background: var(--bg-card)

	// Toggle y casilla: control + texto en una fila
	.vista-previa-vender__opcion
		display: flex
		align-items: center
		gap: 8px
		min-height: 28px
		min-width: 0

	.vista-previa-vender__texto
		flex: 1 1 auto
		min-width: 0
		color: var(--color-text-primary)
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	// Mismo dibujo que el toggle de Vender (pista + perilla), en chico
	.vista-previa-vender__pista
		position: relative
		display: inline-block
		flex: 0 0 26px
		width: 26px
		height: 15px
		border-radius: 999px
		background: var(--toggle-track-off)
		border: 1px solid var(--color-border)

	.vista-previa-vender__pista--prendida
		background: var(--color-text-success-strong, var(--success))
		border-color: transparent

		.vista-previa-vender__perilla
			transform: translateX(11px)

	// La perilla es clara en los dos modos, como en iOS: --bg-card en claro (blanco) y el texto del
	// tema en oscuro (casi blanco). Ver el bloque html.dark-mode de mas abajo.
	.vista-previa-vender__perilla
		position: absolute
		top: 1px
		left: 1px
		width: 11px
		height: 11px
		border-radius: 50%
		background: var(--bg-card)
		box-shadow: 0 1px 2px var(--shadow-color)

	.vista-previa-vender__casilla
		flex: 0 0 14px
		width: 14px
		height: 14px
		border-radius: 4px
		border: 1px solid var(--color-border)
		background: var(--bg-card)

	// Textarea: etiqueta arriba + un renglon
	.vista-previa-vender__area
		display: flex
		flex-direction: column
		gap: 3px
		min-width: 0

		.vista-previa-vender__campo
			height: 28px
			border: 1px solid var(--color-border)
			border-radius: 6px
			background: var(--bg-card)

	.vista-previa-vender__etiqueta
		font-weight: 600
		color: var(--color-text-secondary)
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	// Panel de descuentos/recargos/puntos/nota de credito
	.vista-previa-vender__panel
		display: flex
		flex-direction: column
		gap: 5px
		min-width: 0
		padding: 0 0 7px
		border: 1px solid var(--color-border)
		border-radius: 6px
		overflow: hidden
		background: var(--bg-card)

	.vista-previa-vender__panel-cabecera
		display: flex
		flex-direction: column
		gap: 1px
		padding: 5px 8px
		border-bottom: 1px solid var(--color-border)
		background: var(--bg-section)

	.vista-previa-vender__panel-titulo
		font-weight: 700
		color: var(--color-text-primary)
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	.vista-previa-vender__panel-subtitulo
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	.vista-previa-vender__panel-fila
		display: flex
		align-items: center
		gap: 8px
		padding: 0 8px

	.vista-previa-vender__renglon
		flex: 1 1 auto
		height: 6px
		border-radius: 3px
		background: var(--bg-section)

	// Acento superior como en Vender: verde descuentos, ambar recargos (los tokens de las etapas)
	.vista-previa-vender__panel--descuento
		border-top: 3px solid var(--color-text-success-strong, var(--success))

	.vista-previa-vender__panel--recargo
		border-top: 3px solid var(--color-text-warning-strong, var(--orange))

	// Resumen de la venta: tres bloques en fila, el total primero
	.vista-previa-vender__resumen
		display: flex
		align-items: stretch
		min-width: 0
		border: 1px solid var(--color-border)
		border-radius: 6px
		overflow: hidden
		background: var(--bg-section)

	.vista-previa-vender__resumen-bloque
		display: flex
		flex-direction: column
		justify-content: center
		gap: 1px
		flex: 1 1 0
		min-width: 0
		padding: 5px 10px
		border-left: 1px solid var(--color-border)

		&:first-child
			border-left: 0

	.vista-previa-vender__total
		font-size: 0.9rem
		font-weight: 700
		color: var(--color-text-primary)
		white-space: nowrap

	.vista-previa-vender__resumen-detalle
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	.vista-previa-vender__separador
		height: 0
		margin: 8px 0 4px
		border-top: 1px solid var(--color-border)

	.vista-previa-vender__generico
		height: 28px
		border-radius: 6px
		background: var(--bg-section)

html.dark-mode .vista-previa-vender .vista-previa-vender__perilla
	background: var(--color-text-primary)
</style>
