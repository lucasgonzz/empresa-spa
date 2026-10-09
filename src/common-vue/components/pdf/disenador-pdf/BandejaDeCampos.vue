<template>
	<!--
		Bandeja del diseñador de PDF: a la derecha de la hoja en escritorio, debajo en tablet y
		teléfono (lo decide Index.vue). Mismo lenguaje que la bandeja del editor de Diseños de Vender:

		- Arriba, la fuente que se CLONA (pull: 'clone'): "Caja nueva" y "Salto de fila", que se
		  arrastran a cualquiera de las dos zonas.
		- La zona para sacar: soltar acá un campo de una caja lo saca de la hoja (también soltándolo
		  sobre la lista de campos de abajo).
		- El buscador y las categorías del catálogo (plegables, con su ícono). Cada campo se arrastra a
		  cualquier caja (se clona con el estilo en null) o se toca con "Agregar". Un campo que ya está
		  en la hoja se ve "En uso" y no se arrastra, salvo el texto libre, que va las veces que se quiera.
		- Al final, "Columnas de la tabla" (misión diseno-ticket-comandera): las columnas del catálogo
		de columnas. Las que no están en la tabla se arrastran a la tabla o se tocan con "Agregar";
		las que están dicen "En la tabla" (tocarlo la muestra). Soltar acá una columna de la tabla
		la saca de la tabla.

		Nada del catálogo está escrito acá: categorías, nombres, ejemplos y zona sugerida llegan del
		endpoint (`disenador.catalogo`). En un ticket de comandera (misión diseno-ticket-comandera) el
		catálogo trae primero la categoría "Negocio" (el logo y los datos del negocio, D6) y acá solo
		cambian los textos ("el ticket" en lugar de "la hoja") y el ejemplo del logo.
	-->
	<aside
	class="dpdf-bandeja"
	:class="clases"
	aria-label="Campos para la hoja"
	data-testid="bandeja-disenador-pdf">

		<!-- ── Fuente de cajas y saltos de fila: se clonan, nunca se vacía ni recibe nada ──────── -->
		<div class="dpdf-bandeja__fuente">
			<p class="dpdf-bandeja__seccion">Para armar {{ papel }}</p>
			<draggable
			class="dpdf-bandeja__fuente-lista"
			:list="fuente"
			:group="grupo_de_la_fuente"
			:clone="clonar_de_la_fuente"
			:sort="false"
			:move="disenador.permitir_movimiento"
			draggable=".dpdf-fuente-arrastrable"
			filter=".dpdf-no-arrastra"
			:prevent-on-filter="false"
			ghost-class="dpdf-hueco"
			drag-class="dpdf-levantado"
			:force-fallback="true"
			:fallback-on-body="true"
			:fallback-tolerance="4"
			:delay="150"
			:delay-on-touch-only="true"
			:scroll-sensitivity="80"
			:scroll-speed="14"
			data-lista="fuente"
			@start="disenador.al_empezar_arrastre($event)"
			@end="disenador.al_terminar_arrastre($event)">
				<div
				v-for="item in fuente"
				:key="item.id"
				class="dpdf-fuente dpdf-fuente-arrastrable"
				:data-cols="item.cols"
				data-tipo="fuente"
				:data-fuente="item.tipo"
				:data-testid="'fuente-' + item.tipo + '-disenador-pdf'"
				:title="item.pista">
					<div class="dpdf-fuente__tarjeta">
						<span class="dpdf-fuente__fila">
							<i
							class="bi bi-grip-vertical dpdf-fuente__agarre"
							aria-hidden="true"></i>
							<i
							class="bi dpdf-fuente__icono"
							:class="item.icono"
							aria-hidden="true"></i>
							<span class="dpdf-fuente__nombre">{{ item.nombre }}</span>
						</span>
						<span class="dpdf-fuente__explicacion">{{ item.explicacion }}</span>
					</div>
				</div>
			</draggable>
		</div>

		<div class="dpdf-bandeja__cabecera">
			<span class="dpdf-bandeja__titulo">
				<i
				class="bi bi-inbox"
				aria-hidden="true"></i>
				Campos
			</span>
			<span
			class="dpdf-bandeja__contador"
			:title="cantidad_en_uso + ' campos en la hoja'">{{ cantidad_en_uso }} en uso</span>
		</div>

		<!--
			Zona para sacar un campo de la hoja. Es una lista arrastrable siempre vacía (`:value` de un
			arreglo que no cambia): lo que se suelta acá sale de su caja y no entra a ningún lado. El
			texto va encima, sin tapar el arrastre (pointer-events: none).
		-->
		<div class="dpdf-bandeja__zona-para-sacar">
			<draggable
			class="dpdf-bandeja__papelera"
			:value="papelera"
			:group="grupo_de_la_papelera"
			:move="disenador.permitir_movimiento"
			draggable=".dpdf-item-de-caja"
			ghost-class="dpdf-hueco"
			drag-class="dpdf-levantado"
			:force-fallback="true"
			:fallback-on-body="true"
			data-lista="papelera"
			data-testid="papelera-disenador-pdf"></draggable>
			<div class="dpdf-bandeja__papelera-texto">
				<i
				class="bi bi-box-arrow-in-down"
				aria-hidden="true"></i>
				<span>{{ recibe ? 'Soltalo acá para sacarlo de ' + papel : 'Arrastrá acá un campo para sacarlo de ' + papel }}</span>
			</div>
		</div>

		<div class="dpdf-bandeja__buscador">
			<i
			class="bi bi-search dpdf-bandeja__lupa"
			aria-hidden="true"></i>
			<input
			v-model="busqueda"
			type="search"
			class="form-control form-control-sm"
			placeholder="Buscar campo…"
			aria-label="Buscar campo"
			autocomplete="off"
			data-testid="buscar-campo-disenador-pdf">
		</div>

		<!-- Las categorías del catálogo, en su orden -->
		<div
		v-for="(categoria, indice) in categorias"
		:key="categoria.key"
		class="dpdf-bandeja__categoria">
			<button
			type="button"
			class="dpdf-bandeja__categoria-cabecera"
			:aria-expanded="abierta(categoria, indice) ? 'true' : 'false'"
			:aria-controls="'dpdf-bandeja-' + categoria.key"
			:data-testid="'categoria-' + categoria.key + '-disenador-pdf'"
			@click="alternar(categoria, indice)">
				<i
				class="bi dpdf-bandeja__chevron"
				:class="abierta(categoria, indice) ? 'bi-chevron-down' : 'bi-chevron-right'"
				aria-hidden="true"></i>
				<i
				class="bi dpdf-bandeja__categoria-icono"
				:class="categoria.icono"
				aria-hidden="true"></i>
				<span class="dpdf-bandeja__categoria-nombre">{{ categoria.nombre }}</span>
				<span
				class="dpdf-bandeja__categoria-cantidad"
				:title="categoria.en_uso + ' de ' + categoria.campos.length + ' en uso'">{{ categoria.en_uso }}/{{ categoria.campos.length }}</span>
			</button>

			<!--
				Los campos de la categoría. `:value` y no `:list`: la lista es una vista del catálogo y
				no se toca. Se clona hacia las cajas; y si se suelta acá un campo de una caja, sale de
				su caja y no entra a la lista (es la misma "zona para sacar" de arriba).
			-->
			<draggable
			v-if="abierta(categoria, indice)"
			:id="'dpdf-bandeja-' + categoria.key"
			class="dpdf-bandeja__lista"
			:value="categoria.campos"
			:group="grupo_de_la_bandeja"
			:clone="clonar_campo"
			:sort="false"
			:move="disenador.permitir_movimiento"
			draggable=".dpdf-bandeja-arrastrable"
			filter=".dpdf-no-arrastra"
			:prevent-on-filter="false"
			ghost-class="dpdf-hueco"
			drag-class="dpdf-levantado"
			:force-fallback="true"
			:fallback-on-body="true"
			:fallback-tolerance="4"
			:delay="150"
			:delay-on-touch-only="true"
			:scroll-sensitivity="80"
			:scroll-speed="14"
			data-lista="categoria"
			@start="disenador.al_empezar_arrastre($event)"
			@end="disenador.al_terminar_arrastre($event)">
				<div
				v-for="definicion in categoria.campos"
				:key="definicion.key"
				class="dpdf-bandeja__campo"
				:class="clases_del_campo(definicion)"
				:data-key="definicion.key"
				data-tipo="campo"
				:title="titulo_del_campo(definicion)">
					<div class="dpdf-bandeja__tarjeta">
						<span class="dpdf-bandeja__fila">
							<i
							class="bi bi-grip-vertical dpdf-bandeja__agarre"
							aria-hidden="true"></i>
							<span class="dpdf-bandeja__nombre">{{ definicion.nombre }}</span>
							<button
							v-if="en_uso(definicion)"
							type="button"
							class="dpdf-bandeja__en-uso dpdf-no-arrastra"
							title="Ya está en la hoja: tocá para verlo"
							:aria-label="definicion.nombre + ' ya está en la hoja. Mostrarlo'"
							@click="disenador.mostrar_campo(definicion.key)">
								<i class="bi bi-check2"></i>
								En uso
							</button>
							<button
							v-else
							type="button"
							class="dpdf-bandeja__agregar dpdf-no-arrastra"
							:title="titulo_de_agregar(definicion)"
							:aria-label="'Agregar ' + definicion.nombre + ' a la hoja'"
							:data-testid="'agregar-campo-' + definicion.key + '-disenador-pdf'"
							@click="disenador.agregar_campo(definicion)">
								<i class="bi bi-plus-lg"></i>
								Agregar
							</button>
						</span>
						<span class="dpdf-bandeja__ejemplo">{{ ejemplo_de(definicion) }}</span>
					</div>
				</div>
			</draggable>
		</div>

		<!--
			Columnas de la tabla. `:value` (no `:list`): la lista es una vista de la tabla de trabajo
			del diseñador. Al arrastrar una columna se "clona" la MISMA columna (clonar_columna) y entra
			a `tabla.visibles`; al soltar acá una de la tabla, vuedraggable la saca de la tabla y acá no
			entra a ningún lado (vuelve a aparecer sola: las ocultas son las que no están en la tabla).
		-->
		<div
		v-if="disenador.tabla.columnas.length && (lista_de_columnas.length || !busqueda.trim())"
		class="dpdf-bandeja__categoria dpdf-bandeja__columnas"
		:class="{ 'dpdf-bandeja__columnas--recibe': recibe_columna }">
			<button
			type="button"
			class="dpdf-bandeja__categoria-cabecera"
			:aria-expanded="columnas_abiertas ? 'true' : 'false'"
			aria-controls="dpdf-bandeja-columnas"
			data-testid="categoria-columnas-disenador-pdf"
			@click="alternar_columnas">
				<i
				class="bi dpdf-bandeja__chevron"
				:class="columnas_abiertas ? 'bi-chevron-down' : 'bi-chevron-right'"
				aria-hidden="true"></i>
				<i
				class="bi bi-table dpdf-bandeja__categoria-icono"
				aria-hidden="true"></i>
				<span class="dpdf-bandeja__categoria-nombre">Columnas de la tabla</span>
				<span
				class="dpdf-bandeja__categoria-cantidad"
				:title="disenador.tabla.visibles.length + ' de ' + disenador.tabla.columnas.length + ' en la tabla'">{{ disenador.tabla.visibles.length }}/{{ disenador.tabla.columnas.length }}</span>
			</button>

			<p
			v-if="columnas_abiertas && recibe_columna"
			class="dpdf-bandeja__columnas-pista">Soltala acá para sacarla de la tabla.</p>

			<draggable
			v-if="columnas_abiertas"
			id="dpdf-bandeja-columnas"
			class="dpdf-bandeja__lista"
			:value="lista_de_columnas"
			:group="grupo_de_columnas"
			:clone="clonar_columna"
			:sort="false"
			:move="disenador.permitir_movimiento"
			draggable=".dpdf-bandeja-columna-arrastrable"
			filter=".dpdf-no-arrastra"
			:prevent-on-filter="false"
			ghost-class="dpdf-hueco"
			drag-class="dpdf-levantado"
			:force-fallback="true"
			:fallback-on-body="true"
			:fallback-tolerance="4"
			:delay="150"
			:delay-on-touch-only="true"
			:scroll-sensitivity="80"
			:scroll-speed="14"
			data-lista="columnas"
			data-testid="columnas-bandeja-disenador-pdf"
			@start="disenador.al_empezar_arrastre($event)"
			@end="disenador.al_terminar_arrastre($event)">
				<div
				v-for="columna in lista_de_columnas"
				:key="columna.ui_id"
				class="dpdf-bandeja__campo dpdf-bandeja__columna"
				:class="clases_de_columna(columna)"
				:style="{ '--dpdf-cols': columna.cols }"
				data-tipo="columna"
				:title="columna.nombre + ': en el PDF se imprime «' + columna.rotulo + '»'">
					<div class="dpdf-bandeja__tarjeta">
						<span class="dpdf-bandeja__fila">
							<i
							class="bi bi-grip-vertical dpdf-bandeja__agarre"
							aria-hidden="true"></i>
							<span class="dpdf-bandeja__nombre">{{ columna.nombre }}</span>
							<button
							v-if="en_la_tabla(columna)"
							type="button"
							class="dpdf-bandeja__en-uso dpdf-no-arrastra"
							title="Ya está en la tabla: tocá para verla"
							:aria-label="columna.nombre + ' ya está en la tabla. Mostrarla'"
							@click="disenador.mostrar_columna(columna)">
								<i class="bi bi-check2"></i>
								En la tabla
							</button>
							<button
							v-else
							type="button"
							class="dpdf-bandeja__agregar dpdf-no-arrastra"
							title="Agregarla al final de la tabla"
							:aria-label="'Agregar la columna ' + columna.nombre + ' a la tabla'"
							:data-testid="'agregar-columna-' + columna.value_resolver + '-disenador-pdf'"
							@click="disenador.agregar_columna(columna)">
								<i class="bi bi-plus-lg"></i>
								Agregar
							</button>
						</span>
						<span class="dpdf-bandeja__ejemplo">Encabezado: «{{ columna.rotulo }}»</span>
					</div>
				</div>
			</draggable>
		</div>

		<p
		v-if="busqueda && !categorias.length && !lista_de_columnas.length"
		class="dpdf-bandeja__sin-resultados">
			Ningún campo ni columna dice «{{ busqueda }}».
		</p>
	</aside>
