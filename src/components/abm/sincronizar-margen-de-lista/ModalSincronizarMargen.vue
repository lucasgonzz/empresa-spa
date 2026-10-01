<template>
<!--
	Mision sincronizar-margen-lista-precios (1/10/2026): la ventana que pregunta a QUE articulos de
	la lista se les aplica el margen por defecto. La abre el boton de Index.vue (en esta misma
	carpeta), que ya valido que la lista este guardada y que el margen no este vacio.

	Las dos cosas que esta ventana tiene que dejar claras, porque son las que se prestan a confusion:

	1. "Coinciden" se mide contra el margen GUARDADO (el que devuelve el preview como
	`porcentaje_actual`), no contra el que el usuario acaba de tipear. Si cambio 30 -> 35 sin
	guardar, los que "coinciden" son los que hoy tienen 30.
	2. Confirmar GUARDA LA LISTA. No hay un PUT aparte para sincronizar: la ventana le pide al
	formulario de la lista que se vuelva a guardar (hook `price_type:save-retry` de
	common-vue/components/model/Index.vue) con la clave `sincronizar_margen` en el payload. El
	guardado y la sincronizacion viajan en el MISMO request, asi que la API guarda primero el
	margen nuevo y recien despues actualiza los articulos. Las validaciones, el toast
	"Actualizado", el cierre del formulario y el aviso de cuantos articulos se actualizaron (las
	`notifications` de la respuesta, que muestra src/main.js) los pone ese flujo, no esta ventana.

	🔴 Esta ventana es un b-modal ABIERTO ENCIMA de otro b-modal (el formulario de la lista). Por eso
	tiene un id propio que no se repite en ningun lado, y por eso el pedido de guardado se dispara
	recien en el `@hidden` de esta ventana: primero termina de cerrarse esta, y despues el
	formulario se guarda y se cierra solo. Cerrar esta ventana con Cancelar, con la cruz o con ESC
	no toca el formulario.
