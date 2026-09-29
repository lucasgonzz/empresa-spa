<template>
	<!--
		Panel del campo elegido en el editor de etiquetas (mision disenos-etiquetas-gondola, 29/9/2026):
		tamaño de letra, negrita, saltos de linea, alineacion, rotulo de los precios, que lista, el texto
		del texto libre, la posicion exacta en mm y "Quitar de la etiqueta". Lo que no aplica a un tipo
		(la foto no tiene letra) no se muestra.

		Cambia el elemento que recibe por props de forma directa (el dueño del diseño es el editor y ve
		los cambios sin eventos, igual que con el arrastre del lienzo).
	-->
	<aside
	class="panel-campo"
	aria-label="Campo elegido">

		<div
		v-if="!elemento"
		class="panel-campo__nada">
			<i class="bi bi-hand-index"></i>
			<p>Tocá un campo de la etiqueta para cambiarle la letra, la negrita o la alineación.</p>
		</div>

		<template v-else>
			<div class="panel-campo__cabecera">
				<i
				class="bi panel-campo__icono"
				:class="icono"></i>
				<span class="panel-campo__nombre">{{ nombre }}</span>
			</div>

			<!-- Precio de una lista que ya no existe: no imprime nada -->
			<div
			v-if="lista_borrada"
			class="panel-campo__aviso"
			role="status">
				<i class="bi bi-exclamation-triangle"></i>
				<span>Esta lista de precios ya no existe y el campo sale en blanco. Elegí otra lista o quitalo.</span>
			</div>

			<!-- Que lista (precio de lista) -->
			<div
			v-if="elemento.tipo === 'precio_lista'"
			class="panel-campo__bloque">
				<label
				class="panel-campo__etiqueta"
				for="panel-campo-lista">Lista de precios</label>
				<b-form-select
				id="panel-campo-lista"
				size="sm"
				:value="elemento.price_type_id"
				:options="opciones_de_listas"
				@change="elemento.price_type_id = $event"></b-form-select>
			</div>

			<!-- El texto del texto libre -->
			<div
			v-if="elemento.tipo === 'texto_fijo'"
			class="panel-campo__bloque">
				<label
				class="panel-campo__etiqueta"
				for="panel-campo-texto">Texto</label>
				<b-form-input
				id="panel-campo-texto"
				size="sm"
				:value="elemento.texto"
				:maxlength="LARGO_MAXIMO_DEL_TEXTO"
				autocomplete="off"
				placeholder="Por ejemplo: OFERTA"
				@input="elemento.texto = $event"></b-form-input>
			</div>

			<template v-if="tiene_letra">
				<!-- Tamaño de letra: − / numero / + -->
				<div class="panel-campo__bloque">
					<label
					class="panel-campo__etiqueta"
					for="panel-campo-tamano">Tamaño de letra</label>
					<div class="panel-campo__tamano">
						<button
						type="button"
						class="panel-campo__paso"
						aria-label="Letra más chica"
						:disabled="elemento.tamano <= TAMANO_MINIMO_PT"
						@click="cambiar_tamano(-1)">
							<i class="bi bi-dash-lg"></i>
						</button>
						<b-form-input
						id="panel-campo-tamano"
						class="panel-campo__numero"
						size="sm"
						type="number"
						:min="TAMANO_MINIMO_PT"
						:max="TAMANO_MAXIMO_PT"
						:value="elemento.tamano"
						@change="poner_tamano"></b-form-input>
						<button
						type="button"
						class="panel-campo__paso"
						aria-label="Letra más grande"
						:disabled="elemento.tamano >= TAMANO_MAXIMO_PT"
						@click="cambiar_tamano(1)">
							<i class="bi bi-plus-lg"></i>
						</button>
						<span class="panel-campo__unidad">puntos</span>
					</div>
				</div>

				<div class="panel-campo__bloque">
					<interruptor
					id="panel-campo-negrita"
					v-model="elemento.negrita">Negrita</interruptor>
				</div>

				<div class="panel-campo__bloque">
					<interruptor
					id="panel-campo-saltos"
					v-model="elemento.saltos_de_linea">Saltos de línea</interruptor>
					<p class="panel-campo__ayuda">
						{{ elemento.saltos_de_linea
							? 'Si el texto no entra, sigue en el renglón de abajo (hasta donde llegue el alto del campo).'
							: 'Todo en un renglón; si no entra, se corta con «…».' }}
					</p>
				</div>

				<div class="panel-campo__bloque">
					<span class="panel-campo__etiqueta">Alineación</span>
					<div
					class="panel-campo__alineacion"
					role="group"
					aria-label="Alineación del texto">
						<button
						v-for="opcion in ALINEACIONES"
						:key="opcion.valor"
						type="button"
						class="panel-campo__alinear"
						:class="{ 'panel-campo__alinear--activo': elemento.alineacion === opcion.valor }"
						:title="opcion.texto"
						:aria-label="opcion.texto"
						:aria-pressed="elemento.alineacion === opcion.valor ? 'true' : 'false'"
						@click="elemento.alineacion = opcion.valor">
							<i
							class="bi"
							:class="opcion.icono"></i>
						</button>
					</div>
				</div>

				<!-- Rotulo de los precios -->
				<div
				v-if="es_precio"
				class="panel-campo__bloque">
					<interruptor
					id="panel-campo-rotulo"
					v-model="elemento.rotulo">{{ texto_del_rotulo }}</interruptor>
				</div>
			</template>

			<!-- Posicion y tamaño exactos, en mm -->
			<div class="panel-campo__bloque">
				<span class="panel-campo__etiqueta">Posición y tamaño (mm)</span>
				<!-- La key obliga a redibujar los inputs cuando lo escrito se acota al mismo valor que habia -->
				<div
				:key="version_de_medidas"
				class="panel-campo__medidas">
					<label
					v-for="medida in MEDIDAS"
					:key="medida.clave"
					class="panel-campo__medida">
						<span>{{ medida.texto }}</span>
						<b-form-input
						size="sm"
						type="number"
						step="0.1"
						min="0"
						:value="elemento[medida.clave]"
						@change="poner_medida(medida.clave, $event)"></b-form-input>
					</label>
				</div>
			</div>

			<b-button
			variant="outline-danger"
			size="sm"
			class="panel-campo__quitar"
			@click="$emit('quitar', elemento.id)">
				<i class="bi bi-trash3"></i>
				Quitar de la etiqueta
			</b-button>
		</template>
	</aside>
