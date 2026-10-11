<template>
	<!--
		Propiedades del campo seleccionado (plan §8.3): cuándo aparece, el rótulo, el texto (solo el
		texto libre), la letra (tamaño, negrita, cursiva), la alineación, "Volver al estilo del campo"
		y sacarlo. Los valores que se muestran son los EFECTIVOS (el del campo o, si es null, el del
		catálogo); tocar − / +, B o I deja un valor propio. Los estilos de las clases dpdf-panel__*
		están en PanelDePropiedades.vue.

		En un ticket de comandera (misión diseno-ticket-comandera, D7) la letra es la de la comandera:
		tres tamaños en tres botones (Normal, Alto doble y Grande, del catálogo), negrita y
		alineación; sin cursiva (las térmicas no la tienen). El logo del negocio no lleva rótulo ni
		letra.
	-->
	<div class="dpdf-panel__cuerpo">
		<p
		v-if="aparece_cuando"
		class="dpdf-panel__aparece">
			<i
			class="bi bi-eye"
			aria-hidden="true"></i>
			<span>{{ aparece_cuando }}</span>
		</p>

		<p
		v-if="campo_perdido"
		class="dpdf-panel__perdido"
		role="status">
			<i
			class="bi bi-exclamation-triangle"
			aria-hidden="true"></i>
			<span>Este campo ya no está en el catálogo: el PDF no lo imprime. Podés sacarlo de la caja.</span>
		</p>

		<template v-else>
			<!-- El texto libre: lo que se imprime -->
			<div
			v-if="es_texto_libre"
			class="dpdf-panel__bloque">
				<label
				for="dpdf-panel-texto"
				class="dpdf-panel__etiqueta">Texto</label>
				<textarea
				id="dpdf-panel-texto"
				class="form-control"
				rows="3"
				:value="campo.texto"
				:maxlength="disenador.limites.max_texto_libre"
				placeholder="Escribí el texto que se imprime"
				data-testid="texto-panel-disenador-pdf"
				@input="campo.texto = $event.target.value"></textarea>
				<small class="dpdf-panel__ayuda">{{ largo_del_texto }}/{{ disenador.limites.max_texto_libre }} caracteres. Podés usar varios renglones.</small>
				<!-- Largo para el ancho de su caja: aviso suave, no bloquea (el PDF no parte una caja entre hojas) -->
				<p
				v-if="texto_largo"
				class="dpdf-panel__aviso"
				role="status"
				data-testid="aviso-texto-largo-panel-disenador-pdf">
					<i
					class="bi bi-exclamation-triangle"
					aria-hidden="true"></i>
					<span>{{ aviso_de_texto_largo }}</span>
				</p>
			</div>

			<!-- Ticket: el logo es una imagen, sin rótulo ni letra -->
			<p
			v-if="es_logo"
			class="dpdf-panel__nota">
				<i
				class="bi bi-image"
				aria-hidden="true"></i>
				<span>Es una imagen: no lleva rótulo ni letra. En la vista se ve un logo de muestra.</span>
			</p>

			<!-- El rótulo: el del catálogo (vacío), uno propio o ninguno -->
			<div
			v-if="!es_logo"
			class="dpdf-panel__bloque">
				<label
				for="dpdf-panel-rotulo"
				class="dpdf-panel__etiqueta">Rótulo</label>
				<input
				id="dpdf-panel-rotulo"
				type="text"
				class="form-control form-control-sm"
				:value="valor_del_rotulo"
				:placeholder="placeholder_del_rotulo"
				:maxlength="disenador.limites.max_etiqueta"
				:disabled="!!rotulo_del_catalogo && campo.etiqueta === ''"
				autocomplete="off"
				data-testid="rotulo-panel-disenador-pdf"
				@input="cambiar_rotulo($event.target.value)">
				<b-form-checkbox
				v-if="rotulo_del_catalogo"
				class="dpdf-panel__sin-rotulo"
				:checked="campo.etiqueta === ''"
				@change="cambiar_sin_rotulo">
					Sin rótulo (solo el valor)
				</b-form-checkbox>
			</div>

			<!-- Ticket: los tres tamaños de la comandera y la negrita (sin cursiva) -->
			<div
			v-if="es_ticket && !es_logo"
			class="dpdf-panel__bloque">
				<span
				id="dpdf-panel-etiqueta-letra-ticket"
				class="dpdf-panel__etiqueta">Letra</span>
				<div
				class="dpdf-panel__tamanos"
				role="radiogroup"
				aria-labelledby="dpdf-panel-etiqueta-letra-ticket">
					<button
					v-for="opcion in tamanos_de_la_comandera"
					:key="opcion.tamano"
					type="button"
					role="radio"
					class="dpdf-panel__tamano"
					:class="{ 'dpdf-panel__tamano--activo': es_el_tamano(opcion) }"
					:aria-checked="es_el_tamano(opcion) ? 'true' : 'false'"
					:data-testid="'tamano-' + opcion.tamano + '-panel-disenador-pdf'"
					@click="campo.tamano = opcion.tamano">
						{{ opcion.nombre }}
					</button>
				</div>
				<div class="dpdf-panel__letra">
					<button
					type="button"
					class="dpdf-panel__alternar"
					:class="{ 'dpdf-panel__alternar--activo': estilo.negrita }"
					:aria-pressed="estilo.negrita ? 'true' : 'false'"
					title="Negrita"
					aria-label="Negrita"
					data-testid="negrita-panel-disenador-pdf"
					@click="campo.negrita = !estilo.negrita">
						<i class="bi bi-type-bold"></i>
					</button>
				</div>
				<small class="dpdf-panel__ayuda">{{ ayuda_del_tamano }}</small>
			</div>

			<!-- La letra: tamaño, negrita y cursiva -->
			<div
			v-if="!es_ticket"
			class="dpdf-panel__bloque">
				<span
				id="dpdf-panel-etiqueta-letra"
				class="dpdf-panel__etiqueta">Letra</span>
				<div
				class="dpdf-panel__letra"
				role="group"
				aria-labelledby="dpdf-panel-etiqueta-letra">
					<div class="dpdf-panel__paso">
						<button
						type="button"
						class="dpdf-panel__boton"
						:disabled="estilo.tamano <= disenador.limites.tamano_min"
						title="Letra más chica"
						aria-label="Letra un punto más chica"
						data-testid="achicar-letra-panel-disenador-pdf"
						@click="cambiar_tamano(-1)">
							<i class="bi bi-dash-lg"></i>
						</button>
						<span
						class="dpdf-panel__valor"
						aria-live="polite">{{ estilo.tamano }} pt</span>
						<button
						type="button"
						class="dpdf-panel__boton"
						:disabled="estilo.tamano >= disenador.limites.tamano_max"
						title="Letra más grande"
						aria-label="Letra un punto más grande"
						data-testid="agrandar-letra-panel-disenador-pdf"
						@click="cambiar_tamano(1)">
							<i class="bi bi-plus-lg"></i>
						</button>
					</div>
					<button
					type="button"
					class="dpdf-panel__alternar"
					:class="{ 'dpdf-panel__alternar--activo': estilo.negrita }"
					:aria-pressed="estilo.negrita ? 'true' : 'false'"
					title="Negrita"
					aria-label="Negrita"
					data-testid="negrita-panel-disenador-pdf"
					@click="campo.negrita = !estilo.negrita">
						<i class="bi bi-type-bold"></i>
					</button>
					<button
					type="button"
					class="dpdf-panel__alternar"
					:class="{ 'dpdf-panel__alternar--activo': estilo.cursiva }"
					:aria-pressed="estilo.cursiva ? 'true' : 'false'"
					title="Cursiva"
					aria-label="Cursiva"
					data-testid="cursiva-panel-disenador-pdf"
					@click="campo.cursiva = !estilo.cursiva">
						<i class="bi bi-type-italic"></i>
					</button>
				</div>
			</div>

			<!-- La alineación del renglón -->
			<div
			v-if="!es_logo"
			class="dpdf-panel__bloque">
				<span
				id="dpdf-panel-etiqueta-alineacion"
				class="dpdf-panel__etiqueta">Alineación</span>
				<div
				class="dpdf-panel__alineaciones"
				role="radiogroup"
				aria-labelledby="dpdf-panel-etiqueta-alineacion">
					<button
					v-for="alineacion in disenador.limites.alineaciones"
					:key="alineacion"
					type="button"
					role="radio"
					class="dpdf-panel__alternar"
					:class="{ 'dpdf-panel__alternar--activo': estilo.alineacion === alineacion }"
					:aria-checked="estilo.alineacion === alineacion ? 'true' : 'false'"
					:title="nombre_de_la_alineacion(alineacion)"
					:aria-label="nombre_de_la_alineacion(alineacion)"
					:data-testid="'alineacion-' + alineacion + '-panel-disenador-pdf'"
					@click="campo.alineacion = alineacion">
						<i
						class="bi"
						:class="icono_de_la_alineacion(alineacion)"></i>
					</button>
				</div>
			</div>

			<button
			v-if="!es_logo"
			type="button"
			class="dpdf-panel__restablecer"
			:disabled="!con_estilo_propio"
			data-testid="restablecer-panel-disenador-pdf"
			@click="disenador.restablecer_estilo(campo)">
				<i class="bi bi-arrow-counterclockwise"></i>
				Volver al estilo del campo
			</button>
		</template>

		<b-button
		variant="outline-danger"
		size="sm"
		class="dpdf-panel__quitar"
		data-testid="sacar-panel-disenador-pdf"
		@click="disenador.quitar_campo(campo)">
			<i class="bi bi-trash3"></i>
			Sacar de la caja
		</b-button>
	</div>
