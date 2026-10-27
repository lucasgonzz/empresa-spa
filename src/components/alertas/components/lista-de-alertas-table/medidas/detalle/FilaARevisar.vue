<template>
<li
class="med-fila med-fila--revisar"
:class="{ 'med-fila--seleccionada': seleccionado, 'med-fila--procesando': procesando }"
:data-testid="'medidas-item-' + item.id"
:data-status="item.status"
:data-motivo="item.motivo">

	<b-form-checkbox
	class="med-fila__tilde"
	:data-testid="'medidas-tilde-' + item.id"
	:checked="seleccionado"
	:disabled="procesando"
	:aria-label="'Seleccionar ' + nombre"
	@change="$emit('seleccionar', $event)"></b-form-checkbox>

	<div class="med-fila__cuerpo">

		<div class="med-fila__linea">
			<span class="med-fila__nombre">{{ nombre }}</span>
			<span
			class="med-fila__consultas"
			:data-consultas="item.busquedas">
				{{ consultas }}
			</span>
		</div>

		<div class="med-fila__meta">
			<span
			v-if="item.article_bar_code"
			class="med-fila__codigo"
			title="Código de barras"
			:data-testid="'medidas-codigo-barras-' + item.id">
				<span class="med-fila__rotulo">Cód. barras</span>
				{{ item.article_bar_code }}
			</span>
			<span
			v-if="item.article_provider_code"
			class="med-fila__codigo"
			title="Código de proveedor"
			:data-testid="'medidas-codigo-proveedor-' + item.id">
				<span class="med-fila__rotulo">Cód. proveedor</span>
				{{ item.article_provider_code }}
			</span>
			<span v-if="criterio">{{ criterio }}</span>
		</div>

		<!-- Por qué quedó para revisar: el motivo como etiqueta, y la frase que lo explica. -->
		<div
		v-if="motivo"
		class="med-fila__avisos">
			<span
			class="med-etiqueta"
			:class="'med-etiqueta--' + tono_del_motivo"
			:data-testid="'medidas-motivo-' + item.id">
				{{ motivo }}
			</span>
		</div>
		<p
		v-if="item.motivo_detalle"
		class="med-fila__detalle">
			{{ item.motivo_detalle }}
		</p>

		<!--
			Lo que dijo la IA de la diferencia entre este producto y la página (la versión con espada de
			35 cm, el pack por 6...): es lo que decide si se aprueba o no.
		-->
		<p
		v-if="item.nota_ia"
		class="med-fila__detalle med-fila__detalle--ia"
		:data-testid="'medidas-nota-ia-' + item.id">
			<i
			class="bi bi-info-circle"
			aria-hidden="true"></i>
			{{ item.nota_ia }}
		</p>

		<chips-de-medidas
		:campos="item.campos"
		:item_id="item.id"></chips-de-medidas>

		<fuente-de-medidas
		:fuentes="item.fuentes"
		:campos="item.campos"
		:item_id="item.id"></fuente-de-medidas>

		<!--
			Editar los cuatro valores en el lugar. Los números son los de la base (kg y cm), y los que
			se dejan vacíos no se tocan en el artículo. «Guardar y aprobar» manda `valores` con lo
			escrito; no hay otra forma de aprobar un valor distinto del que propuso el sistema.
		-->
		<form
		v-if="editando"
		class="med-edicion"
		:data-testid="'medidas-edicion-' + item.id"
		novalidate
		@submit.prevent="guardar_y_aprobar">
			<div class="med-edicion__campos">
				<label
				v-for="campo in definiciones"
				:key="campo.clave"
				class="med-edicion__campo">
					<span class="med-edicion__rotulo">{{ campo.etiqueta }} ({{ campo.unidad }})</span>
					<b-form-input
					v-model="entradas[campo.clave]"
					type="text"
					inputmode="decimal"
					autocomplete="off"
					placeholder="Sin valor"
					:state="errores[campo.clave] ? false : null"
					:data-testid="'medidas-campo-' + item.id + '-' + campo.clave"
					:disabled="procesando"
					@input="limpiar_error(campo.clave)"></b-form-input>
					<span
					v-if="errores[campo.clave]"
					class="med-edicion__error"
					:data-testid="'medidas-campo-error-' + item.id + '-' + campo.clave">
						{{ errores[campo.clave] }}
					</span>
				</label>
			</div>
			<p
			v-if="error_general"
			class="med-edicion__error"
			:data-testid="'medidas-edicion-error-' + item.id">
				{{ error_general }}
			</p>
			<div class="med-edicion__acciones">
				<b-button
				class="btn-modulo btn-modulo--fila"
				variant="outline-secondary"
				:data-testid="'medidas-cancelar-' + item.id"
				:disabled="procesando"
				@click="cerrar_edicion">
					Cancelar
				</b-button>
				<b-button
				class="btn-modulo btn-modulo--fila"
				variant="success"
				type="submit"
				:data-testid="'medidas-guardar-aprobar-' + item.id"
				:disabled="procesando">
					Guardar y aprobar
				</b-button>
			</div>
		</form>

	</div>

	<!--
		Rechazar a la izquierda y aprobar a la derecha, como en cualquier diálogo: la acción que
		avanza queda donde termina la lectura. Aprobar es la única en color lleno.

		`data-ayuda-placement="left"`: los tres quedan pegados al borde derecho del modal, que es
		scrollable y recorta lo que sale de su caja; su ayuda se abre a la izquierda para verse entera.
	-->
	<div class="med-fila__acciones">
		<b-button
		class="btn-modulo btn-modulo--fila"
		variant="outline-secondary"
		data-ayuda-placement="left"
		:data-testid="'medidas-rechazar-' + item.id"
		:disabled="procesando"
		@click="$emit('rechazar')">
			Rechazar
		</b-button>
		<b-button
		v-if="!editando"
		class="btn-modulo btn-modulo--fila"
		variant="outline-primary"
		data-ayuda-placement="left"
		:data-testid="'medidas-editar-' + item.id"
		:disabled="procesando"
		@click="abrir_edicion">
			Editar
		</b-button>
		<b-button
		class="btn-modulo btn-modulo--fila"
		variant="success"
		data-ayuda-placement="left"
		:data-testid="'medidas-aprobar-' + item.id"
		:disabled="procesando || editando || !hay_algo_para_aprobar"
		:title="hay_algo_para_aprobar ? null : 'No hay ninguna medida para aprobar: usá Editar para cargar alguna'"
		@click="$emit('aprobar', null)">
			Aprobar
		</b-button>
	</div>