-->
<b-modal
title="Sincronizar el margen de los articulos"
hide-footer
size="lg"
:id="id_modal_sincronizar_margen"
@hidden="al_cerrar_modal_sincronizar_margen">

	<div v-if="cargando_preview_margen">
		<b-skeleton width="100%" height="20px" class="m-b-10"></b-skeleton>
		<b-skeleton width="80%" height="20px" class="m-b-10"></b-skeleton>
		<b-skeleton width="60%" height="20px"></b-skeleton>
	</div>

	<!--
		La lista no tiene ningun articulo: no hay sobre que sincronizar. Se dice adentro de la
		ventana y no callandose, porque el usuario apreto un boton a proposito.
	-->
	<div
	v-else-if="!total_articulos_de_la_lista"
	class="text-center">
		<p class="m-b-5">
			<strong>{{ nombre_lista_margen }}</strong> no tiene ningun articulo.
		</p>
		<p class="text-muted m-b-20">
			Cuando le cargues articulos vas a poder sincronizarles el margen desde aca.
		</p>
		<b-button
		variant="primary"
		@click="cerrar_modal_sincronizar_margen">
			Entendido
		</b-button>
	</div>

	<div v-else>

		<!-- Los dos margenes, el que se aplica y el que hay hoy, siempre a la vista -->
		<div class="sincronizar-bloque m-b-20">
			<p class="m-b-5">
				Margen que se va a aplicar:
				<strong>{{ etiqueta_margen_nuevo }}</strong>
			</p>
			<p class="text-muted m-b-0">
				Margen por defecto guardado hoy:
				<strong>{{ etiqueta_margen_actual }}</strong>
			</p>
		</div>

		<!--
			El usuario cambio el margen en el formulario y todavia no guardo. Es justamente el caso
			del pedido de Lucas (30 -> 35 sin guardar): hay que decirle que confirmar guarda la
			lista, y que "coinciden" se mide contra el margen viejo.
		-->
		<div
		v-if="!margen_sin_cambios"
		class="sincronizar-bloque sincronizar-bloque--alerta m-b-20"
		data-testid="aviso-cambio-sin-guardar-sincronizar-margen">
			<p class="m-b-0">
				<template v-if="porcentaje_actual_guardado === null">
					Todavia no guardaste el margen {{ etiqueta_margen_nuevo }}.
				</template>
				<template v-else>
					Todavia no guardaste el cambio de {{ etiqueta_margen_actual }} a {{ etiqueta_margen_nuevo }}.
				</template>
				Al sincronizar, primero se guarda la lista y despues se actualizan los articulos.
			</p>
		</div>

		<!-- El alcance: es la pregunta central de la ventana -->
		<div class="sincronizar-bloque m-b-20">
			<p class="m-b-10">
				<strong>
					¿A que articulos se les aplica {{ etiqueta_margen_nuevo }}?
				</strong>
			</p>

			<!--
				Se deshabilita cuando el margen nuevo es igual al guardado: los que coinciden ya
				tienen ese margen y la opcion no cambiaria nada. En ese caso el alcance arranca en
				"Todos" (ver `abrir_sincronizar_margen`).
			-->
			<b-form-radio
			class="m-b-10"
			value="coinciden"
			data-testid="coinciden-alcance-sincronizar-margen"
			:disabled="margen_sin_cambios"
			v-model="alcance_margen">
				{{ texto_opcion_coinciden }}
				<span class="d-block text-muted sincronizar-subtexto">
					<template v-if="margen_sin_cambios">
						El margen no cambio: esos articulos ya tienen {{ etiqueta_margen_nuevo }}.
					</template>
					<template v-else-if="porcentaje_actual_guardado === null">
						{{ frase_margen(coinciden_con_el_actual, 'articulo no tiene', 'articulos no tienen') }}
						un margen propio en esta lista (usan el margen por defecto). Pasan a {{ etiqueta_margen_nuevo }}.
					</template>
					<template v-else>
						{{ frase_margen(coinciden_con_el_actual, 'articulo tiene', 'articulos tienen') }}
						hoy el margen {{ etiqueta_margen_actual }} (incluye los que usan el margen por
						defecto de la lista). Pasan a {{ etiqueta_margen_nuevo }}.
					</template>
				</span>
			</b-form-radio>

			<b-form-radio
			class="m-b-0"
			value="todos"
			data-testid="todos-alcance-sincronizar-margen"
			v-model="alcance_margen">
				Todos los articulos de la lista
				<!--
					Describe el ALCANCE y no promete el resultado: sin el tilde de abajo, los de
					precio fijado a mano no pasan. El numero exacto lo da "Esto es lo que va a pasar".
				-->
				<span class="d-block text-muted sincronizar-subtexto">
					Alcanza a {{ total_articulos_de_la_lista == 1 ? 'el articulo' : 'los ' + total_articulos_de_la_lista + ' articulos' }}
					de la lista, incluidos los que tienen un margen propio: pasan a {{ etiqueta_margen_nuevo }}.
				</span>
			</b-form-radio>
		</div>

		<!--
			Los articulos con el precio fijado a mano en esta lista. Su margen sale DEL precio, asi
			que ponerles un margen sin sacarles el precio fijo no hace nada: o se dejan como estan
			(default, decision de Lucas) o pierden el precio fijo y pasan a calcularse con el margen.

			Con "coinciden" no hay pregunta: esos articulos nunca entran en ese alcance (que coincida
			su margen es casualidad, sale del precio), asi que solo se informa.
		-->
		<div
		v-if="con_precio_fijado_a_mano_en_la_lista && alcance_efectivo_margen == 'todos'"
		class="sincronizar-bloque m-b-20">
			<b-form-checkbox
			data-testid="incluir-fijados-sincronizar-margen"
			v-model="incluir_precio_fijado_a_mano">
				Incluir tambien {{ con_precio_fijado_a_mano_en_la_lista == 1 ? 'el que tiene' : 'los ' + con_precio_fijado_a_mano_en_la_lista + ' que tienen' }}
				el precio fijado a mano
			</b-form-checkbox>
			<p class="text-muted m-l-25 m-b-0 m-t-5">
				Si lo activas, {{ con_precio_fijado_a_mano_en_la_lista == 1 ? 'pierde el precio que le fijaste y pasa' : 'pierden el precio que les fijaste y pasan' }}
				a calcularse con el margen.
			</p>
		</div>
		<p
		v-else-if="con_precio_fijado_a_mano_en_la_lista"
		class="text-muted m-b-20">
			{{ con_precio_fijado_a_mano_en_la_lista == 1 ? 'El que tiene' : 'Los ' + con_precio_fijado_a_mano_en_la_lista + ' que tienen' }}
			el precio fijado a mano no se {{ con_precio_fijado_a_mano_en_la_lista == 1 ? 'toca' : 'tocan' }}.
		</p>

		<!--
			El cierre de la ventana: la combinacion que el usuario armo (alcance + tilde), con los
			numeros exactos. Se rearma solo al cambiar cualquier opcion, porque sale de un computed.
		-->
		<div class="sincronizar-bloque sincronizar-bloque--cierre m-b-20">
			<p class="m-b-10">
				<strong>
					Esto es lo que va a pasar
				</strong>
			</p>

			<!--
				La combinacion no cambia ningun articulo. Se dice, y el boton queda deshabilitado:
				si no, el usuario confirma, el formulario se guarda y se cierra, y no paso nada.
			-->
			<p
			v-if="no_toca_nada_margen"
			class="text-muted m-b-0">
				Con estas opciones no se va a modificar ningun articulo.
			</p>

			<template v-else>
				<ul class="sincronizar-consecuencias m-b-10">
					<li
					v-for="(linea, index) in consecuencias_margen"
					:key="index"
					:class="linea.grave ? 'text-danger' : 'text-muted'">
						{{ linea.texto }}
					</li>
				</ul>

				<!--
					🔴 La consecuencia que mas importa: cambiar el margen cambia el precio de venta.
					Es la misma frase que la ventana del proveedor, a proposito.
				-->
				<p class="m-b-0">
					<strong>
						Sincronizar cambia el precio de venta de esos articulos.
					</strong>
					<span v-if="tiene_tienda_online_margen">
						El precio nuevo se va a ver en tu tienda online.
					</span>
				</p>
			</template>
		</div>

		<div class="sincronizar-acciones">
			<b-button
			variant="outline-secondary"
			data-testid="cancelar-sincronizar-margen"
			@click="cerrar_modal_sincronizar_margen">
				Cancelar
			</b-button>
			<b-button
			variant="primary"
			data-testid="confirmar-sincronizar-margen"
			:disabled="no_toca_nada_margen"
			@click="confirmar_sincronizar_margen">
				Guardar y sincronizar
			</b-button>
		</div>

	</div>