</template>
<script>
import draggable from 'vuedraggable'
import { KEY_TEXTO_LIBRE, TIPO_CAJA, TIPO_SALTO_DE_FILA, COLS_DE_CAJA_NUEVA } from './estado_del_disenador'

/* La fuente de cajas y saltos: se CLONA hacia las zonas (grupo pdf-cajas) y no recibe nada */
const GRUPO_DE_LA_FUENTE = {
	name: 'pdf-cajas',
	pull: 'clone',
	put: false,
}

/*
	Las categorías del catálogo: se clonan hacia las cajas y reciben lo que se saca (se descarta).
	🔴 `put` como LISTA de grupos y no `true`: en SortableJS `put: true` acepta elementos de cualquier
	grupo (una caja o un salto de fila también). Ver CajaDelDisenador.vue.
*/
const GRUPO_DE_LA_BANDEJA = {
	name: 'pdf-campos',
	pull: 'clone',
	put: ['pdf-campos'],
}

/* La zona para sacar: solo recibe, y solo campos (ver arriba) */
const GRUPO_DE_LA_PAPELERA = {
	name: 'pdf-campos',
	pull: false,
	put: ['pdf-campos'],
}

/*
	"Columnas de la tabla": se "clonan" hacia la fila de la tabla (el clon es la misma columna, ver
	clonar_columna) y reciben las que salen de la tabla. Grupo propio (pdf-columnas, el de la fila de
	la tabla): una columna nunca cae en una caja ni un campo en la tabla.
*/
const GRUPO_DE_COLUMNAS = {
	name: 'pdf-columnas',
	pull: 'clone',
	put: ['pdf-columnas'],
}

