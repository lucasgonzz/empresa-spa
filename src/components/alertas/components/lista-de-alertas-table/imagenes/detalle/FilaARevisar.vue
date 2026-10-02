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
	:disabled="procesando || !!elegida"
	:title="elegida ? 'Con otra imagen elegida, aprobala con el botón Aprobar de esta tarjeta' : null"
	:aria-label="'Seleccionar ' + nombre"
	@change="$emit('seleccionar', $event)"></b-form-checkbox>

	<miniatura
	tamano="grande"
	ampliable
	:externa="es_externa"
	:url="url_principal"
	:alt="nombre"
	@fallo="al_fallar_el_original"
	@ampliar="ampliar"></miniatura>

	<div class="img-det-fila__cuerpo">

		<span class="img-det-fila__nombre">{{ nombre }}</span>

		<div class="img-det-fila__meta">
			<span
			v-if="item.article_bar_code"
			class="img-det-fila__codigo"
			title="Código de barras"
			:data-testid="'imagenes-codigo-barras-' + item.id">
				<span class="img-det-fila__rotulo">Cód. barras</span>
				{{ item.article_bar_code }}
			</span>
			<span
			v-if="item.article_provider_code"
			class="img-det-fila__codigo"
			title="Código de proveedor"
			:data-testid="'imagenes-codigo-proveedor-' + item.id">
				<span class="img-det-fila__rotulo">Cód. proveedor</span>
				{{ item.article_provider_code }}
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

		<!--
			Las otras imágenes que se encontraron para este artículo. Cerradas por defecto: lo que
			se ve es la que el sistema considera más probable. Al abrir, la elegida se ve grande y
			las demás en una tira de miniaturas (la propuesta primero): tocar una la pone en grande
			y es la que se asigna al aprobar.
		-->
		<button
		v-if="alternativas.length"
		type="button"
		class="img-det-fila__desplegar"
		:aria-expanded="abierto ? 'true' : 'false'"
		:disabled="procesando"
		:data-testid="'imagenes-otras-boton-' + item.id"
		@click="alternar">
			<i
			class="bi"
			:class="abierto ? 'bi-chevron-up' : 'bi-chevron-down'"
			aria-hidden="true"></i>
			{{ abierto ? 'Ocultar las otras imágenes' : texto_del_boton }}
		</button>

	</div>

	<!--
		Rechazar a la izquierda y aprobar a la derecha, como en cualquier dialogo: la accion que
		avanza queda donde termina la lectura. Aprobar es la unica en color lleno.

		`data-ayuda-placement="left"`: los dos quedan pegados al borde derecho del modal, que es
		scrollable y recorta lo que sale de su caja; su ayuda se abre a la izquierda para verse
		entera (ver LADOS_VALIDOS en DescripcionDeControl.vue).
	-->
	<div class="img-det-fila__acciones">
		<b-button
		class="btn-modulo btn-modulo--fila"
		variant="outline-danger"
		data-ayuda-placement="left"
		:data-testid="'imagenes-rechazar-' + item.id"
		:disabled="procesando"
		@click="$emit('rechazar')">
			Rechazar
		</b-button>
		<b-button
		class="btn-modulo btn-modulo--fila"
		variant="success"
		data-ayuda-placement="left"
		:data-testid="'imagenes-aprobar-' + item.id"
		:disabled="procesando"
		@click="aprobar">
			Aprobar
		</b-button>
	</div>

	<div
	v-if="abierto && alternativas.length"
	class="img-det-otras"
	:data-testid="'imagenes-otras-' + item.id">

		<div class="img-det-otras__visor">
			<miniatura
			tamano="visor"
			:externa="es_externa"
			:url="url_principal"
			:alt="nombre"
			@fallo="al_fallar_el_original"></miniatura>
			<p
			v-if="es_externa"
			class="img-det-otras__nota">
				Al aprobarla se descarga y se ajusta a cuadrado.
			</p>
		</div>

		<ul
		class="img-det-otras__tira"
		role="list">
			<li>
				<button
				type="button"
				class="img-det-opcion"
				:class="{ 'img-det-opcion--seleccionada': !elegida }"
				:aria-pressed="!elegida ? 'true' : 'false'"
				aria-label="Ver la imagen que propone el sistema"
				:disabled="procesando"
				:data-testid="'imagenes-opcion-propuesta-' + item.id"
				@click="elegir(null)">
					<miniatura
					tamano="chica"
					:url="item.imagen_url"
					:alt="'Propuesta para ' + nombre"></miniatura>
					<span class="img-det-opcion__rotulo">Propuesta</span>
				</button>
			</li>
			<li
			v-for="(alternativa, posicion) in alternativas"
			:key="alternativa.clave">
				<button
				type="button"
				class="img-det-opcion"
				:class="{ 'img-det-opcion--seleccionada': elegida && elegida.clave === alternativa.clave }"
				:aria-pressed="elegida && elegida.clave === alternativa.clave ? 'true' : 'false'"
				:aria-label="'Ver la imagen ' + (posicion + 2) + ' de ' + (alternativas.length + 1)"
				:title="rotulo_de(alternativa)"
				:disabled="procesando"
				:data-testid="'imagenes-opcion-' + item.id + '-' + posicion"
				@click="elegir(alternativa.clave)">
					<miniatura
					tamano="chica"
					externa
					:url="miniatura_de(alternativa)"
					:alt="alternativa.dominio || ''"></miniatura>
					<span class="img-det-opcion__rotulo">{{ alternativa.dominio || ('Imagen ' + (posicion + 2)) }}</span>
				</button>
			</li>
		</ul>

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
	RESULTADOS_DE_CANDIDATA,
	texto_de,
	busquedas_del_articulo,
	url_segura,
} from '@/components/alertas/components/lista-de-alertas-table/imagenes/textos'

