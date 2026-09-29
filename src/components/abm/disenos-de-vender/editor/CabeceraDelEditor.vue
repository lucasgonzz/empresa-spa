<template>
	<!--
		Cabecera del editor de diseños: el nombre, el interruptor "En uso" y el boton para volver al
		diseño predeterminado. Los valores son del editor (Index.vue): llegan por props y vuelven con
		`update:*` (se usan con .sync).
	-->
	<div class="editor-diseno-cabecera">

		<b-form-group
		class="editor-diseno-cabecera__nombre"
		label="Nombre del diseño"
		label-for="editor-diseno-nombre"
		:invalid-feedback="nombre_invalido ? 'Poné un nombre para el diseño.' : ''"
		:state="nombre_invalido ? false : null">
			<b-form-input
			id="editor-diseno-nombre"
			ref="nombre"
			:value="nombre"
			maxlength="120"
			autocomplete="off"
			placeholder="Por ejemplo: Mostrador rápido"
			:state="nombre_invalido ? false : null"
			@input="$emit('update:nombre', $event)"></b-form-input>
		</b-form-group>

		<div class="editor-diseno-cabecera__en-uso">
			<!--
				Toggle tipo iOS, mismo dibujo que ModelForm.vue / ToggleAgenda.vue (pista con
				--toggle-track-off). El input nativo queda accesible por teclado (espacio lo cambia).
			-->
			<label
			class="editor-diseno-toggle"
			:class="{ 'editor-diseno-toggle--bloqueado': en_uso_bloqueado }"
			for="editor-diseno-en-uso">
				<input
				id="editor-diseno-en-uso"
				type="checkbox"
				:checked="en_uso"
				:disabled="en_uso_bloqueado"
				:aria-describedby="'editor-diseno-en-uso-ayuda'"
				@change="$emit('update:en_uso', $event.target.checked)">
				<span class="editor-diseno-toggle__pista">
					<span class="editor-diseno-toggle__perilla"></span>
				</span>
				<span class="editor-diseno-toggle__texto">En uso</span>
			</label>
			<p
			id="editor-diseno-en-uso-ayuda"
			class="editor-diseno-cabecera__ayuda">{{ ayuda_en_uso }}</p>
		</div>

		<div class="editor-diseno-cabecera__restablecer">
			<b-button
			variant="outline-secondary"
			size="sm"
			title="Vuelve a poner cada campo donde estaba en el diseño original de Vender. No cambia el nombre ni el uso."
			@click="$emit('restablecer')">
				<i class="bi bi-arrow-counterclockwise"></i>
				Restablecer el diseño predeterminado
			</b-button>
			<!-- Si el diseño sigue al del sistema, o si al guardar va a dejar de seguirlo -->
			<p
			v-if="nota_del_diseno"
			class="editor-diseno-cabecera__nota">{{ nota_del_diseno }}</p>
		</div>
	</div>
</template>
<script>
/**
 * Cabecera del editor de Diseños de Vender (mision diseno-vender-configurable, 28/9/2026).
 *
 * El "En uso" se bloquea en el diseño que ya esta en uso: tiene que haber siempre uno, y se cambia
 * poniendo OTRO en uso (el backend ignora un en_uso=false sobre el que esta en uso, plan §2).
 */