/* Clave de "Columnas de la tabla" en `abiertas` (no choca con las keys de categorías del catálogo) */
const CLAVE_DE_COLUMNAS = '__columnas_de_la_tabla'

/* Lo que se muestra de ejemplo de un campo de tipo lista: los renglones, separados */
const SEPARADOR_DE_RENGLONES = ' · '

/**
 * Pasa un texto a minúsculas y sin acentos, para buscar "telefono" y encontrar "Teléfono".
 *
 * @param {*} texto
 * @returns {string}
 */
function para_buscar(texto) {
	return String(texto === null || typeof texto == 'undefined' ? '' : texto)
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
}

/**
 * Bandeja de campos del diseñador de PDF (misión diseno-pdf-configurable, 1/10/2026).
 *
 * Las acciones (agregar, mostrar, clonar, el `move`) las resuelve el diseñador, que llega por
 * `inject`; acá queda lo propio de la bandeja: la búsqueda y qué categorías están abiertas.
 */
export default {
	name: 'BandejaDeCampos',
	inject: ['disenador'],
	components: {
		draggable,
	},
	data() {
		return {
			grupo_de_la_fuente: GRUPO_DE_LA_FUENTE,
			grupo_de_la_bandeja: GRUPO_DE_LA_BANDEJA,
			grupo_de_la_papelera: GRUPO_DE_LA_PAPELERA,
			grupo_de_columnas: GRUPO_DE_COLUMNAS,
			/* La lista de la zona para sacar: siempre vacía (ver el template) */
			papelera: [],
			/* Lo que se escribió en "Buscar campo…" */
			busqueda: '',
			/* Categorías abiertas o cerradas a mano: {key: true|false}. Sin tocar: abierta la primera */
			abiertas: {},
			/*
				Los dos ítems que se ofrecen para armar la hoja. Cada arrastre inserta un clon limpio
				(clonar_de_la_fuente): lo demás (nombre, ícono, textos) es solo para dibujar la fuente.
				`cols` es el ancho del hueco mientras se arrastra (el de la caja que se va a crear).
			*/
			fuente: [
				{
					tipo: TIPO_CAJA,
					id: 'fuente_caja',
					cols: COLS_DE_CAJA_NUEVA,
					nombre: 'Caja nueva',
					icono: 'bi-square',
					explicacion: 'Un cuadrante para poner campos, con título si querés.',
					pista: 'Arrastrala a la zona de arriba de la tabla o al pie',
				},
				{
					tipo: TIPO_SALTO_DE_FILA,
					id: 'fuente_salto',
					cols: 12,
					nombre: 'Salto de fila',
					icono: 'bi-arrow-return-left',
					explicacion: 'Lo que sigue empieza en una fila nueva. No se imprime.',
					pista: 'Arrastralo a una zona: lo que sigue empieza en una fila nueva',
				},
			],
		}
	},
	computed: {
		/**
		 * Si se está arrastrando un campo que salió de una caja: la zona para sacar se ofrece.
		 *
		 * @returns {boolean}
		 */
		recibe() {
			let arrastrando = this.disenador.arrastrando
			return !!(arrastrando && arrastrando.tipo === 'campo' && arrastrando.desde === 'campos')
		},
		/**
		 * Clases de estado de la bandeja.
		 *
		 * @returns {Object}
		 */
		clases() {
			return {
				'dpdf-bandeja--recibe': this.recibe,
			}
		},
		/**
		 * Cuántos campos del catálogo están en la hoja (el texto libre no cuenta).
		 *
		 * @returns {number}
		 */
		cantidad_en_uso() {
			return Object.keys(this.disenador.keys_en_uso).length
		},
		/**
		 * Cómo se nombra lo que se arma en los textos de la bandeja: "la hoja" o, en un ticket de
		 * comandera, "el ticket".
		 *
		 * @returns {string}
		 */
		papel() {
			return this.disenador.es_ticket ? 'el ticket' : 'la hoja'
		},
		/**
		 * Las categorías del catálogo con sus campos (filtrados por la búsqueda) y cuántos están en
		 * uso. Con una búsqueda, solo las que tienen algo que coincide.
		 *
		 * @returns {Array<{key, nombre, icono, campos, en_uso}>}
		 */
		categorias() {
			let self = this
			let buscado = para_buscar(this.busqueda).trim()
			let catalogo = this.disenador.catalogo
			let resultado = []

			if (!catalogo) {
				return resultado
			}

			catalogo.categorias.forEach(function (categoria) {
				let campos = catalogo.campos.filter(function (definicion) {
					if (definicion.categoria !== categoria.key) {
						return false
					}
					if (!buscado) {
						return true
					}
					let texto = para_buscar(definicion.nombre + ' ' + definicion.etiqueta + ' ' + self.ejemplo_de(definicion))
					return texto.indexOf(buscado) !== -1
				})

				if (buscado && !campos.length) {
					return
				}

				let en_uso = campos.filter(function (definicion) {
					return self.en_uso(definicion)
				}).length

				resultado.push({
					key: categoria.key,
					nombre: categoria.nombre,
					icono: categoria.icono,
					campos: campos,
					en_uso: en_uso,
				})
			})

			return resultado
		},
		/**
		 * Las columnas de la tabla que se muestran en la bandeja (todas, filtradas por la búsqueda),
		 * en el orden del catálogo de columnas.
		 *
		 * @returns {Array}
		 */
		lista_de_columnas() {
			let buscado = para_buscar(this.busqueda).trim()
			return this.disenador.tabla.columnas.filter(function (columna) {
				if (!buscado) {
					return true
				}
				return para_buscar(columna.nombre + ' ' + columna.rotulo).indexOf(buscado) !== -1
			})
		},
		/**
		 * Si "Columnas de la tabla" se ve abierta: con una búsqueda, sí; si no, la que se abrió o cerró
		 * a mano (sin tocar, cerrada: la primera categoría de campos es la que arranca abierta).
		 *
		 * @returns {boolean}
		 */
		columnas_abiertas() {
			if (this.busqueda.trim()) {
				return true
			}
			return !!this.abiertas[CLAVE_DE_COLUMNAS]
		},
		/**
		 * Si se está arrastrando una columna de la tabla (la bandeja se ofrece para sacarla).
		 *
		 * @returns {boolean}
		 */
		recibe_columna() {
			let arrastrando = this.disenador.arrastrando
			return !!(arrastrando && arrastrando.tipo === 'columna' && arrastrando.desde === 'tabla')
		},
	},
	watch: {
		/**
		 * "+ Agregar columna" de la tabla pide ver las columnas: se abre la categoría (y se limpia la
		 * búsqueda, por si las escondía).
		 *
		 * @returns {void}
		 */
		'disenador.pedido_de_columnas'() {
			this.busqueda = ''
			this.$set(this.abiertas, CLAVE_DE_COLUMNAS, true)
		},
	},
	methods: {
		/**
		 * Abre o cierra "Columnas de la tabla".
		 *
		 * @returns {void}
		 */
		alternar_columnas() {
			this.$set(this.abiertas, CLAVE_DE_COLUMNAS, !this.columnas_abiertas)
		},
		/**
		 * Si una columna está en la tabla.
		 *
		 * @param {Object} columna
		 * @returns {boolean}
		 */
		en_la_tabla(columna) {
			return this.disenador.tabla.visibles.indexOf(columna) !== -1
		},
		/**
		 * Clases de una columna de la bandeja: solo las que no están en la tabla se pueden arrastrar.
		 *
		 * @param {Object} columna
		 * @returns {Object}
		 */
		clases_de_columna(columna) {
			let esta = this.en_la_tabla(columna)
			return {
				'dpdf-bandeja-columna-arrastrable': !esta,
				'dpdf-bandeja__campo--en-uso': esta,
			}
		},
		/**
		 * Lo que vuedraggable inserta en la tabla al soltar una columna de la bandeja: la MISMA
		 * columna de trabajo (no una copia): es una sola por opción, esté en la tabla o en la bandeja.
		 *
		 * @param {Object} columna
		 * @returns {Object}
		 */
		clonar_columna(columna) {
			return columna
		},
		/**
		 * Si una categoría se ve abierta: con una búsqueda, todas; si no, la que se abrió o cerró a
		 * mano y, sin tocar, la primera.
		 *
		 * @param {Object} categoria
		 * @param {number} indice
		 * @returns {boolean}
		 */
		abierta(categoria, indice) {
			if (this.busqueda.trim()) {
				return true
			}
			if (Object.prototype.hasOwnProperty.call(this.abiertas, categoria.key)) {
				return this.abiertas[categoria.key]
			}
			return indice === 0
		},
		/**
		 * Abre o cierra una categoría.
		 *
		 * @param {Object} categoria
		 * @param {number} indice
		 * @returns {void}
		 */
		alternar(categoria, indice) {
			this.$set(this.abiertas, categoria.key, !this.abierta(categoria, indice))
		},
		/**
		 * Si un campo del catálogo ya está en la hoja (el texto libre nunca: se repite).
		 *
		 * @param {Object} definicion
		 * @returns {boolean}
		 */
		en_uso(definicion) {
			return definicion.key !== KEY_TEXTO_LIBRE && !!this.disenador.keys_en_uso[definicion.key]
		},
		/**
		 * Clases de un campo de la bandeja: solo los que no están en uso se pueden arrastrar.
		 *
		 * @param {Object} definicion
		 * @returns {Object}
		 */
		clases_del_campo(definicion) {
			let usado = this.en_uso(definicion)
			return {
				'dpdf-bandeja-arrastrable': !usado,
				'dpdf-bandeja__campo--en-uso': usado,
			}
		},
		/**
		 * El ejemplo de un campo en una línea (una lista muestra sus renglones separados).
		 *
		 * @param {Object} definicion
		 * @returns {string}
		 */
		ejemplo_de(definicion) {
			/* El logo del ticket (tipo `imagen`) no tiene un ejemplo de texto */
			if (definicion.tipo === 'imagen') {
				return 'El logo, centrado a todo el ancho'
			}
			let ejemplo = definicion.ejemplo
			if (Array.isArray(ejemplo)) {
				return ejemplo.join(SEPARADOR_DE_RENGLONES)
			}
			return ejemplo === null || typeof ejemplo == 'undefined' ? '' : String(ejemplo)
		},
		/**
		 * El title de un campo: su nombre y cuándo aparece en el PDF.
		 *
		 * @param {Object} definicion
		 * @returns {string}
		 */
		titulo_del_campo(definicion) {
			return definicion.nombre + (definicion.aparece_cuando ? '. ' + definicion.aparece_cuando : '')
		},
		/**
		 * El title de "Agregar": a dónde va a ir el campo (la regla de agregar_campo del diseñador).
		 *
		 * @param {Object} definicion
		 * @returns {string}
		 */
		titulo_de_agregar(definicion) {
			let seleccion = this.disenador.seleccion_actual
			if (seleccion && (seleccion.tipo === 'caja' || seleccion.tipo === 'campo')) {
				return 'Agregarlo a la caja seleccionada'
			}
			return definicion.zona_sugerida === 'pie' ? 'Agregarlo a la última caja del pie' : 'Agregarlo a la última caja de arriba de la tabla'
		},
		/**
		 * Lo que vuedraggable inserta en una caja al soltar un campo de la bandeja: un campo nuevo
		 * con el estilo en null (el texto libre, con su id propio).
		 *
		 * @param {Object} definicion
		 * @returns {Object}
		 */
		clonar_campo(definicion) {
			return this.disenador.clonar_campo(definicion)
		},
		/**
		 * Lo que vuedraggable inserta en una zona al soltar la "Caja nueva" o el "Salto de fila".
		 *
		 * @param {Object} item ítem de la fuente
		 * @returns {Object}
		 */
		clonar_de_la_fuente(item) {
			return this.disenador.clonar_de_la_fuente(item)
		},
	},
}
</script>
<style lang="sass">
// Sin `scoped`: el clon de Sortable que sigue al puntero cuelga de <body> (ver ZonaDelDisenador.vue).
// Colores solo por token. Mismo lenguaje que la bandeja del editor de Diseños de Vender.
.dpdf-bandeja
	display: flex
	flex-direction: column
	gap: 10px
	padding: 14px
	border: 1px solid var(--color-border)
	border-radius: 12px
	background: var(--bg-card)
	transition: border-color .15s ease