</template>
<script>
import Interruptor from './Interruptor'
import { definicion, es_texto, es_precio, nombre_del_campo, buscar_lista, LARGO_MAXIMO_DEL_TEXTO } from '../catalogo'
import { TAMANO_MINIMO_PT, TAMANO_MAXIMO_PT, acotar, encerrar_en_la_etiqueta } from '../geometria'

/* Botones de alineacion */
const ALINEACIONES = [
	{ valor: 'L', texto: 'A la izquierda', icono: 'bi-text-left' },
	{ valor: 'C', texto: 'Al centro', icono: 'bi-text-center' },
	{ valor: 'R', texto: 'A la derecha', icono: 'bi-text-right' },
]

/* Las cuatro medidas editables a mano */
const MEDIDAS = [
	{ clave: 'x', texto: 'Desde la izquierda' },
	{ clave: 'y', texto: 'Desde arriba' },
	{ clave: 'w', texto: 'Ancho' },
	{ clave: 'h', texto: 'Alto' },
]

/**
 * Panel del campo elegido.
 */
export default {
	name: 'PanelDelCampo',
	components: {
		Interruptor,
	},
	props: {
		/* El campo elegido, o null */
		elemento: {
			type: Object,
			default: null,
		},
		/* Listas de precios del negocio */
		listas: {
			type: Array,
			default: function () {
				return []
			},
		},
		/* Ancho de la etiqueta, mm */
		ancho_mm: {
			type: Number,
			required: true,
		},
		/* Alto de la etiqueta, mm */
		alto_mm: {
			type: Number,
			required: true,
		},
	},
	data() {
		return {
			ALINEACIONES: ALINEACIONES,
			MEDIDAS: MEDIDAS,
			TAMANO_MINIMO_PT: TAMANO_MINIMO_PT,
			TAMANO_MAXIMO_PT: TAMANO_MAXIMO_PT,
			LARGO_MAXIMO_DEL_TEXTO: LARGO_MAXIMO_DEL_TEXTO,
			/* Se incrementa para redibujar los inputs de medidas despues de acotar un valor */
			version_de_medidas: 0,
		}
	},
	computed: {
		/**
		 * Nombre del campo para el comerciante.
		 *
		 * @returns {string}
		 */
		nombre() {
			return nombre_del_campo(this.elemento, this.listas)
		},
		/**
		 * Icono del tipo.
		 *
		 * @returns {string}
		 */
		icono() {
			let def = definicion(this.elemento.tipo)
			return def ? def.icono : 'bi-square'
		},
		/**
		 * Si el campo tiene letra (la foto y el dibujo del codigo de barras no).
		 *
		 * @returns {boolean}
		 */
		tiene_letra() {
			return es_texto(this.elemento.tipo)
		},
		/**
		 * Si es un precio (lleva el interruptor del rotulo).
		 *
		 * @returns {boolean}
		 */
		es_precio() {
			return es_precio(this.elemento.tipo)
		},
		/**
		 * Lo que dice el interruptor del rotulo.
		 *
		 * @returns {string}
		 */
		texto_del_rotulo() {
			if (this.elemento.tipo === 'precio_lista') {
				return 'Mostrar el nombre de la lista'
			}
			return 'Mostrar «Precio:» adelante'
		},
		/**
		 * Si es un precio de una lista que ya no existe.
		 *
		 * @returns {boolean}
		 */
		lista_borrada() {
			return this.elemento.tipo === 'precio_lista' && !buscar_lista(this.listas, this.elemento.price_type_id)
		},
		/**
		 * Opciones del select de listas.
		 *
		 * @returns {Array}
		 */
		opciones_de_listas() {
			let opciones = []
			if (this.lista_borrada) {
				opciones.push({ value: this.elemento.price_type_id, text: 'Lista borrada (elegí otra)', disabled: true })
			}
			this.listas.forEach(function (lista) {
				opciones.push({ value: lista.id, text: lista.name })
			})
			return opciones
		},
	},
	methods: {
		/**
		 * − / + de la letra.
		 *
		 * @param {number} paso
		 * @returns {void}
		 */
		cambiar_tamano(paso) {
			this.elemento.tamano = Math.round(acotar(Number(this.elemento.tamano) + paso, TAMANO_MINIMO_PT, TAMANO_MAXIMO_PT, this.elemento.tamano))
		},
		/**
		 * El numero de la letra escrito a mano (al salir del campo o con Enter).
		 *
		 * @param {string} valor
		 * @returns {void}
		 */
		poner_tamano(valor) {
			this.elemento.tamano = Math.round(acotar(valor, TAMANO_MINIMO_PT, TAMANO_MAXIMO_PT, this.elemento.tamano))
		},
		/**
		 * Una medida escrita a mano: se acota para que el campo siga adentro de la etiqueta.
		 *
		 * @param {string} clave x | y | w | h
		 * @param {string} valor
		 * @returns {void}
		 */
		poner_medida(clave, valor) {
			let numero = Number(String(valor).replace(',', '.'))
			let valido = valor !== '' && !isNaN(numero)
			if (valido) {
				this.elemento[clave] = numero
				encerrar_en_la_etiqueta(this.elemento, this.ancho_mm, this.alto_mm)
			}
			/*
				Si lo escrito no era un numero, o se tuvo que acotar, los inputs se redibujan para mostrar
				lo que quedo de verdad. Solo en ese caso: redibujar siempre haria perder el foco al pasar
				con Tab de una medida a la otra.
			*/
			if (!valido || Math.abs(Number(this.elemento[clave]) - numero) > 0.001) {
				this.version_de_medidas++
			}
		},
	},
}
</script>
<style lang="sass">
// Colores solo por token
.panel-campo
	display: flex
	flex-direction: column
	gap: 12px
	min-width: 0
	padding: 14px
	border: 1px solid var(--color-border)
	border-radius: 12px
	background: var(--bg-card)
	text-align: left