</b-modal>
</template>
<script>
/*
	El id del b-modal. 🔴 Tiene que ser unico en toda la app: esta ventana se abre ENCIMA del
	formulario de la lista (cuyo id es `price_type`), y un id repetido haria que `$bvModal.hide`
	cerrara la ventana equivocada.
*/
const MODAL_ID = 'modal-sincronizar-margen-lista'

// El hook de reintento de guardado que escucha common-vue/components/model/Index.vue para price_type
const EVENTO_GUARDAR_LISTA = 'price_type:save-retry'

/**
 * Redondea a 2 decimales, que es la precision con la que la API guarda y compara los margenes
 * (`normalize_decimal_percentage` en PriceTypeHelper).
 *
 * @param {Number} numero
 * @return {Number}
 */
function redondear_margen(numero) {
	return Math.round(numero * 100) / 100
}

export default {
	data() {
		return {
			id_modal_sincronizar_margen: MODAL_ID,

			// La lista sobre la que se abrio la ventana
			price_type_id_margen: null,
			nombre_lista_margen: '',

			// El margen que hay en el formulario (ya normalizado a numero por Index.vue)
			margen_nuevo_del_formulario: null,

			cargando_preview_margen: false,

			// Lo que devuelve el preview (GET price-type/{id}/sincronizar-margen/preview)
			porcentaje_actual_guardado: null,
			total_articulos_de_la_lista: 0,
			coinciden_con_el_actual: 0,
			con_precio_fijado_a_mano_en_la_lista: 0,

			/*
				El alcance elegido. Arranca en "coinciden": es el que respeta los margenes propios
				de cada articulo. "Todos" se elige a proposito, no por venir marcado. Si el margen
				no cambio, arranca en "todos" porque "coinciden" no haria nada.
			*/
			alcance_margen: 'coinciden',

			// Apagado por defecto (decision de Lucas): un precio fijado a mano es una decision comercial
			incluir_precio_fijado_a_mano: false,

			/*
				Lo que se confirmo, guardado hasta que la ventana termine de cerrarse. Recien en el
				`@hidden` se le pide al formulario que se guarde (ver el comentario del template).
				null = la ventana se cerro sin confirmar.
			*/
			pedido_sincronizar_margen: null,
		}
	},
	computed: {
		/*
			El margen del formulario es igual al guardado (a 2 decimales). Con margen guardado
			vacio (null) nunca es igual: el nuevo nunca esta vacio, lo valida Index.vue.
		*/
		margen_sin_cambios() {
			if (this.porcentaje_actual_guardado === null || this.margen_nuevo_del_formulario === null) {
				return false
			}
			return redondear_margen(this.porcentaje_actual_guardado) == redondear_margen(this.margen_nuevo_del_formulario)
		},
		// "35%", "35,5%"
		etiqueta_margen_nuevo() {
			return this.formatear_margen(this.margen_nuevo_del_formulario)
		},
		// "30%", o "sin margen" si la lista no tenia margen por defecto guardado
		etiqueta_margen_actual() {
			if (this.porcentaje_actual_guardado === null) {
				return 'sin margen'
			}
			return this.formatear_margen(this.porcentaje_actual_guardado)
		},
		/*
			El texto de la opcion "coinciden". Nombra el margen ACTUAL entre parentesis, para que
			no quede duda de contra que se compara.
		*/
		texto_opcion_coinciden() {
			if (this.porcentaje_actual_guardado === null) {
				return 'Solo los que no tienen un margen propio'
			}
			return 'Solo los que tienen el margen actual (' + this.etiqueta_margen_actual + ')'
		},
		/*
			🔴 La UNICA fuente de verdad del alcance que se manda. Si el margen no cambio,
			"coinciden" esta deshabilitado y no se manda nunca, valga lo que valga el radio. Es la
			misma leccion que SincronizarArticulos.vue del proveedor (`accion_sobre_compras_efectiva`):
			el resumen, el tilde y el payload salen todos de aca, y no pueden desalinearse.
		*/
		alcance_efectivo_margen() {
			if (this.margen_sin_cambios) {
				return 'todos'
			}
			return this.alcance_margen
		},
		/*
			El tilde vale solo con alcance "todos" y si hay articulos con precio fijado a mano. Con
			"coinciden" el tilde ni se ve, asi que tampoco se manda aunque haya quedado prendido de
			antes.
		*/
		incluir_fijados_efectivo() {
			return this.alcance_efectivo_margen == 'todos'
				&& this.con_precio_fijado_a_mano_en_la_lista > 0
				&& !!this.incluir_precio_fijado_a_mano
		},
		/*
			Cuantos articulos escribe la sincronizacion con esta combinacion. Es la cuenta del
			invariante del plan: "coinciden" = coinciden_con_el_actual; "todos" = total menos los
			de precio fijado a mano, o el total si el tilde esta prendido.
		*/
		articulos_alcanzados_margen() {
			if (this.alcance_efectivo_margen == 'coinciden') {
				return this.coinciden_con_el_actual
			}
			if (this.incluir_fijados_efectivo) {
				return this.total_articulos_de_la_lista
			}
			return Math.max(0, this.total_articulos_de_la_lista - this.con_precio_fijado_a_mano_en_la_lista)
		},
		/*
			De los alcanzados, cuantos cambian de verdad de precio. Si el margen no cambio, los que
			coinciden ya lo tienen y no cambian (estan adentro de los alcanzados con "todos", porque
			"coinciden" nunca incluye a los de precio fijado a mano).
		*/
		articulos_que_cambian_margen() {
			let que_ya_lo_tienen = this.margen_sin_cambios ? this.coinciden_con_el_actual : 0
			return Math.max(0, this.articulos_alcanzados_margen - que_ya_lo_tienen)
		},
		// La combinacion elegida no cambia el precio de ningun articulo: el boton se deshabilita
		no_toca_nada_margen() {
			return this.articulos_que_cambian_margen <= 0
		},
		/*
			Los articulos con un margen propio distinto del actual y sin precio fijado a mano. Son
			los que "coinciden" deja afuera. La resta es exacta porque los tres grupos son
			disjuntos: "coinciden" excluye a los de precio fijado a mano.
		*/
		otros_con_margen_propio() {
			return Math.max(0, this.total_articulos_de_la_lista - this.coinciden_con_el_actual - this.con_precio_fijado_a_mano_en_la_lista)
		},
		/*
			La cuenta tiene el ecommerce (hasExtencion es del mixin global src/mixins/generals.js).
			Sin ecommerce, hablarle de "tu tienda online" seria nombrarle algo que no tiene.
		*/
		tiene_tienda_online_margen() {
			return !!this.hasExtencion('online')
		},
		/*
			Las lineas de "Esto es lo que va a pasar" para la combinacion elegida AHORA. `grave` la
			pinta en rojo: solo para la que borra un dato (el precio fijado a mano).
		*/
		consecuencias_margen() {
			let lineas = []

			if (this.alcance_efectivo_margen == 'coinciden') {
				/*
					Con la lista sin margen guardado, "coinciden" son los que no tienen margen
					propio: decir "pasan de sin margen a 35%" se lee mal, se dice de otra forma.
				*/
				let desde = this.porcentaje_actual_guardado === null
					? ' sin margen propio'
					: ' de ' + this.etiqueta_margen_actual
				lineas.push({
					texto: this.frase_margen(
						this.coinciden_con_el_actual,
						'articulo' + desde + ' pasa a ' + this.etiqueta_margen_nuevo + '.',
						'articulos' + desde + ' pasan a ' + this.etiqueta_margen_nuevo + '.'
					),
					grave: false,
				})
				if (this.otros_con_margen_propio) {
					lineas.push({
						texto: this.frase_margen(
							this.otros_con_margen_propio,
							'articulo con un margen propio no se toca.',
							'articulos con un margen propio no se tocan.'
						),
						grave: false,
					})
				}
				if (this.con_precio_fijado_a_mano_en_la_lista) {
					lineas.push({
						texto: this.frase_margen(
							this.con_precio_fijado_a_mano_en_la_lista,
							'articulo con el precio fijado a mano no se toca.',
							'articulos con el precio fijado a mano no se tocan.'
						),
						grave: false,
					})
				}
				return lineas
			}

			// Alcance "todos"
			let sin_fijados = Math.max(0, this.total_articulos_de_la_lista - this.con_precio_fijado_a_mano_en_la_lista)
			if (sin_fijados) {
				lineas.push({
					texto: this.frase_margen(
						sin_fijados,
						'articulo va a quedar con el margen ' + this.etiqueta_margen_nuevo + '.',
						'articulos van a quedar con el margen ' + this.etiqueta_margen_nuevo + '.'
					),
					grave: false,
				})
			}
			if (this.margen_sin_cambios && this.coinciden_con_el_actual) {
				lineas.push({
					texto: this.frase_margen(
						this.coinciden_con_el_actual,
						'de ellos ya tiene ese margen, asi que su precio no cambia.',
						'de ellos ya tienen ese margen, asi que su precio no cambia.'
					),
					grave: false,
				})
			}
			if (this.con_precio_fijado_a_mano_en_la_lista) {
				if (this.incluir_fijados_efectivo) {
					lineas.push({
						texto: this.frase_margen(
							this.con_precio_fijado_a_mano_en_la_lista,
							'articulo pierde el precio que le fijaste a mano y pasa a calcularse con el margen ' + this.etiqueta_margen_nuevo + '.',
							'articulos pierden el precio que les fijaste a mano y pasan a calcularse con el margen ' + this.etiqueta_margen_nuevo + '.'
						),
						grave: true,
					})
				} else {
					lineas.push({
						texto: this.frase_margen(
							this.con_precio_fijado_a_mano_en_la_lista,
							'articulo con el precio fijado a mano no se toca.',
							'articulos con el precio fijado a mano no se tocan.'
						),
						grave: false,
					})
				}
			}
			return lineas
		},
	},
	methods: {
		/**
		 * Arma "N <texto>" con la concordancia correcta.
		 *
		 * @param {Number} cantidad
		 * @param {String} en_singular texto para cantidad == 1
		 * @param {String} en_plural texto para el resto
		 * @return {String}
		 */
		frase_margen(cantidad, en_singular, en_plural) {
			return cantidad + ' ' + (cantidad == 1 ? en_singular : en_plural)
		},
		/**
		 * Muestra un margen como lo lee el usuario: sin decimales si es entero, con coma decimal
		 * si no ("35%", "35,5%", "12,25%").
		 *
		 * @param {Number|null} numero
		 * @return {String}
		 */
		formatear_margen(numero) {
			if (numero === null || typeof numero == 'undefined' || isNaN(numero)) {
				return ''
			}
			let redondeado = redondear_margen(numero)
			let texto = String(redondeado).replace('.', ',')
			return texto + '%'
		},
		/**
		 * Abre la ventana y pide el preview. Lo llama Index.vue (por ref) despues de validar que
		 * la lista este guardada y que el margen no este vacio.
		 *
		 * La ventana se abre ANTES de que responda la API, con el esqueleto adentro: si no pasa
		 * nada hasta que llega la respuesta, parece que el click se perdio.
		 *
		 * @param {Number} price_type_id id de la lista guardada
		 * @param {String} nombre nombre de la lista, para los textos
		 * @param {Number} margen_nuevo el margen del formulario, ya normalizado a numero
		 * @return {void}
		 */
		abrir_sincronizar_margen(price_type_id, nombre, margen_nuevo) {
			this.reset_sincronizar_margen()

			this.price_type_id_margen = price_type_id
			this.nombre_lista_margen = nombre ? nombre : 'Esta lista'
			this.margen_nuevo_del_formulario = margen_nuevo
			this.cargando_preview_margen = true

			this.$bvModal.show(MODAL_ID)

			let self = this
			this.$api.get('price-type/' + price_type_id + '/sincronizar-margen/preview')
			.then(res => {
				/*
					La ventana se cerro (o se reabrio para otra lista) mientras el preview viajaba:
					esta respuesta ya no es de nadie y no tiene que pisar el estado.
				*/
				if (self.price_type_id_margen != price_type_id) {
					return
				}
				self.cargando_preview_margen = false

				/*
					`porcentaje_actual` llega como string con 2 decimales ("30.00") o null si la
					lista no tenia margen por defecto guardado.
				*/
				let actual = res.data.porcentaje_actual
				if (actual === null || typeof actual == 'undefined' || actual === '') {
					self.porcentaje_actual_guardado = null
				} else {
					let numero = parseFloat(String(actual).replace(',', '.'))
					self.porcentaje_actual_guardado = isNaN(numero) ? null : numero
				}

				self.total_articulos_de_la_lista = Number(res.data.total_articulos) || 0
				self.coinciden_con_el_actual = Number(res.data.coinciden_con_el_actual) || 0
				self.con_precio_fijado_a_mano_en_la_lista = Number(res.data.con_precio_fijado_a_mano) || 0

				// Si el margen no cambio, "coinciden" no haria nada: arranca en "todos"
				if (self.margen_sin_cambios) {
					self.alcance_margen = 'todos'
				}
			})
			.catch(err => {
				console.log(err)
				// Mismo criterio que arriba: un error de una consulta vieja no cierra nada
				if (self.price_type_id_margen != price_type_id) {
					return
				}
				self.cargando_preview_margen = false
				self.$toast.error('No se pudo consultar el estado de los articulos de esta lista')
				self.cerrar_modal_sincronizar_margen()
			})
		},
		/**
		 * Confirma: guarda lo elegido y cierra la ventana. El pedido de guardado al formulario se
		 * dispara en `al_cerrar_modal_sincronizar_margen`, cuando esta ventana ya termino de
		 * cerrarse.
		 *
		 * @return {void}
		 */
		confirmar_sincronizar_margen() {
			if (this.no_toca_nada_margen) {
				return
			}
			// Nunca los valores crudos de los controles: va lo que la ventana efectivamente mostro
			this.pedido_sincronizar_margen = {
				alcance: this.alcance_efectivo_margen,
				incluir_precio_fijado_a_mano: this.incluir_fijados_efectivo,
			}
			this.cerrar_modal_sincronizar_margen()
		},
		/**
		 * Handler del `@hidden` de esta ventana (se cierre como se cierre). Si el usuario
		 * confirmo, le pide al formulario de la lista que se vuelva a guardar con la clave
		 * `sincronizar_margen`: la API guarda la lista y, en el mismo request, sincroniza.
		 *
		 * @return {void}
		 */
		al_cerrar_modal_sincronizar_margen() {
			let pedido = this.pedido_sincronizar_margen
			this.reset_sincronizar_margen()
			if (pedido) {
				this.$root.$emit(EVENTO_GUARDAR_LISTA, {
					sincronizar_margen: pedido,
				})
			}
		},
		cerrar_modal_sincronizar_margen() {
			this.$bvModal.hide(MODAL_ID)
		},
		// Deja la ventana como recien creada, para que una apertura nueva no arrastre nada
		reset_sincronizar_margen() {
			this.price_type_id_margen = null
			this.nombre_lista_margen = ''
			this.margen_nuevo_del_formulario = null
			this.cargando_preview_margen = false

			this.porcentaje_actual_guardado = null
			this.total_articulos_de_la_lista = 0
			this.coinciden_con_el_actual = 0
			this.con_precio_fijado_a_mano_en_la_lista = 0

			this.alcance_margen = 'coinciden'
			this.incluir_precio_fijado_a_mano = false
			this.pedido_sincronizar_margen = null
		},
	},
}
</script>
<style scoped lang="sass">
.sincronizar-bloque
	padding: 10px
	border-radius: 8px
	background-color: rgba(0, 0, 0, 0.02)