// ── Fuente ────────────────────────────────────────────────────────────────────────────────────
.dpdf-bandeja__fuente
	display: flex
	flex-direction: column
	gap: 6px
	padding-bottom: 12px
	border-bottom: 1px solid var(--color-border-secondary)

.dpdf-bandeja__seccion
	margin: 0
	color: var(--color-text-secondary)
	font-size: 0.72rem
	font-weight: 600
	text-transform: uppercase
	letter-spacing: 0.03em

.dpdf-bandeja__fuente-lista
	display: flex
	flex-direction: column
	gap: 6px

.dpdf-fuente
	min-width: 0

	.dpdf-fuente__tarjeta
		display: flex
		flex-direction: column
		gap: 3px
		min-width: 0
		padding: 7px 8px
		border: 1px dashed var(--color-border)
		border-radius: 10px
		background: var(--bg-card)
		cursor: grab
		user-select: none
		transition: border-color .15s ease

		&:hover
			border-color: var(--color-primary)

	.dpdf-fuente__fila
		display: flex
		align-items: center
		gap: 8px
		min-width: 0

	.dpdf-fuente__agarre,
	.dpdf-fuente__icono
		flex: 0 0 auto
		color: var(--color-text-secondary)
		font-size: 0.82rem

	.dpdf-fuente__nombre
		flex: 1 1 auto
		min-width: 0
		color: var(--color-text-primary)
		font-size: 0.8rem
		font-weight: 600

	.dpdf-fuente__explicacion
		padding-left: 18px
		color: var(--color-text-secondary)
		font-size: 0.72rem
		line-height: 1.35

