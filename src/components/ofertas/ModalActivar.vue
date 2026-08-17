<template>
	<b-modal
	id="oferta-modal-activar"
	title="Activar la oferta"
	size="lg"
	hide-footer
	@show="cargar_desde_la_linea">

		<template v-if="linea">

			<p class="ofertas-activar__encabezado m-b-15">
				<strong>{{ linea.client_nombre }}</strong>
				·
				{{ linea.name }}
			</p>

			<template v-if="!resultado">

				<b-form-group label="Tipo de descuento">
					<b-form-select
					v-model="tipo_descuento"
					:options="opciones_tipo"></b-form-select>
				</b-form-group>

				<!--
					El techo va SIEMPRE a la vista, al lado del numero que se edita: es
					el maximo que no vende bajo costo, sale del margen del articulo y lo
					calculo el backend. Si igual se tipea de mas, el boton se apaga aca
					y ademas el backend rechaza con el techo de HOY (entre la sugerencia
					y la activacion pudo cambiar el costo).
				-->
				<b-form-group
				v-if="tipo_descuento == 'unidad'"
				label="Descuento"
				:description="'Techo: ' + techo + '% — mas que eso rompe el margen del articulo.'">
					<b-input-group append="%">
						<b-form-input
						type="number"
						min="1"
						:max="techo"
						v-model.number="porcentaje"></b-form-input>
					</b-input-group>
				</b-form-group>

				<b-form-group
				v-else
				:label="'Tramos por cantidad (techo: ' + techo + '%)'"
				description="El ultimo tramo va sin 'hasta': vale de esa cantidad en adelante.">
					<div
					v-for="(tramo, index) in tramos"
					:key="index"
					class="ofertas-activar__tramo j-start align-center m-b-5">
						<b-form-input
						class="m-r-5"
						type="number"
						placeholder="Desde"
						v-model.number="tramo.min"></b-form-input>
						<b-form-input
						class="m-r-5"
						type="number"
						placeholder="Hasta (vacio: sin tope)"
						v-model.number="tramo.max"></b-form-input>
						<b-form-input
						class="m-r-5"
						type="number"
						:max="techo"
						placeholder="% de descuento"
						v-model.number="tramo.porcentaje"></b-form-input>
						<b-button
						variant="outline-danger"
						title="Quitar el tramo"
						@click="quitar_tramo(index)">
							<i class="bi bi-x"></i>
						</b-button>
					</div>
					<b-button
					size="sm"
					variant="outline-secondary"
					@click="agregar_tramo">
						<i class="bi bi-plus-lg m-r-5"></i>
						Agregar tramo
					</b-button>
				</b-form-group>

				<!-- Editable a proposito: la fecha del motor es una sugerencia -->
				<b-form-group
				label="La oferta vence el"
				description="Se puede cambiar. Desde hoy y hasta 180 dias adelante.">
					<b-form-datepicker
					v-model="hasta"
					:min="hoy"></b-form-datepicker>
				</b-form-group>

				<div
				v-if="error_form"
				class="text-muted small m-t-10">
					{{ error_form }}
				</div>

				<div class="j-end m-t-15">
					<b-button
					class="m-r-10"
					variant="outline-secondary"
					:disabled="loading"
					@click="cerrar">
						Cancelar
					</b-button>
					<b-button
					variant="primary"
					:disabled="loading || !!error_form"
					@click="activar">
						<b-spinner
						v-if="loading"
						small
						class="m-r-5"></b-spinner>
						Activar la oferta
					</b-button>
				</div>

			</template>

			<!-- Ya activada: que paso con el aviso al cliente -->
			<div v-else>
				<b-alert
				show
				variant="success">
					La oferta ya esta activa: la tienda se la va a mostrar a este cliente
					hasta el {{ date(resultado.hasta) }}.
				</b-alert>
				<p
				v-if="resultado.notificada_email_at"
				class="m-b-5">
					<i class="bi bi-envelope-check text-success m-r-5"></i>
					Le avisamos por mail a {{ resultado.email_destino }}.
				</p>
				<p
				v-else
				class="text-muted m-b-5">
					<i class="bi bi-envelope-x m-r-5"></i>
					No se le pudo avisar por mail (no hay direccion valida cargada). La
					oferta esta activa igual.
				</p>
				<!--
					🔴 LA RAMA DEL LINK EXTERNO NO ES CÓDIGO MUERTO. No la borres.
					WhatsApp es una extensión que se contrata aparte, y `SidebarHost.vue` NO MONTA el
					sidebar sin ella: sin esta rama, el comercio que no la tiene se queda con un botón
					que no hace absolutamente nada. Es el mismo criterio, y por el mismo motivo, que la
					rama wa.me de `mixins/model_functions.js` (`sendWhatsApp`), que está marcada allá con
					estas mismas palabras.

					🔴 Y OJO: EL REPLIEGUE AL LINK EXTERNO TIENE DOS CONDICIONES, NO UNA. Acá se ve
					solo la primera (no tiene la extensión), porque es la única que se puede saber
					antes de apretar. La segunda —la ventana de 24 h de Meta cerrada, que es el estado
					de TODO chat nuevo— recién se sabe con el chat en la mano, así que la resuelve
					`whatsapp_chat/abrirChatOLinkExterno` en el click y termina abriendo esta misma
					URL. Por eso el botón de arriba no garantiza sidebar: garantiza que el aviso sale.
				-->
				<b-button
				v-if="resultado.whatsapp_url && puede_abrir_el_agente(resultado)"
				variant="success"
				:disabled="avisando"
				@click="avisar_por_el_agente(resultado)">
					<b-spinner
					v-if="avisando"
					small
					class="m-r-5"></b-spinner>
					<i
					v-else
					class="bi bi-whatsapp m-r-5"></i>
					Avisarle por WhatsApp
				</b-button>
				<a
				v-else-if="resultado.whatsapp_url"
				class="btn btn-success"
				target="_blank"
				rel="noopener"
				:href="resultado.whatsapp_url">
					<i class="bi bi-whatsapp m-r-5"></i>
					Avisarle por WhatsApp
				</a>
				<p
				v-else
				class="text-muted small m-b-0">
					Sin telefono usable para armar el link de WhatsApp.
				</p>
			</div>

		</template>

	</b-modal>