</li>
</template>
<script>
// Sincrónicos a propósito: son chicos y se dibujan en cada fila. Con un import perezoso, cada fila
// nueva parpadearía vacía hasta que llegara el componente.
import ChipsDeMedidas from '@/components/alertas/components/lista-de-alertas-table/medidas/detalle/ChipsDeMedidas'
import FuenteDeMedidas from '@/components/alertas/components/lista-de-alertas-table/medidas/detalle/FuenteDeMedidas'
import { CAMPOS_DE_MEDIDA, texto_para_input, validar_valores_editados } from '@/utils/medidas_de_catalogo'
import { CRITERIOS, MOTIVOS, MOTIVOS_DE_AVISO, texto_de, consultas_del_articulo } from '@/components/alertas/components/lista-de-alertas-table/medidas/textos'

/**
 * Un artículo con medidas por revisar: nombre y códigos, el motivo por el que no se cargaron solas
 * (variante dudosa, medidas parciales, coincidencia por nombre...), lo que dijo la IA, los cuatro
 * chips con lo propuesto (los que faltan marcados), la fuente y la cita, y tres acciones:
 * Rechazar, Editar y Aprobar.
 *
 * «Editar» abre en el lugar los cuatro valores. «Guardar y aprobar» valida (números mayores que cero,
 * dentro del tope de cordura) y emite `aprobar` con `{peso, alto, ancho, profundidad}` solo con los
 * campos escritos; la API vuelve a validar y escribe solo los que el artículo tiene vacíos (D5).
 *
 * Eventos: `seleccionar(Boolean)`, `aprobar(valores|null)`, `rechazar`.
 */