// ── Campos ────────────────────────────────────────────────────────────────────────────────────
.dpdf-bandeja__cabecera
	display: flex
	align-items: center
	justify-content: space-between
	gap: 8px

.dpdf-bandeja__titulo
	display: inline-flex
	align-items: center
	gap: 8px
	font-size: 0.92rem
	font-weight: 700
	color: var(--color-text-primary)

.dpdf-bandeja__contador
	padding: 1px 8px
	border-radius: 999px
	background: var(--bg-section)
	color: var(--color-text-secondary)
	font-size: 0.75rem
	font-weight: 600
	white-space: nowrap

// La zona para sacar: la lista vacía es el destino; el texto va encima sin tapar el arrastre
.dpdf-bandeja__zona-para-sacar
	position: relative

.dpdf-bandeja__papelera
	position: relative
	z-index: 1
	display: flex
	flex-direction: column
	min-height: 44px
	padding: 4px
	border: 1.5px dashed var(--color-border)
	border-radius: 10px
	transition: border-color .15s ease, background .15s ease

	// Un campo de una caja que pasa por acá, mientras se arrastra: un renglón finito
	> .dpdf-hueco
		max-height: 32px
		overflow: hidden

.dpdf-bandeja__papelera-texto
	position: absolute
	top: 0
	left: 0
	right: 0
	bottom: 0
	z-index: 2
	display: flex
	align-items: center
	justify-content: center
	gap: 8px
	padding: 6px 12px
	color: var(--color-text-secondary)
	font-size: 0.76rem
	line-height: 1.3
	text-align: center
	pointer-events: none

	i
		flex: 0 0 auto
		font-size: 0.95rem

