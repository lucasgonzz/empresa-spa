<template>
<div
v-if="fuentes.length || citas.length"
class="med-fuente"
:data-testid="'medidas-fuente-' + item_id">

	<!--
		De dónde salió: el dominio de cada página, como link que abre en otra pestaña. Es lo primero que
		mira quien revisa: «¿esto lo dice la web de la marca o un revendedor?».
	-->
	<div
	v-if="fuentes.length"
	class="med-fuente__linea">
		<span class="med-fuente__rotulo">{{ fuentes.length === 1 ? 'Fuente' : 'Fuentes' }}</span>
		<a
		v-for="(fuente, indice) in fuentes"
		:key="'fuente-' + indice"
		class="med-fuente__link"
		:href="fuente.url"
		:title="fuente.titulo || fuente.url"
		:data-testid="'medidas-fuente-link-' + item_id + '-' + indice"
		target="_blank"
		rel="noopener noreferrer">
			{{ fuente.dominio || fuente.url }}
			<i
			class="bi bi-box-arrow-up-right"
			aria-hidden="true"></i>
		</a>
	</div>

	<!--
		De qué tipo eran las medidas (decisión D4: cualquier dato sirve, pero se dice cuál). Si
		algunos eran del envío y otros del producto, salen las dos.
	-->
	<p
	v-if="alcances.length"
	class="med-fuente__alcance"
	:data-testid="'medidas-alcance-' + item_id">
		{{ alcances.join(' · ') }}
	</p>

	<!--
		La cita literal de cada medida: lo que decía la página. Desplegable, para que la fila no se
		llene de texto; en una pantalla táctil el title de los chips no existe, así que esta es la
		forma de leerla.
	-->
	<button
	v-if="citas.length"
	type="button"
	class="med-fila__desplegar"
	:aria-expanded="abierto ? 'true' : 'false'"
	:data-testid="'medidas-citas-boton-' + item_id"
	@click="abierto = !abierto">
		<i
		class="bi"
		:class="abierto ? 'bi-chevron-down' : 'bi-chevron-right'"
		aria-hidden="true"></i>
		{{ abierto ? 'Ocultar lo que decía la página' : 'Ver lo que decía la página' }}
	</button>

	<ul
	v-if="abierto"
	class="med-fuente__citas"
	:data-testid="'medidas-citas-' + item_id">
		<li
		v-for="campo in citas"
		:key="campo.clave"
		class="med-fuente__cita">
			<span class="med-fuente__cita-campo">{{ campo.etiqueta }}</span>
			<q class="med-fuente__cita-texto">{{ campo.cita }}</q>
			<span class="med-fuente__cita-pie">
				<span v-if="alcance_de(campo)">{{ alcance_de(campo) }}</span>
				<a
				v-if="campo.url"
				class="med-fuente__link"
				:href="campo.url"
				target="_blank"
				rel="noopener noreferrer">
					{{ dominio(campo.url) }}
					<i
					class="bi bi-box-arrow-up-right"
					aria-hidden="true"></i>
				</a>
			</span>
		</li>
	</ul>

</div>
</template>
<script>
import { dominio_de } from '@/utils/medidas_de_catalogo'
import { ALCANCES, texto_de } from '@/components/alertas/components/lista-de-alertas-table/medidas/textos'

/**
 * La fuente de las medidas de un artículo: los dominios de las páginas de donde salieron (con link),
 * de qué tipo eran (producto, envío...) y, desplegable, la cita literal de cada medida.
 *
 * Solo dibuja: los datos llegan normalizados (`normalizar_item` en utils/medidas_de_catalogo.js).
 * Los links son siempre http(s) (esa función descarta cualquier otra cosa) y abren en otra pestaña
 * con `rel="noopener noreferrer"`.
 */
export default {
	props: {
		/** `fuentes` del item: [{url, titulo, dominio}]. */
		fuentes: {
			type: Array,
			default() {
				return []
			},
		},
		/** `campos` del item (los que tienen cita se listan en el desplegable). */
		campos: {
			type: Array,
			default() {
				return []
			},
		},
		/** Id del item (para los data-testid). */
		item_id: {
			type: Number,
			default: null,
		},
	},
	data() {
		return {
			/** true con la lista de citas desplegada. */
			abierto: false,
		}
	},
	computed: {
		/**
		 * Los campos que tienen una cita para mostrar.
		 *
		 * @returns {Array}
		 */
		citas() {
			return this.campos.filter(campo => !campo.falta && !!campo.cita)
		},
		/**
		 * Los tipos de medidas distintos que hay entre los campos, ya traducidos ("Medidas del envío").
		 *
		 * @returns {Array<String>}
		 */
		alcances() {
			let textos = []
			this.campos.forEach(function (campo) {
				if (campo.falta || !campo.alcance) {
					return
				}
				let texto = texto_de(ALCANCES, campo.alcance)
				if (textos.indexOf(texto) === -1) {
					textos.push(texto)
				}
			})
			return textos
		},
	},
	methods: {
		alcance_de(campo) {
			return campo.alcance ? texto_de(ALCANCES, campo.alcance) : ''
		},
		dominio(url) {
			return dominio_de(url) || url
		},
	},
}
</script>
<style lang="sass">
// Sin scope: vive adentro del b-modal del detalle. Prefijo med-fuente; colores por token.
.med-fuente
	display: flex
	flex-direction: column
	align-items: flex-start
	gap: 3px
	min-width: 0
	max-width: 100%

.med-fuente__linea
	display: flex
	flex-wrap: wrap
	align-items: center
	gap: 2px 12px
	font-size: 0.8rem

.med-fuente__rotulo
	font-size: 0.72rem
	font-weight: 500
	letter-spacing: .02em
	text-transform: uppercase
	color: var(--color-text-secondary, #6c757d)

.med-fuente__link
	display: inline-flex
	align-items: center
	gap: 5px
	font-size: 0.8rem
	font-weight: 500
	color: var(--color-primary, #007bff)
	overflow-wrap: anywhere

	i
		font-size: 0.7rem

.med-fuente__alcance
	margin: 0
	font-size: 0.78rem
	color: var(--color-text-secondary, #6c757d)

.med-fuente__citas
	display: flex
	flex-direction: column
	gap: 8px
	width: 100%
	margin: 4px 0 0
	padding: 10px 12px
	list-style: none
	border-radius: 10px
	background: var(--bg-section, #f8f9fa)

.med-fuente__cita
	display: flex
	flex-direction: column
	gap: 1px
	min-width: 0

.med-fuente__cita-campo
	font-size: 0.72rem
	font-weight: 600
	letter-spacing: .02em
	text-transform: uppercase
	color: var(--color-text-secondary, #6c757d)

.med-fuente__cita-texto
	font-size: 0.8125rem
	line-height: 1.4
	color: var(--color-text-primary, #212529)
	overflow-wrap: anywhere

.med-fuente__cita-pie
	display: flex
	flex-wrap: wrap
	gap: 2px 12px
	font-size: 0.75rem
	color: var(--color-text-secondary, #6c757d)
</style>