export default {
	components: {
		ChipsDeMedidas,
		FuenteDeMedidas,
	},
	props: {
		/** ItemPayload normalizado (contrato §2.6). */
		item: {
			type: Object,
			required: true,
		},
		/** true si la fila está tildada para el lote. */
		seleccionado: {
			type: Boolean,
			default: false,
		},
		/** true mientras viaja una acción sobre esta fila: sus botones se apagan. */
		procesando: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			/** true con los cuatro inputs de edición abiertos. */
			editando: false,
			/** Texto de cada input, por clave: {peso: '0,82', alto: '', ...}. */
			entradas: { peso: '', alto: '', ancho: '', profundidad: '' },
			/** Mensaje de cada campo mal escrito, por clave. */
			errores: {},
			/** Mensaje que no es de un campo (por ejemplo, que no se escribió ninguno). */
			error_general: '',
			/** Los cuatro campos con su etiqueta y unidad, para armar los inputs. */
			definiciones: CAMPOS_DE_MEDIDA,
		}
	},
	computed: {
		nombre() {
			return this.item.article_name || ('Artículo N° ' + this.item.article_id)
		},
		/** "Por código de barras" / "Por nombre". */
		criterio() {
			let texto = texto_de(CRITERIOS, this.item.criterio_usado)
			return texto ? 'Por ' + texto.charAt(0).toLowerCase() + texto.slice(1) : ''
		},
		consultas() {
			return consultas_del_articulo(this.item.busquedas)
		},
		motivo() {
			return texto_de(MOTIVOS, this.item.motivo)
		},
		tono_del_motivo() {
			return MOTIVOS_DE_AVISO.indexOf(this.item.motivo) !== -1 ? 'aviso' : 'neutro'
		},
		/**
		 * Aprobar tal cual solo tiene sentido si la propuesta trae al menos una medida; si no, hay que
		 * cargar alguna con Editar.
		 *
		 * @returns {Boolean}
		 */
		hay_algo_para_aprobar() {
			return this.item.cantidad_con_valor > 0
		},
	},
	watch: {
		/**
		 * Si la lista se vuelve a pedir y esta fila trae otra propuesta, la edición abierta se cierra:
		 * lo escrito era sobre los valores de antes.
		 */
		'item.id'() {
			this.cerrar_edicion()
		},
	},
	methods: {
		/** Abre la edición con los valores propuestos ya escritos (los que faltan, vacíos). */
		abrir_edicion() {
			let entradas = {}
			let propuesta = this.item.propuesta || {}
			CAMPOS_DE_MEDIDA.forEach(function (campo) {
				entradas[campo.clave] = texto_para_input(propuesta[campo.clave])
			})
			this.entradas = entradas
			this.errores = {}
			this.error_general = ''
			this.editando = true
		},
		/** Cierra la edición sin guardar: la propuesta queda como estaba. */
		cerrar_edicion() {
			this.editando = false
			this.errores = {}
			this.error_general = ''
		},
		/**
		 * Borra el error de un campo apenas se vuelve a escribir en él.
		 *
		 * @param {String} clave
		 */
		limpiar_error(clave) {
			if (this.errores[clave]) {
				let errores = Object.assign({}, this.errores)
				delete errores[clave]
				this.errores = errores
			}
			this.error_general = ''
		},
		/**
		 * «Guardar y aprobar»: valida lo escrito y, si está bien, pide aprobar con esos valores. Con
		 * algún campo mal escrito, o con los cuatro vacíos, no sale nada y se dice qué corregir.
		 */
		guardar_y_aprobar() {
			if (this.procesando) {
				return
			}
			let resultado = validar_valores_editados(this.entradas)
			this.errores = resultado.errores
			this.error_general = ''
			if (resultado.hay_errores) {
				return
			}
			if (resultado.cantidad === 0) {
				this.error_general = 'Escribí al menos una medida para aprobar.'
				return
			}
			this.$emit('aprobar', resultado.valores)
		},
	},
}
</script>