</template>
<script>
import moment from 'moment'
import { telefono_de_chat_de_oferta, mensaje_de_oferta } from '@/utils/whatsapp_phone'
/*
	La pantalla clave del modulo: activar una oferta sugerida. Muestra el techo
	al lado del porcentaje, deja elegir descuento por unidad o por cantidad,
	editar los tramos y cambiar la fecha de vencimiento antes de confirmar. Al
	confirmar pega POST client-offer y con la respuesta muestra si el mail salio
	y el link de WhatsApp.
*/
export default {
	props: {
		// La linea sugerida que se esta por activar. Null con el modal cerrado.
		linea: {
			type: Object,
			default: null,
		},
	},
	data() {
		return {
			tipo_descuento: 'unidad',
			porcentaje: 0,
			hasta: '',
			tramos: [],
			loading: false,
			// La oferta creada, para mostrar el aviso al cliente sin cerrar el modal.
			resultado: null,
			// true mientras el aviso por WhatsApp está resolviendo por dónde sale. Apaga el
			// botón: el camino tiene un POST de por medio y dos clicks abrirían dos pestañas.
			avisando: false,
		}
	},
	computed: {
		techo() {
			return this.linea ? Number(this.linea.porcentaje_techo) : 0
		},
		hoy() {
			return moment().format('YYYY-MM-DD')
		},
		opciones_tipo() {
			return [
				{value: 'unidad', text: 'Un solo descuento, compre lo que compre'},
				{value: 'cantidad', text: 'Mas descuento cuanto mas lleve'},
			]
		},
		/**
		 * Primer problema del formulario, o '' si esta listo. El boton se apaga con
		 * esto: mejor frenarlo aca que mandar algo que ya sabemos que se rechaza.
		 */
		error_form() {
			if (!this.hasta) {
				return 'Elegi hasta cuando vale la oferta.'
			}
			if (this.tipo_descuento == 'cantidad') {
				return this.error_de_tramos()
			}
			if (!this.porcentaje_valido(this.porcentaje)) {
				return 'El descuento tiene que estar entre 1% y el techo de ' + this.techo + '%.'
			}
			return ''
		},
	},
	methods: {
		/**
		 * Arranca el formulario con lo que propuso el motor.
		 */
		cargar_desde_la_linea() {
			this.resultado = null
			this.avisando = false
			if (!this.linea) {
				return
			}
			this.tipo_descuento = this.linea.tipo_descuento || 'unidad'
			this.porcentaje = Number(this.linea.porcentaje_sugerido)
			this.hasta = this.linea.fecha_vencimiento_sugerida || ''
			this.tramos = this.parsear_tramos(this.linea.tramos_sugeridos)
		},
		// Los tramos pueden llegar como JSON string o ya parseados, segun como los
		// castee el modelo del backend: se aceptan las dos formas.
		parsear_tramos(valor) {
			let crudos = valor
			if (typeof crudos == 'string' && crudos) {
				try {
					crudos = JSON.parse(crudos)
				} catch (e) {
					crudos = []
				}
			}
			if (!Array.isArray(crudos)) {
				return []
			}
			return crudos.map(tramo => {
				// max null es "sin tope"; en el input eso es el campo vacio.
				return {
					min: Number(tramo.min),
					max: tramo.max ? Number(tramo.max) : '',
					porcentaje: Number(tramo.porcentaje),
				}
			})
		},
		porcentaje_valido(valor) {
			return !isNaN(Number(valor)) && Number(valor) >= 1 && Number(valor) <= this.techo
		},
		/**
		 * Mismas reglas que valida ClientOfferController::validar_tramos(): el primero
		 * arranca en 1 EXACTO, cada uno empieza donde termino el anterior, el ultimo va
		 * sin tope, y ninguno pasa el techo.
		 *
		 * Ojo con lo que decia este comentario hasta el 15/8/2026 ("mismas reglas que el
		 * backend") sin serlo: pedia min >= 1 en vez de min == 1, y salteaba el chequeo de
		 * contigüidad cada vez que el tope anterior quedaba vacio. Con eso el boton se
		 * habilitaba sobre tramos que el backend despues rechazaba con 422, o sea que la
		 * validacion del front no le ahorraba el viaje a nadie y encima daba a entender que
		 * estaba todo bien. Cuando las dos no coinciden, la que manda es la del backend:
		 * es la que decide si la fila se escribe.
		 *
		 * Se lleva un `esperado_min` en vez de un `tope_anterior` que puede ser null, que
		 * es lo mismo que hace el backend y lo que cierra el agujero: sin tope anterior no
		 * hay con que comparar y el tramo pasaba sin control.
		 */
		error_de_tramos() {
			if (!this.tramos.length) {
				return 'Agrega al menos un tramo de cantidad.'
			}
			let error = ''
			let esperado_min = 1
			this.tramos.forEach((tramo, index) => {
				let ultimo = index == this.tramos.length - 1
				let max = tramo.max === '' || tramo.max === null || tramo.max === undefined
					? null
					: Number(tramo.max)
				if (!error && Number(tramo.min) != esperado_min) {
					// Cubre las dos fallas de una, igual que el backend: el primero que no
					// arranca en 1, y el hueco o el solapamiento entre dos consecutivos.
					error = 'Los tramos tienen que arrancar en 1 unidad y ser seguidos: el tramo '
						+ (index + 1) + ' tiene que empezar en ' + esperado_min + '.'
				} else if (!error && !this.porcentaje_valido(tramo.porcentaje)) {
					error = 'Cada tramo necesita un descuento entre 1% y el techo de ' + this.techo + '%.'
				} else if (!error && ultimo && max !== null) {
					error = 'El ultimo tramo va sin "hasta": vale de esa cantidad en adelante.'
				} else if (!error && !ultimo && (max === null || max < Number(tramo.min))) {
					error = 'Los tramos del medio necesitan un "hasta" mayor o igual que el "desde".'
				}
				esperado_min = max === null ? esperado_min : max + 1
			})
			return error
		},
		agregar_tramo() {
			// El tramo nuevo se lleva el "sin tope" y le cierra el anterior: asi la
			// lista queda valida sola y no hay que corregir a mano el de arriba.
			let ultimo = this.tramos.length ? this.tramos[this.tramos.length - 1] : null
			if (ultimo && !ultimo.max) {
				ultimo.max = Number(ultimo.min) + 4
			}
			this.tramos.push({
				min: ultimo ? Number(ultimo.max) + 1 : 1,
				max: '',
				porcentaje: this.techo,
			})
		},
		quitar_tramo(index) {
			this.tramos.splice(index, 1)
			// El que quede ultimo tiene que quedar sin tope, si no la lista es invalida.
			if (this.tramos.length) {
				this.tramos[this.tramos.length - 1].max = ''
			}
		},
		cerrar() {
			this.$bvModal.hide('oferta-modal-activar')
		},
		/**
		 * true cuando el aviso PUEDE llegar a salir por el agente. No promete que salga por
		 * ahi: promete que vale la pena preguntarlo.
		 *
		 * El gate es `hasExtencion('whatsapp')` y no otra cosa: es el mismo criterio que ya usan
		 * `BtnWhatsappChat`, `model_functions.sendWhatsApp` y `SidebarHost`, y sin esa extensión
		 * el sidebar NI SIQUIERA SE MONTA EN EL DOM, así que abrirlo seria un click muerto.
		 *
		 * 🔴 La otra mitad de la decision —la ventana de 24 h de Meta— NO se puede contestar
		 * aca: depende del `last_inbound_at` del chat, y el chat todavia no existe. La resuelve
		 * `whatsapp_chat/abrirChatOLinkExterno` despues del click, con el modelo en la mano.
		 */
		puede_abrir_el_agente(oferta) {
			return !!this.hasExtencion('whatsapp') && !!telefono_de_chat_de_oferta(oferta)
		},
		/**
		 * Manda el aviso de la oferta por donde de verdad pueda salir: el sidebar del agente si
		 * la ventana de 24 h esta abierta, y si no la pestaña de api.whatsapp.com de siempre.
		 * Quien decide es la accion del store; aca esta el click, que es lo unico que no se
		 * puede mudar.
		 *
		 * 🔴 LA PESTAÑA SE PIDE ACA, SINCRONICAMENTE, Y ESTA LINEA NO SE PUEDE MOVER ADENTRO DEL
		 * `.then()`. El navegador solo deja abrir una pestaña mientras esta atendiendo el gesto
		 * del operador; una vez que la promesa del POST vuelve, ese permiso ya se perdio y el
		 * bloqueador de pop-ups se come la pestaña sin decir nada. Por eso se abre en blanco
		 * antes de saber si hace falta, y la accion la navega o la cierra segun como termine
		 * (ver `navegar_pestana()` en `store/whatsapp_chat.js`).
		 *
		 * El modal se cierra SOLO en la rama del sidebar: en telefono el sidebar ocupa toda la
		 * pantalla y quedaria discutiendo el z-index con el modal, y ademas el operador se esta
		 * yendo a la conversacion. En la rama del link externo el operador se va a otra pestaña
		 * y vuelve, asi que el modal se queda como estaba —igual que antes de esta mision.
		 */
		avisar_por_el_agente(oferta) {
			let self = this
			let pestana = window.open('', '_blank')
			this.avisando = true
			this.$store.dispatch('whatsapp_chat/abrirChatOLinkExterno', {
				phone: telefono_de_chat_de_oferta(oferta),
				client_id: oferta.client_id,
				display_name: oferta.client && oferta.client.name ? oferta.client.name : '',
				borrador: mensaje_de_oferta(oferta.whatsapp_url),
				url_externa: oferta.whatsapp_url,
				pestana: pestana,
			})
			.then(function(resultado) {
				self.avisando = false
				if (resultado.por_el_agente) {
					self.$bvModal.hide('oferta-modal-activar')
					return
				}
				if (resultado.link_bloqueado) {
					// Un aviso que no salio no puede terminar en silencio: es exactamente el
					// modo de falla que este boton vino a arreglar.
					self.$bvToast.toast('El navegador bloqueo la pestaña de WhatsApp. Permiti las ventanas emergentes de este sitio y volve a intentarlo.', {
						title: 'No se pudo abrir WhatsApp',
						variant: 'warning',
						solid: true,
					})
				}
			})
		},
		/**
		 * Crea la oferta. El backend re-valida el techo con los datos de HOY y
		 * devuelve 422 con el techo actual si el porcentaje se pasa: ese mensaje se
		 * muestra tal cual, sin recortar nada en silencio (el comerciante tiene que
		 * enterarse de que cambio el margen del articulo).
		 */
		activar() {
			if (this.error_form) {
				return
			}
			let self = this
			let es_por_cantidad = this.tipo_descuento == 'cantidad'
			this.loading = true
			this.$api.post('client-offer', {
				offer_suggestion_line_id: this.linea.offer_suggestion_line_id,
				// Con tramos el porcentaje de cabecera va null a proposito: el numero
				// que vale esta en cada tramo y un porcentaje suelto se leeria mal.
				porcentaje: es_por_cantidad ? null : this.porcentaje,
				hasta: this.hasta,
				tipo_descuento: this.tipo_descuento,
				tramos: es_por_cantidad ? this.tramos.map(tramo => {
					return {
						min: Number(tramo.min),
						// El campo vacio viaja como null: es "sin tope", no un 0.
						max: tramo.max ? Number(tramo.max) : null,
						porcentaje: Number(tramo.porcentaje),
					}
				}) : [],
			})
			.then(function(res) {
				self.loading = false
				self.resultado = res.data.model
				self.$emit('activada')
			})
			.catch(function(err) {
				console.log(err)
				self.loading = false
				let mensaje = err.response && err.response.data && err.response.data.message
					? err.response.data.message
					: 'No se pudo activar la oferta.'
				self.$bvToast.toast(mensaje, {
					title: 'Error',
					variant: 'danger',
					solid: true,
				})
			})
		},
	}
}
</script>
<style lang="sass">
.ofertas-activar
	&__encabezado
		font-size: 1.05rem
.ofertas-activar__tramo
	// En telefono los tres inputs y el boton no entran en una linea: que
	// envuelvan en vez de espicharse hasta quedar inusables. En escritorio y
	// tablet entran, asi que el wrap no cambia nada.
	flex-wrap: wrap
	row-gap: 5px
</style>
