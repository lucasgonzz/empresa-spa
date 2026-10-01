<template>
	<!--
		Bloque fijo de la factura de ARCA en una zona del diseñador: los datos del cliente que pide
		ARCA (arriba) o el cuadro de importes + QR + CAE (en el pie). Es un ítem de la lista de la zona
		(clase dpdf-item-de-zona) y siempre ocupa una fila entera (data-cols 12, plan §4.3). Se mueve
		dentro de su zona -- el `move` del diseñador rechaza llevarlo a la otra o a la bandeja -- y no
		tiene ✕ ni manijas: lo pide ARCA (decisión 4 del plan).
	-->
	<div
	class="dpdf-fijo dpdf-item-de-zona"
	:class="clases"
	data-cols="12"
	data-tipo="fijo"
	:data-key="fijo.key"
	:data-testid="'fijo-' + fijo.key + '-disenador-pdf'"
	tabindex="0"
	role="group"
	:aria-label="etiqueta_accesible"
	@click="seleccionar"
	@keydown.enter.self.prevent="seleccionar"
	@keydown.space.self.prevent="seleccionar">
		<div class="dpdf-fijo__tarjeta">
			<i
			class="bi bi-grip-vertical dpdf-fijo__agarre"
			title="Arrastrá para moverlo dentro de su zona"
			aria-hidden="true"></i>
			<span
			class="dpdf-fijo__candado"
			:title="motivo"
			aria-hidden="true">
				<i class="bi bi-lock-fill"></i>
			</span>
			<div class="dpdf-fijo__textos">
				<span class="dpdf-fijo__nombre">{{ nombre }}</span>
				<span
				v-if="descripcion"
				class="dpdf-fijo__descripcion">{{ descripcion }}</span>
			</div>
			<span
			v-if="tiene_importes"
			class="dpdf-fijo__estado"
			:class="{ 'dpdf-fijo__estado--apagado': !fijo.importes }">
				{{ fijo.importes ? 'Con el cuadro de importes' : 'Sin el cuadro de importes' }}
			</span>
		</div>
	</div>
</template>
<script>
/* Lo que se dice del candado de un bloque fijo */
const MOTIVO_DEL_CANDADO = 'Lo pide ARCA: se puede mover dentro de su zona, pero no sacar.'

/**
 * Bloque fijo de la factura de ARCA en el diseñador de PDF (misión diseno-pdf-configurable,
 * 1/10/2026). El nombre y la descripción salen de `fijos` del catálogo; el único dato propio que
 * tiene es `importes` (solo el del pie), que se cambia desde el panel de propiedades.
 */
export default {
	name: 'BloqueFijo',
	inject: ['disenador'],
	props: {
		/* Bloque de trabajo: {tipo: 'fijo', key, (importes)} */
		fijo: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			/* Texto del candado (ver MOTIVO_DEL_CANDADO) */
			motivo: MOTIVO_DEL_CANDADO,
		}
	},
	computed: {
		/**
		 * Definición del bloque en el catálogo ({key, zona, nombre, descripcion}), o null.
		 *
		 * @returns {Object|null}
		 */
		definicion() {
			return this.disenador.fijos_por_key[this.fijo.key] || null
		},
		/**
		 * Nombre del bloque.
		 *
		 * @returns {string}
		 */
		nombre() {
			return this.definicion ? this.definicion.nombre : this.fijo.key
		},
		/**
		 * Explicación del bloque.
		 *
		 * @returns {string}
		 */
		descripcion() {
			return this.definicion ? this.definicion.descripcion : ''
		},
		/**
		 * Si el bloque tiene la opción del cuadro de importes (solo el del pie la trae).
		 *
		 * @returns {boolean}
		 */
		tiene_importes() {
			return Object.prototype.hasOwnProperty.call(this.fijo, 'importes')
		},
		/**
		 * Si este bloque es el seleccionado.
		 *
		 * @returns {boolean}
		 */
		seleccionado() {
			let seleccion = this.disenador.seleccion_actual
			return !!(seleccion && seleccion.item === this.fijo)
		},
		/**
		 * Lo que lee un lector de pantalla al llegar al bloque.
		 *
		 * @returns {string}
		 */
		etiqueta_accesible() {
			return this.nombre + ', bloque fijo de ARCA' + (this.seleccionado ? ', seleccionado' : '') + '. ' + MOTIVO_DEL_CANDADO
		},
		/**
		 * Clases de estado.
		 *
		 * @returns {Object}
		 */
		clases() {
			return {
				'dpdf-fijo--seleccionado': this.seleccionado,
				'dpdf-fijo--destacado': this.disenador.destacado === 'fijo:' + this.fijo.key,
			}
		},
	},
	methods: {
		/**
		 * Selecciona el bloque (el panel muestra su descripción y, en el del pie, los importes).
		 *
		 * @returns {void}
		 */
		seleccionar() {
			this.disenador.seleccionar('fijo', this.fijo)
		},
	},
}
</script>
<style lang="sass">
// Sin `scoped`: el clon de Sortable que sigue al puntero cuelga de <body>. Colores solo por token.
.dpdf-fijo
	position: relative
	display: flex
	min-width: 0

	&:focus
		outline: none

	&:focus-visible .dpdf-fijo__tarjeta
		box-shadow: 0 0 0 2px var(--color-primary)

	// La tarjeta del bloque fijo: el mismo lenguaje que los bloques con candado de Vender
	.dpdf-fijo__tarjeta
		display: flex
		align-items: center
		gap: 8px
		flex: 1 1 auto
		min-width: 0
		padding: 8px 12px
		border: 1px solid var(--color-border-secondary)
		border-radius: 8px
		background: var(--bg-section)
		color: var(--color-text-secondary)
		cursor: grab
		user-select: none
		transition: border-color .15s ease, box-shadow .15s ease

	&:hover .dpdf-fijo__tarjeta
		border-color: var(--color-primary)

	.dpdf-fijo__agarre,
	.dpdf-fijo__candado
		flex: 0 0 auto
		font-size: 0.8rem

	.dpdf-fijo__textos
		display: flex
		flex-direction: column
		gap: 1px
		flex: 1 1 auto
		min-width: 0

	.dpdf-fijo__nombre
		color: var(--color-text-primary)
		font-size: 0.8rem
		font-weight: 600
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	.dpdf-fijo__descripcion
		font-size: 0.72rem
		line-height: 1.3
		display: -webkit-box
		-webkit-line-clamp: 2
		-webkit-box-orient: vertical
		overflow: hidden

	.dpdf-fijo__estado
		flex: 0 0 auto
		padding: 2px 8px
		border-radius: 999px
		background: var(--bg-nav-hover)
		color: var(--color-primary)
		font-size: 0.7rem
		font-weight: 600
		white-space: nowrap

	.dpdf-fijo__estado--apagado
		background: var(--bg-card)
		color: var(--color-text-secondary)

	&.dpdf-fijo--seleccionado .dpdf-fijo__tarjeta
		border-color: var(--color-primary)
		box-shadow: 0 0 0 2px var(--color-primary), 0 0 0 5px var(--metodo-pago-focus-ring)

	&.dpdf-fijo--destacado .dpdf-fijo__tarjeta
		animation: dpdf-destello 1.4s ease
</style>