// El aviso de que el margen todavia no se guardo: confirmar guarda la lista
.sincronizar-bloque--alerta
	background-color: rgba(255, 193, 7, 0.08)

// El cierre: es el resumen de la decision, asi que pesa mas que los recuadros de arriba
.sincronizar-bloque--cierre
	background-color: rgba(0, 0, 0, 0.04)
	border-left: 3px solid #3b82f6

// Las consecuencias van como lista, sin los bullets del navegador ni su sangria
.sincronizar-consecuencias
	list-style: none
	padding-left: 0
	margin-bottom: 0

	li
		position: relative
		padding-left: 14px
		margin-bottom: 4px
		line-height: 1.35

		// El punto se dibuja a mano para que herede el color de la linea (rojo si es grave)
		&:before
			content: '·'
			position: absolute
			left: 4px
			font-weight: 700

// Subtexto de cada opcion: alineado con el texto del radio, no con el circulito
.sincronizar-subtexto
	font-size: 13px
	line-height: 1.35
	margin-top: 2px

.sincronizar-acciones
	display: flex
	flex-wrap: wrap
	justify-content: flex-end
	gap: 10px

// En telefono los dos botones ocupan el ancho completo, uno arriba del otro
@media (max-width: 575px)
	.sincronizar-acciones > *
		flex: 1 1 100%
</style>