/**
 * Un artículo con una imagen para revisar: la miniatura grande (tocarla la muestra en grande),
 * por qué quedó para revisar, qué se sabe de la imagen y lo que dijo la IA, y Aprobar / Rechazar.
 *
 * Mientras no se apruebe, la imagen NO está en el artículo ni en la tienda (decisión de Lucas):
 * aprobar la asigna, rechazar la descarta.
 *
 * Si el artículo trae `alternativas` (las otras imágenes que se encontraron), se pueden desplegar
 * en la misma tarjeta y elegir una: queda en `elegida_clave` y es la que se manda al aprobar.
 * Rechazar siempre descarta la propuesta del sistema.
 *
 * Eventos: `seleccionar(bool)`, `aprobar(clave|null)` (la clave de la alternativa elegida, o null
 * si es la propuesta del sistema), `rechazar`, `ampliar(imagen)`.
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
	data() {
		return {
			/** true si están desplegadas las otras imágenes. */
			abierto: false,
			/** Clave de la alternativa elegida; null = la propuesta del sistema. */
			elegida_clave: null,
			/** true si el original de la elegida no abrió y se la ve con la miniatura del buscador. */
			original_caido: false,
		}
	},
	computed: {
		/**
		 * Las otras imágenes que se encontraron, sin las que no traen un link web usable (las URLs
		 * vienen de resultados de búsqueda de terceros: ver url_segura).
		 *
		 * @returns {Array}
		 */
		alternativas() {
			if (!Array.isArray(this.item.alternativas)) {
				return []
			}
			return this.item.alternativas.filter(alternativa => {
				return alternativa && alternativa.clave && (url_segura(alternativa.url) || url_segura(alternativa.miniatura))
			})
		},
		/** La alternativa elegida, o null si lo que se ve es la propuesta del sistema. */
		elegida() {
			if (!this.elegida_clave) {
				return null
			}
			let encontrada = this.alternativas.filter(alternativa => alternativa.clave === this.elegida_clave)
			return encontrada.length ? encontrada[0] : null
		},
		/** true si lo que se ve es una imagen de un sitio de afuera (la de la propuesta es nuestra). */
		es_externa() {
			return !!this.elegida
		},
		/**
		 * La imagen que se ve en grande: la propuesta, o la elegida (su original; si no abrió, la
		 * miniatura del buscador, que casi siempre sí).
		 *
		 * @returns {String|null}
		 */
		url_principal() {
			if (!this.elegida) {
				return this.item.imagen_url
			}
			if (this.original_caido) {
				return url_segura(this.elegida.miniatura)
			}
			return url_segura(this.elegida.url) || url_segura(this.elegida.miniatura)
		},
		texto_del_boton() {
			let cantidad = this.alternativas.length
			return cantidad === 1 ? 'Ver otra imagen que se encontró' : 'Ver las otras ' + cantidad + ' imágenes que se encontraron'
		},
		nombre() {
			return this.item.article_name || ('Artículo N° ' + this.item.article_id)
		},
		/** Datos de la imagen elegida (o un objeto vacío si no vinieron). */
		imagen() {
			if (this.elegida) {
				// La elegida a mano: lo que se sabe de ella es lo que dijo el buscador, sin veredicto de IA.
				return {
					ancho: this.elegida.ancho,
					alto: this.elegida.alto,
					dominio: this.elegida.dominio,
					pagina: this.elegida.pagina,
					fondo_blanco: null,
					ia: null,
				}
			}
			return this.item.imagen && typeof this.item.imagen === 'object' ? this.item.imagen : {}
		},
		/**
		 * Los avisos que manda la API (ya en texto). Si no vino ninguno, el motivo principal
		 * traducido: una fila de "a revisar" sin decir por qué no ayuda a decidir.
		 *
		 * @returns {Array}
		 */
		avisos() {
			if (this.elegida) {
				let resultado = texto_de(RESULTADOS_DE_CANDIDATA, this.elegida.resultado)
				return resultado ? [resultado] : []
			}
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
			// De la elegida a mano lo único que hay es el motivo con el que el sistema la dejó de lado.
			if (this.elegida) {
				return this.elegida.motivo || ''
			}
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
		/**
		 * Página donde apareció la imagen, solo si es un link web (ver url_segura): viene de un
		 * resultado de búsqueda de terceros y va a un href.
		 */
		pagina() {
			return url_segura(this.imagen.pagina)
		},
	},
	watch: {
		/** Se reusó la tarjeta con otra propuesta (se refrescó la lista): se vuelve a lo de siempre. */
		'item.imagen_url'() {
			this.volver_a_la_propuesta()
		},
		elegida_clave() {
			this.original_caido = false
		},
	},
	methods: {
		/** Pide ver la imagen en grande, con el nombre y lo que se sabe de ella. */
		ampliar() {
			this.$emit('ampliar', {
				url: this.url_principal,
				titulo: this.nombre,
				detalle: this.texto_de_la_imagen,
			})
		},
		/**
		 * Aprobar: la propuesta del sistema (null) o la alternativa que se eligió.
		 */
		aprobar() {
			this.$emit('aprobar', this.elegida ? this.elegida.clave : null)
		},
		/**
		 * Despliega u oculta las otras imágenes. Al ocultarlas se vuelve a la propuesta: aprobar
		 * con una imagen elegida que ya no se ve sería aprobar a ciegas.
		 */
		alternar() {
			this.abierto = !this.abierto
			if (!this.abierto) {
				this.volver_a_la_propuesta()
			}
		},
		volver_a_la_propuesta() {
			this.elegida_clave = null
			this.original_caido = false
		},
		/**
		 * Pone en grande una imagen (null = la propuesta del sistema).
		 *
		 * @param {String|null} clave
		 */
		elegir(clave) {
			this.elegida_clave = clave
			// Aprobar en lote asigna la propuesta del sistema: con otra elegida, la tarjeta sale de la
			// selección (si no, la elección se perdería en silencio) y se aprueba con su propio botón.
			if (clave && this.seleccionado) {
				this.$emit('seleccionar', false)
			}
		},
		/** El original de la elegida no abrió (hotlink, caído): se la ve con la miniatura del buscador. */
		al_fallar_el_original() {
			if (this.elegida) {
				this.original_caido = true
			}
		},
		/** La miniatura de una alternativa (la del buscador; si no vino, su original). */
		miniatura_de(alternativa) {
			return url_segura(alternativa.miniatura) || url_segura(alternativa.url)
		},
		/** "tienda.test · 800 × 800 px · Dudosa": lo que se sabe de una alternativa, para su tooltip. */
		rotulo_de(alternativa) {
			let partes = []
			if (alternativa.dominio) {
				partes.push(alternativa.dominio)
			}
			if (alternativa.ancho && alternativa.alto) {
				partes.push(alternativa.ancho + ' × ' + alternativa.alto + ' px')
			}
			let resultado = texto_de(RESULTADOS_DE_CANDIDATA, alternativa.resultado)
			if (resultado) {
				partes.push(resultado)
			}
			return partes.join(' · ')
		},
	},
}
</script>
