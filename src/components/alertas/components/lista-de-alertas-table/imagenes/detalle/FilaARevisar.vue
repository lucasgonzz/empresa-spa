<template>
<li
class="img-det-fila img-det-fila--revisar"
:class="{ 'img-det-fila--seleccionada': seleccionado, 'img-det-fila--procesando': procesando }"
:data-testid="'imagenes-item-' + item.id"
:data-status="item.status"
:data-motivo="item.motivo">

	<b-form-checkbox
	class="img-det-fila__tilde"
	:data-testid="'imagenes-tilde-' + item.id"
	:checked="seleccionado"
	:disabled="procesando"
	:aria-label="'Seleccionar ' + nombre"
	@change="$emit('seleccionar', $event)"></b-form-checkbox>

	<miniatura
	tamano="grande"
	ampliable
	:url="item.imagen_url"
	:alt="nombre"
	@ampliar="ampliar"></miniatura>

	<div class="img-det-fila__cuerpo">

		<span class="img-det-fila__nombre">{{ nombre }}</span>

		<div class="img-det-fila__meta">
			<span
			v-if="item.article_bar_code"
			class="img-det-fila__codigo">
				{{ item.article_bar_code }}
			</span>
			<span v-if="criterio">{{ criterio }}</span>
			<span :data-busquedas="item.busquedas">{{ busquedas }}</span>
		</div>

		<!-- Por que quedo para revisar: todos los avisos que aplican (contrato §5.2). -->
		<div
		v-if="avisos.length"
		class="img-det-fila__avisos">
			<span
			v-for="(aviso, indice) in avisos"
			:key="'aviso-' + indice"
			class="img-det-etiqueta img-det-etiqueta--aviso">
				{{ aviso }}
			</span>
		</div>

		<p
		v-if="texto_de_la_imagen"
		class="img-det-fila__detalle">
			{{ texto_de_la_imagen }}
		</p>
		<p
		v-if="texto_de_la_ia"
		class="img-det-fila__detalle img-det-fila__detalle--ia">
			{{ texto_de_la_ia }}
		</p>

		<a
		v-if="pagina"
		class="img-det-fila__link"
		:href="pagina"
		target="_blank"
		rel="noopener noreferrer">
			Ver dónde se encontró
			<i
			class="bi bi-box-arrow-up-right"
			aria-hidden="true"></i>
		</a>

	</div>

	<!--
		Rechazar a la izquierda y aprobar a la derecha, como en cualquier dialogo: la accion que
		avanza queda donde termina la lectura. Aprobar es la unica en color lleno.
	-->
	<div class="img-det-fila__acciones">
		<b-button
		class="btn-modulo btn-modulo--fila"
		variant="outline-danger"
		:data-testid="'imagenes-rechazar-' + item.id"
		:disabled="procesando"
		@click="$emit('rechazar')">
			Rechazar
		</b-button>
		<b-button
		class="btn-modulo btn-modulo--fila"
		variant="success"
		:data-testid="'imagenes-aprobar-' + item.id"
		:disabled="procesando"
		@click="$emit('aprobar')">
			Aprobar
		</b-button>
	</div>

</li>
</template>
<script>
// Sincronico a proposito: la fila ya viaja en el chunk del detalle, y una miniatura que llega por
// un chunk aparte hace que cada fila salte de alto al aparecer.
import Miniatura from '@/components/alertas/components/lista-de-alertas-table/imagenes/detalle/Miniatura'
import {
	MOTIVOS,
	CRITERIOS,
	VEREDICTOS_IA,
	CONFIANZAS_IA,
	PROBLEMAS_IA,
	texto_de,
	busquedas_del_articulo,
} from '@/components/alertas/components/lista-de-alertas-table/imagenes/textos'