// Mientras se arrastra un campo de una caja: la bandeja se ofrece como destino
.dpdf-bandeja--recibe
	border-color: var(--color-primary)

	.dpdf-bandeja__papelera
		border-color: var(--color-primary)
		background: var(--bg-nav-hover)

	.dpdf-bandeja__papelera-texto
		color: var(--color-primary)
		font-weight: 600

// Con el hueco adentro, el texto se corre (:has() es mejora progresiva)
.dpdf-bandeja__zona-para-sacar:has(.dpdf-hueco) .dpdf-bandeja__papelera-texto
	opacity: 0

.dpdf-bandeja__buscador
	position: relative

	.form-control
		padding-left: 30px

.dpdf-bandeja__lupa
	position: absolute
	top: 50%
	left: 10px
	z-index: 1
	transform: translateY(-50%)
	color: var(--color-text-secondary)
	font-size: 0.8rem
	pointer-events: none

// Categorías plegables
.dpdf-bandeja__categoria
	display: flex
	flex-direction: column
	gap: 6px

.dpdf-bandeja__categoria-cabecera
	display: flex
	align-items: center
	gap: 7px
	width: 100%
	padding: 6px 8px
	border: 0
	border-radius: 8px
	background: var(--bg-section)
	color: var(--color-text-primary)
	font-size: 0.82rem
	font-weight: 700
	text-align: left
	cursor: pointer
	transition: background .15s ease

	&:hover
		background: var(--bg-hover)

	&:focus
		outline: none

	&:focus-visible
		box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)