.panel-campo__nada
	display: flex
	flex-direction: column
	align-items: center
	gap: 8px
	padding: 18px 6px
	color: var(--color-text-secondary)
	font-size: 0.8rem
	text-align: center

	i
		font-size: 1.4rem

	p
		margin: 0

.panel-campo__cabecera
	display: flex
	align-items: center
	gap: 8px
	min-width: 0
	padding-bottom: 10px
	border-bottom: 1px solid var(--color-border-secondary)

.panel-campo__icono
	flex: 0 0 auto
	color: var(--color-primary)

.panel-campo__nombre
	flex: 1 1 auto
	min-width: 0
	color: var(--color-text-primary)
	font-size: 0.9rem
	font-weight: 700
	white-space: nowrap
	overflow: hidden
	text-overflow: ellipsis

.panel-campo__aviso
	display: flex
	align-items: flex-start
	gap: 8px
	padding: 8px 10px
	border: 1px solid var(--color-border)
	border-radius: 8px
	color: var(--color-text-primary)
	font-size: 0.75rem
	line-height: 1.4

	i
		flex: 0 0 auto
		color: var(--color-text-warning-strong, var(--warning))

.panel-campo__bloque
	display: flex
	flex-direction: column
	gap: 5px
	min-width: 0

	.form-control,
	.custom-select
		border-radius: var(--metodo-pago-input-radius)
		border-width: 1px

		&:focus
			border-width: 1px
			border-color: var(--color-primary)
			box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)

