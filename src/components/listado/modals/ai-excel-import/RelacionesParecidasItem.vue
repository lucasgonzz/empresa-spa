<template>
	<!--
		Un nombre de la lista de nombres parecidos (RelacionesParecidas.vue).

		Es un componente aparte por RENDIMIENTO, no por prolijidad: un archivo grande trae cientos de
		ítems, y con todo dibujado en el padre cada clic redibujaba la lista entera (cada b-form-radio
		con texto adentro se vuelve a dibujar siempre que se redibuja su padre: 900 ítems daban casi
		2 segundos por clic). Acá cada ítem recibe solo su índice elegido, un número: un clic cambia
		ese número en un único ítem y es el único que se vuelve a dibujar. Por eso tampoco recibe el
		mapa de decisiones entero ni ningún objeto que se rearme en cada clic.
	-->
	<div
	class="ai-import-relaciones__item"
	:data-clave="item.clave">

		<div class="ai-import-relaciones__item-cabecera">
			<span class="ai-import-relaciones__valor">«{{ item.valor }}»</span>
			<span
			v-if="texto_filas"
			class="ai-import-relaciones__filas">
				{{ texto_filas }}
			</span>
		</div>

		<small
		v-if="texto_padre"
		class="ai-import-relaciones__detalle">
			{{ texto_padre }}
		</small>

		<small
		v-if="item.explicacion"
		class="ai-import-relaciones__detalle">
			{{ item.explicacion }}
		</small>

		<div
		class="ai-import-relaciones__opciones"
		role="radiogroup"
		:aria-label="'Qué es «' + item.valor + '»'">
			<b-form-radio
			v-for="opcion in opciones"
			:key="opcion.indice"
			:name="'ai-import-relacion-' + item.clave"
			:value="opcion.indice"
			:checked="elegido"
			:data-testid="'ai-import-relaciones-opcion-' + item.clave + '-' + opcion.indice"
			class="ai-import-relaciones__opcion"
			@change="$emit('elegir', opcion.indice)">
				{{ opcion.texto }}
			</b-form-radio>
		</div>

	</div>
</template>

<script>
import { definicion_de_tipo, opcion_es_valida } from './relaciones_parecidas'

export default {

	props: {
		/* Ítem de relaciones_parecidas.items, tal como llega de la API. */
		item: {
			type: Object,
			required: true,
		},

		/* Índice (dentro de item.opciones) de la opción elegida. Primitivo a propósito: ver arriba. */
		elegido: {
			type: Number,
			default: 0,
		},
	},

	computed: {

		/*
		 * Opciones que se pueden mostrar, con su índice original (el que viaja en el v-model y tiene
		 * que coincidir con el de `opciones` de la API) y su texto ya armado.
		 */
		opciones() {
			let self = this
			let mostrables = []
			self.item.opciones.forEach(function(opcion, indice) {
				if (opcion_es_valida(opcion)) {
					mostrables.push({ indice: indice, texto: self.texto_opcion(opcion) })
				}
			})
			return mostrables
		},

		/*
		 * "en la categoría «Herramientas»" para una subcategoría, "en la provincia «Córdoba»" para
		 * una localidad. Vacío si el ítem no tiene padre.
		 */
		texto_padre() {
			let definicion = definicion_de_tipo(this.item.tipo)
			if (!definicion.en_el_padre || this.item.padre === null || this.item.padre === undefined || this.item.padre === '') {
				return ''
			}
			return definicion.en_el_padre + ' «' + this.item.padre + '»'
		},

		/* En cuántas filas del Excel aparece el valor. Vacío si la API no lo informó. */
		texto_filas() {
			let filas = Number(this.item.filas)
			if (!filas || filas < 1) {
				return ''
			}
			return 'en ' + this.numero_es(filas) + (filas === 1 ? ' fila' : ' filas')
		},
	},

	methods: {

		/**
		 * Texto de una opción, en lenguaje de comerciante y concordando en género con el tipo
		 * ("que ya está cargada" para una categoría, "cargado" para un proveedor).
		 *
		 * @param {Object} opcion
		 * @returns {String}
		 */
		texto_opcion(opcion) {
			let item = this.item
			let femenino = definicion_de_tipo(item.tipo).genero === 'f'

			if (opcion.accion === 'usar') {
				let nombre = opcion.nombre !== null && opcion.nombre !== undefined && opcion.nombre !== ''
					? opcion.nombre
					: (femenino ? 'la que ya existe' : 'el que ya existe')
				return 'Es «' + nombre + '», que ya está ' + (femenino ? 'cargada' : 'cargado')
			}

			if (opcion.accion === 'unir') {
				return 'Es ' + (femenino ? 'la misma' : 'el mismo') + ' que «' + opcion.con + '» (también '
					+ (femenino ? 'nueva' : 'nuevo') + '): crear ' + (femenino ? 'una sola' : 'uno solo')
			}

			/* crear */
			let uniones = item.opciones.filter(function(otra) {
				return otra && otra.accion === 'unir'
			}).length

			if (uniones === 1) {
				return 'Son ' + (femenino ? 'distintas' : 'distintos') + ': crear ' + (femenino ? 'las dos' : 'los dos')
			}
			if (uniones > 1) {
				return 'Es ' + (femenino ? 'otra distinta' : 'otro distinto') + ': crear «' + item.valor + '» aparte'
			}
			return 'Es ' + (femenino ? 'una nueva' : 'uno nuevo') + ': crear «' + item.valor + '»'
		},
	},
}
</script>