.dpdf-bandeja__chevron
	flex: 0 0 auto
	color: var(--color-text-secondary)
	font-size: 0.7rem

.dpdf-bandeja__categoria-icono
	flex: 0 0 auto
	color: var(--color-primary)

.dpdf-bandeja__categoria-nombre
	flex: 1 1 auto
	min-width: 0

.dpdf-bandeja__categoria-cantidad
	flex: 0 0 auto
	color: var(--color-text-secondary)
	font-size: 0.72rem
	font-weight: 600
	font-variant-numeric: tabular-nums

.dpdf-bandeja__lista
	display: flex
	flex-direction: column
	gap: 6px
	min-height: 8px

	// Un campo de una caja que pasa por acá (se va a sacar): un renglón finito
	> .dpdf-campo.dpdf-hueco
		max-height: 32px
		overflow: hidden

.dpdf-bandeja__campo
	min-width: 0

.dpdf-bandeja__tarjeta
	display: flex
	flex-direction: column
	gap: 3px
	min-width: 0
	padding: 6px 8px
	border: 1px solid var(--color-border)
	border-radius: 10px
	background: var(--bg-card)
	cursor: grab
	user-select: none
	transition: border-color .15s ease

	&:hover
		border-color: var(--color-primary)

.dpdf-bandeja__fila
	display: flex
	align-items: center
	gap: 8px
	min-width: 0