.panel-campo__etiqueta
	margin: 0
	color: var(--color-text-secondary)
	font-size: 0.72rem
	font-weight: 600
	text-transform: uppercase
	letter-spacing: 0.02em

.panel-campo__ayuda
	margin: 0
	color: var(--color-text-secondary)
	font-size: 0.72rem
	line-height: 1.35

.panel-campo__tamano
	display: flex
	align-items: center
	gap: 6px

	.panel-campo__numero
		width: 64px
		text-align: center

.panel-campo__unidad
	color: var(--color-text-secondary)
	font-size: 0.75rem

.panel-campo__paso,
.panel-campo__alinear
	display: inline-flex
	align-items: center
	justify-content: center
	flex: 0 0 32px
	width: 32px
	height: 32px
	padding: 0
	border: 1px solid var(--color-border)
	border-radius: 8px
	background: var(--bg-card)
	color: var(--color-text-primary)
	cursor: pointer
	transition: background .15s ease, border-color .15s ease

	&:hover:not(:disabled)
		border-color: var(--color-primary)
		background: var(--bg-hover)

	&:disabled
		opacity: .4
		cursor: default

	&:focus
		outline: none

	&:focus-visible
		box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)

.panel-campo__alineacion
	display: inline-flex
	gap: 6px

.panel-campo__alinear--activo
	border-color: var(--color-primary)
	background: var(--color-primary)
	color: var(--bg-card)

	&:hover:not(:disabled)
		background: var(--color-primary)

.panel-campo__medidas
	display: grid
	grid-template-columns: 1fr 1fr
	gap: 8px

.panel-campo__medida
	display: flex
	flex-direction: column
	gap: 3px
	margin: 0
	color: var(--color-text-secondary)
	font-size: 0.7rem

.panel-campo__quitar.btn
	display: inline-flex
	align-items: center
	justify-content: center
	gap: 6px
	border-radius: 8px
</style>