export default {
	name: 'CabeceraDelEditor',
	props: {
		/* Nombre del diseño (.sync) */
		nombre: {
			type: String,
			default: '',
		},
		/* Si el diseño va a quedar en uso al guardar (.sync) */
		en_uso: {
			type: Boolean,
			default: false,
		},
		/* true si el diseño YA esta en uso: el interruptor queda prendido y bloqueado */
		en_uso_bloqueado: {
			type: Boolean,
			default: false,
		},
		/* true despues de intentar guardar sin nombre */
		nombre_invalido: {
			type: Boolean,
			default: false,
		},
		/* Linea debajo de "Restablecer": si el diseño sigue al del sistema o va a dejar de seguirlo, o null */
		nota_del_diseno: {
			type: String,
			default: null,
		},
	},
	computed: {
		/**
		 * La linea que explica el interruptor segun su estado.
		 *
		 * @returns {string}
		 */
		ayuda_en_uso() {
			if (this.en_uso_bloqueado) {
				return 'Para dejar de usarlo, poné otro diseño en uso.'
			}
			if (this.en_uso) {
				return 'Al guardar, todo el negocio vende con este diseño.'
			}
			return 'Prendelo para que todo el negocio venda con este diseño.'
		},
	},
	methods: {
		/**
		 * Enfoca el nombre (y lo selecciona, para que al tipear se reemplace el sugerido). Lo llama el
		 * editor al abrir un diseño nuevo y al rechazar un guardado sin nombre.
		 *
		 * @returns {void}
		 */
		enfocar_nombre() {
			let campo = this.$refs.nombre
			if (campo && typeof campo.focus == 'function') {
				campo.focus()
				if (typeof campo.select == 'function') {
					campo.select()
				}
			}
		},
	},
}
</script>
<style lang="sass">
// Colores solo por token. Los inputs toman el radio y el foco "nuevos" desde el editor (Index.vue,
// scopeado por el id del modal, patron de contexto/estilo_interfaz_empresa.md).
.editor-diseno-cabecera
	display: flex
	flex-wrap: wrap
	align-items: flex-start
	gap: 12px 24px
	margin-bottom: 14px

	.editor-diseno-cabecera__nombre
		flex: 1 1 280px
		max-width: 420px
		margin-bottom: 0

		// La etiqueta con el mismo idioma que las del bloque de metodos de pago
		legend,
		label
			margin-bottom: 4px
			color: var(--color-text-secondary)
			font-size: 0.78rem
			font-weight: 600
			text-transform: uppercase
			letter-spacing: 0.02em

	.editor-diseno-cabecera__en-uso
		flex: 0 1 260px
		// Alinea el interruptor con el input (que tiene la etiqueta arriba)
		padding-top: 22px

	.editor-diseno-cabecera__ayuda
		margin: 4px 0 0
		color: var(--color-text-secondary)
		font-size: 0.75rem
		line-height: 1.35

	.editor-diseno-cabecera__restablecer
		display: flex
		flex-direction: column
		align-items: flex-end
		gap: 6px
		margin-left: auto
		padding-top: 24px

	.editor-diseno-cabecera__nota
		max-width: 320px
		margin: 0
		color: var(--color-text-secondary)
		font-size: 0.74rem
		line-height: 1.35
		text-align: right

		.btn
			display: inline-flex
			align-items: center
			gap: 6px
			border-radius: 8px
			white-space: nowrap

// El interruptor "En uso". Pista con --toggle-track-off apagada (y su borde, para que se lea como
// pastilla sobre el fondo claro) y el azul primario prendida: el mismo azul de la insignia "En uso"
// de las tarjetas. La perilla es clara en los dos modos (ver el bloque html.dark-mode de abajo).
.editor-diseno-toggle
	display: inline-flex
	align-items: center
	gap: 10px
	margin: 0
	cursor: pointer
	user-select: none

	input
		position: absolute
		width: 0
		height: 0
		opacity: 0

	.editor-diseno-toggle__pista
		position: relative
		flex: 0 0 44px
		width: 44px
		height: 26px
		border-radius: 999px
		background: var(--toggle-track-off)
		border: 1px solid var(--color-border)
		transition: background .2s ease, border-color .2s ease

	.editor-diseno-toggle__perilla
		position: absolute
		top: 2px
		left: 2px
		width: 20px
		height: 20px
		border-radius: 50%
		background: var(--bg-card)
		box-shadow: 0 1px 4px var(--shadow-color)
		transition: transform .2s ease

	.editor-diseno-toggle__texto
		font-size: 0.95rem
		font-weight: 600
		color: var(--color-text-primary)

	input:checked ~ .editor-diseno-toggle__pista
		background: var(--color-primary)
		border-color: var(--color-primary)

		.editor-diseno-toggle__perilla
			transform: translateX(18px)

	input:focus-visible ~ .editor-diseno-toggle__pista
		box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)

	// Ya en uso: prendido y quieto (la explicacion va en la linea de abajo)
	&.editor-diseno-toggle--bloqueado
		cursor: default

		.editor-diseno-toggle__pista
			opacity: .6

html.dark-mode .editor-diseno-toggle .editor-diseno-toggle__perilla
	background: var(--color-text-primary)

@media (max-width: 767.98px)
	.editor-diseno-cabecera
		.editor-diseno-cabecera__nombre
			max-width: none

		.editor-diseno-cabecera__en-uso,
		.editor-diseno-cabecera__restablecer
			padding-top: 0

		.editor-diseno-cabecera__restablecer
			align-items: flex-start
			margin-left: 0

		.editor-diseno-cabecera__nota
			max-width: none
			text-align: left
</style>