.dpdf-bandeja__agarre
	flex: 0 0 auto
	color: var(--color-text-secondary)
	font-size: 0.8rem

.dpdf-bandeja__nombre
	flex: 1 1 auto
	min-width: 0
	color: var(--color-text-primary)
	font-size: 0.8rem
	font-weight: 600
	white-space: nowrap
	overflow: hidden
	text-overflow: ellipsis

// El ejemplo: lo que se va a ver en el PDF, en gris y en un renglón
.dpdf-bandeja__ejemplo
	padding-left: 18px
	color: var(--color-text-secondary)
	font-size: 0.72rem
	line-height: 1.35
	white-space: nowrap
	overflow: hidden
	text-overflow: ellipsis

.dpdf-bandeja__agregar,
.dpdf-bandeja__en-uso
	display: inline-flex
	align-items: center
	gap: 4px
	flex: 0 0 auto
	padding: 3px 9px
	border: 1px solid var(--color-border)
	border-radius: 999px
	background: var(--bg-card)
	font-size: 0.74rem
	font-weight: 600
	line-height: 1.3
	cursor: pointer
	transition: background .15s ease, border-color .15s ease

	&:focus
		outline: none

	&:focus-visible
		box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)
		border-color: var(--color-primary)

.dpdf-bandeja__agregar
	color: var(--color-primary)

	&:hover
		background: var(--bg-nav-hover)
		border-color: var(--color-primary)

// En uso: ya está en la hoja, no se arrastra (tocarlo lo muestra en la hoja)
.dpdf-bandeja__en-uso
	border-color: transparent
	background: var(--bg-section)
	color: var(--color-text-secondary)

	&:hover
		border-color: var(--color-border)

.dpdf-bandeja__campo--en-uso .dpdf-bandeja__tarjeta
	border-style: dashed
	cursor: default

	&:hover
		border-color: var(--color-border)

	.dpdf-bandeja__agarre
		visibility: hidden

	.dpdf-bandeja__nombre
		color: var(--color-text-secondary)

.dpdf-bandeja__sin-resultados
	margin: 0
	color: var(--color-text-secondary)
	font-size: 0.78rem
	text-align: center

// ── Columnas de la tabla ──────────────────────────────────────────────────────────────────────
// Mientras se arrastra una columna de la tabla: la lista se ofrece para sacarla (como la papelera)
.dpdf-bandeja__columnas--recibe
	.dpdf-bandeja__lista
		min-height: 44px
		padding: 4px
		border: 1.5px dashed var(--color-primary)
		border-radius: 10px
		background: var(--bg-nav-hover)

.dpdf-bandeja__columnas-pista
	margin: 0
	color: var(--color-primary)
	font-size: 0.74rem
	font-weight: 600

// Una columna de la tabla que pasa por acá (se va a sacar): un renglón finito
.dpdf-bandeja__lista > .dpdf-columna.dpdf-hueco
	max-height: 32px
	overflow: hidden
</style>