/**
 * Un artículo con una imagen para revisar: la miniatura grande (tocarla la muestra en grande),
 * por qué quedó para revisar, qué se sabe de la imagen y lo que dijo la IA, y Aprobar / Rechazar.
 *
 * Mientras no se apruebe, la imagen NO está en el artículo ni en la tienda (decisión de Lucas):
 * aprobar la asigna, rechazar la descarta.
 *
 * Eventos: `seleccionar(bool)`, `aprobar`, `rechazar`, `ampliar(imagen)`.
 */
export default {
	components: {
		Miniatura,
	},
	props: {
		/** ItemPayload (contrato §5.2). */
		item: {
			type: Object,
			required: true,
		},
		/** true si está tildado para aprobar o rechazar en lote. */
		seleccionado: {
			type: Boolean,
			default: false,
		},
		/** true mientras viaja una acción sobre este artículo. */
		procesando: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		nombre() {
			return this.item.article_name || ('Artículo N° ' + this.item.article_id)
		},
		/** Datos de la imagen elegida (o un objeto vacío si no vinieron). */
		imagen() {
			return this.item.imagen && typeof this.item.imagen === 'object' ? this.item.imagen : {}
		},
		/**
		 * Los avisos que manda la API (ya en texto). Si no vino ninguno, el motivo principal
		 * traducido: una fila de "a revisar" sin decir por qué no ayuda a decidir.
		 *
		 * @returns {Array}
		 */
		avisos() {
			if (Array.isArray(this.item.avisos) && this.item.avisos.length) {
				return this.item.avisos
			}
			let motivo = texto_de(MOTIVOS, this.item.motivo)
			return motivo ? [motivo] : []
		},
		/**
		 * "Por código de barras" / "Por nombre".
		 *
		 * @returns {String}
		 */
		criterio() {
			let texto = texto_de(CRITERIOS, this.item.criterio_usado)
			return texto ? 'Por ' + texto.charAt(0).toLowerCase() + texto.slice(1) : ''
		},
		busquedas() {
			return busquedas_del_articulo(this.item.busquedas)
		},
		/**
		 * "800 × 800 px · fondo blanco · mercadolibre.com.ar".
		 *
		 * @returns {String}
		 */
		texto_de_la_imagen() {
			let partes = []
			if (this.imagen.ancho && this.imagen.alto) {
				partes.push(this.imagen.ancho + ' × ' + this.imagen.alto + ' px')
			}
			if (this.imagen.fondo_blanco === true) {
				partes.push('fondo blanco')
			}
			if (this.imagen.dominio) {
				partes.push(this.imagen.dominio)
			}
			return partes.join(' · ')
		},
		/**
		 * Lo que dijo la IA: "La IA: no está segura, confianza media. Vio texto encima. <motivo>".
		 * Vacío si la imagen no se llegó a evaluar y no hay nada que contar.
		 *
		 * @returns {String}
		 */
		texto_de_la_ia() {
			let ia = this.imagen.ia
			if (!ia || typeof ia !== 'object') {
				return ''
			}
			let partes = []
			let veredicto = texto_de(VEREDICTOS_IA, ia.veredicto)
			if (veredicto) {
				let confianza = texto_de(CONFIANZAS_IA, ia.confianza)
				partes.push('La IA: ' + veredicto.toLowerCase() + (confianza ? ', confianza ' + confianza : '') + '.')
			}
			if (Array.isArray(ia.problemas) && ia.problemas.length) {
				let problemas = []
				ia.problemas.forEach(problema => {
					problemas.push(texto_de(PROBLEMAS_IA, problema))
				})
				partes.push('Vio: ' + problemas.join(', ') + '.')
			}
			if (ia.motivo) {
				partes.push(ia.motivo)
			}
			return partes.join(' ')
		},
		/** Página donde apareció la imagen. */
		pagina() {
			return this.imagen.pagina || null
		},
	},
	methods: {
		/** Pide ver la imagen en grande, con el nombre y lo que se sabe de ella. */
		ampliar() {
			this.$emit('ampliar', {
				url: this.item.imagen_url,
				titulo: this.nombre,
				detalle: this.texto_de_la_imagen,
			})
		},
	},
}
</script>