</template>
<script>
import {
	KEY_TEXTO_LIBRE,
	acotar_entero,
	estilo_efectivo,
	tiene_estilo_propio,
	texto_libre_largo,
	aviso_de_texto_largo,
} from './estado_del_disenador'
import { nombre_de_la_alineacion, icono_de_la_alineacion } from './estilos_de_caja'
import { tamanos_de_ticket, clase_de_tamano, ALTO, GRANDE, TIPO_IMAGEN } from './vista_de_ticket'

/**
 * Propiedades de un campo en el panel del diseñador de PDF (misión diseno-pdf-configurable,
 * 1/10/2026). El nombre, el rótulo, el ejemplo y el estilo por defecto salen del catálogo
 * (`disenador.definiciones`); los límites (tamaños, largos, alineaciones), de `disenador.limites`.
 */
export default {
	name: 'PanelDeCampo',
	inject: ['disenador'],
	props: {
		/* Campo de trabajo seleccionado (se muta en el lugar) */
		campo: {
			type: Object,
			required: true,
		},
		/* La caja donde está (para avisar un texto libre largo para su ancho), o null */
		caja: {
			type: Object,
			default: null,
		},
	},
	computed: {
		/**
		 * Si el campo está en un ticket de comandera.
		 *
		 * @returns {boolean}
		 */
		es_ticket() {
			return this.disenador.es_ticket
		},
		/**
		 * Si es el logo del negocio (tipo `imagen`, solo en el ticket): sin rótulo ni letra.
		 *
		 * @returns {boolean}
		 */
		es_logo() {
			return !!(this.definicion && this.definicion.tipo === TIPO_IMAGEN)
		},
		/**
		 * Los tres tamaños de la comandera (`tamanos_de_ticket` del catálogo, o los de siempre).
		 *
		 * @returns {Array<{tamano: number, nombre: string}>}
		 */
		tamanos_de_la_comandera() {
			return tamanos_de_ticket(this.disenador.catalogo)
		},
		/**
		 * Qué hace el tamaño elegido en la comandera.
		 *
		 * @returns {string}
		 */
		ayuda_del_tamano() {
			let clase = clase_de_tamano(this.estilo.tamano)
			if (clase === GRANDE) {
				return 'Grande: el doble de alto y de ancho. Cada letra ocupa dos lugares, así que por renglón entran la mitad.'
			}
			if (clase === ALTO) {
				return 'Alto doble: el doble de alto, el mismo ancho. Entran los mismos caracteres por renglón.'
			}
			return 'Normal: la letra de siempre de la comandera.'
		},
		/**
		 * Columnas de la caja donde está el campo.
		 *
		 * @returns {number}
		 */
		cols_de_la_caja() {
			return this.caja ? this.caja.cols : 12
		},
		/**
		 * Si el texto libre es largo para el ancho de su caja (aviso suave, no bloquea).
		 *
		 * @returns {boolean}
		 */
		texto_largo() {
			/* En un ticket no aplica: el rollo es continuo, un texto largo solo ocupa más renglones */
			if (this.es_ticket) {
				return false
			}
			return texto_libre_largo(this.campo, this.cols_de_la_caja)
		},
		/**
		 * El aviso del texto largo, con las columnas de su caja.
		 *
		 * @returns {string}
		 */
		aviso_de_texto_largo() {
			return aviso_de_texto_largo(this.cols_de_la_caja)
		},
		/**
		 * Definición del campo en el catálogo (null si la key ya no existe).
		 *
		 * @returns {Object|null}
		 */
		definicion() {
			return this.disenador.definiciones[this.campo.key] || null
		},
		/**
		 * Si el campo es el texto libre.
		 *
		 * @returns {boolean}
		 */
		es_texto_libre() {
			return this.campo.key === KEY_TEXTO_LIBRE
		},
		/**
		 * Si el campo ya no está en el catálogo (se retiró): solo se puede sacar.
		 *
		 * @returns {boolean}
		 */
		campo_perdido() {
			return !this.definicion
		},
		/**
		 * Cuándo sale el campo en el PDF, si no sale siempre.
		 *
		 * @returns {string|null}
		 */
		aparece_cuando() {
			return this.definicion ? this.definicion.aparece_cuando : null
		},
		/**
		 * El rótulo del catálogo ('' si el campo no lleva: descuentos, recargos, texto libre...).
		 *
		 * @returns {string}
		 */
		rotulo_del_catalogo() {
			return this.definicion && typeof this.definicion.etiqueta == 'string' ? this.definicion.etiqueta : ''
		},
		/**
		 * Lo que muestra el input del rótulo: el propio del campo (vacío si usa el del catálogo o si
		 * va sin rótulo).
		 *
		 * @returns {string}
		 */
		valor_del_rotulo() {
			return this.campo.etiqueta ? this.campo.etiqueta : ''
		},
		/**
		 * Placeholder del rótulo: el del catálogo, que es lo que se imprime si el input queda vacío.
		 *
		 * @returns {string}
		 */
		placeholder_del_rotulo() {
			if (this.campo.etiqueta === '') {
				return 'Sin rótulo'
			}
			if (this.rotulo_del_catalogo) {
				return this.rotulo_del_catalogo
			}
			/* Sin rótulo de catálogo: el texto libre, o un renglón que ya dice lo que es (descuentos...) */
			return this.es_texto_libre ? 'Sin rótulo (podés ponerle uno)' : 'Sin rótulo: el renglón ya dice lo que es'
		},
		/**
		 * Estilo efectivo del campo.
		 *
		 * @returns {Object}
		 */
		estilo() {
			return estilo_efectivo(this.campo, this.definicion)
		},
		/**
		 * Si el campo tiene algún estilo propio (habilita "Volver al estilo del campo").
		 *
		 * @returns {boolean}
		 */
		con_estilo_propio() {
			return tiene_estilo_propio(this.campo)
		},
		/**
		 * Largo del texto libre, en caracteres.
		 *
		 * @returns {number}
		 */
		largo_del_texto() {
			return Array.from(String(this.campo.texto || '')).length
		},
	},
	methods: {
		/**
		 * Si una opción de tamaño de la comandera es la del campo (por clase: un 13 es "Alto doble").
		 *
		 * @param {{tamano: number}} opcion
		 * @returns {boolean}
		 */
		es_el_tamano(opcion) {
			return clase_de_tamano(this.estilo.tamano) === clase_de_tamano(opcion.tamano)
		},
		/**
		 * Nombre de una alineación.
		 *
		 * @param {string} alineacion
		 * @returns {string}
		 */
		nombre_de_la_alineacion(alineacion) {
			return nombre_de_la_alineacion(alineacion)
		},
		/**
		 * Ícono de una alineación.
		 *
		 * @param {string} alineacion
		 * @returns {string}
		 */
		icono_de_la_alineacion(alineacion) {
			return icono_de_la_alineacion(alineacion)
		},
		/**
		 * Cambia el tamaño de letra un punto, desde el efectivo y dentro de los límites del
		 * catálogo. Deja un valor propio (ya no sigue al del catálogo).
		 *
		 * @param {number} paso -1 o 1
		 * @returns {void}
		 */
		cambiar_tamano(paso) {
			let limites = this.disenador.limites
			let actual = this.estilo.tamano || limites.tamano_min
			this.campo.tamano = acotar_entero(actual + paso, limites.tamano_min, limites.tamano_max, actual)
		},
		/**
		 * El rótulo que se escribe. Vacío vuelve al del catálogo (null), no a "sin rótulo": para eso
		 * está la casilla.
		 *
		 * @param {string} valor
		 * @returns {void}
		 */
		cambiar_rotulo(valor) {
			this.campo.etiqueta = valor === '' ? null : valor
		},
		/**
		 * La casilla "Sin rótulo": prendida guarda '' (solo el valor); apagada vuelve al rótulo del
		 * catálogo (null).
		 *
		 * @param {boolean} sin_rotulo
		 * @returns {void}
		 */
		cambiar_sin_rotulo(sin_rotulo) {
			this.campo.etiqueta = sin_rotulo ? '' : null
		},
	},
}
</script>
