<template>
<!--
	Mision catalogo-por-lista-tienda (5/10/2026): lo que va DEBAJO del interruptor "En la tienda,
	mostrar solo los articulos habilitados para esta lista" (`catalogo_restringido_en_tienda`) del
	formulario de la lista de precios.

	Lo monta src/common-vue/views/Abm.vue por el slot aditivo `prop_extras` de ModelForm, solo para
	`price_type` y solo debajo de esa key (mismo mecanismo que el boton "Sincronizar articulos" que
	va debajo del margen). La key solo existe con la extension `online` (src/models/price_type.js):
	sin la extension este componente no se monta nunca.

	Hace dos cosas, y ninguna escribe nada:

	1. El contador "X de Y articulos habilitados en la tienda para esta lista" (contrato C2 de la
		mision): `GET price-type/{id}/habilitados-en-tienda` devuelve `{habilitados, total}`, donde
		`total` son los articulos vivos del dueño y `habilitados` los que tienen tildado "Visible en
		la tienda para esta lista". Solo con la lista YA GUARDADA: una lista nueva no tiene id ni
		articulos habilitados. El sustantivo concuerda con el TOTAL ("1 de 11 articulos habilitados",
		"1 de 1 articulo habilitado"), no con la cantidad de habilitados.
	2. Con el interruptor prendido en el formulario (guardado o no), un aviso permanente de lo que
		implica. La ayuda del campo vive en un popover que solo se ve al pasar el mouse; esto, en
		cambio, queda a la vista, porque prender el interruptor con cero articulos habilitados deja a
		esos clientes sin ver NADA en la tienda, y eso no puede depender de que alguien lea un globo.

	🔴 El aviso NO lee el interruptor de `model`: se entera escuchando el evento `change` de su
	<input>. El formulario del ABM edita una copia plana del modelo que Vue no observa, asi que un
	computed sobre `model.catalogo_restringido_en_tienda` nunca se entera de un clic. El detalle, y
	por que no se arregla con `full_reactivity`, estan en `data()`.

	🔴 El contador se pide al montar y no se refresca solo. No hace falta: el formulario vive en un
	b-modal sin `static`, que destruye su contenido al cerrarse, asi que cada vez que se abre la
	lista este componente nace de nuevo y vuelve a preguntar.
-->
<div
v-if="mostrar_bloque"
class="habilitados-en-tienda-cont"
data-testid="habilitados-en-tienda-de-lista">

	<!-- Contador: solo con la lista guardada (hay contra que preguntar). -->
	<div
	v-if="lista_guardada"
	class="habilitados-en-tienda__contador">
		<b-spinner
		v-if="cargando_habilitados"
		small
		variant="primary"></b-spinner>

		<span
		v-else-if="error_habilitados"
		class="habilitados-en-tienda__error">
			No se pudo consultar cuántos artículos están habilitados
		</span>

		<span
		v-else-if="contador_cargado">
			<strong>{{ numero_es(habilitados) }} de {{ numero_es(total) }}</strong>
			{{ Number(total) === 1 ? 'artículo habilitado' : 'artículos habilitados' }} en la tienda para esta lista
		</span>
	</div>

	<!--
		Aviso con el interruptor prendido. Si ya se sabe que no hay ninguno habilitado, se dice
		con todas las letras: es exactamente el caso en que la tienda queda vacia para esos clientes.

		Dos cuidados de texto (hallazgo H8 del revisor):
		- Como se habilitan los articulos va SOLO en la variante de cero habilitados, que es cuando
			hace falta. En la otra ya lo dicen el popover del interruptor y su descripcion: repetirlo
			dejaba tres textos del mismo tema, y a 360 px eran seis u ocho lineas.
		- El verbo va en futuro ("veran") mientras el interruptor esta prendido pero sin guardar:
			la tienda todavia no lo aplica, y "ven" en presente decia lo contrario.
	-->
	<p
	v-if="lista_restringida"
	class="habilitados-en-tienda__aviso m-b-0">
		<template v-if="sin_ninguno_habilitado">
			Hoy no hay ningún artículo habilitado: los clientes con esta lista no van a ver ningún artículo en la tienda.
			Se habilitan desde la ficha del artículo ("Visible en la tienda para esta lista"), con la actualización masiva o con la importación de Excel.
		</template>
		<template v-else>
			Los clientes con esta lista {{ verbo_de_la_tienda }} en la tienda solo los artículos habilitados.
		</template>
	</p>
</div>
</template>
<script>
/*
	Id del <input> del interruptor "En la tienda, mostrar solo los articulos habilitados para esta
	lista". Lo arma ModelForm como `model_name + '-' + prop.key` y es el mismo que usa el `for` del
	label del toggle, asi que si algun dia cambia, el toggle deja de andar antes que este aviso.
*/
const ID_DEL_INTERRUPTOR = 'price_type-catalogo_restringido_en_tienda'

/**
 * ¿La lista que trae este modelo tiene el interruptor prendido?
 *
 * 🔴 Comparacion SUELTA a proposito: la columna llega de la API como 0/1, null o string ("1") segun
 * el driver, y el toggle de ModelForm escribe 1/0 numerico. Con `=== 1` un "1" string se leeria como
 * apagado. Nunca `!= 0`: NULL tambien es "sin restriccion" (contrato C1).
 *
 * @param {Object|null|undefined} model
 * @return {Boolean}
 */
function esta_restringida(model) {
	return !!model && model.catalogo_restringido_en_tienda == 1
}

export default {
	props: {
		/*
			La lista de precios del formulario: es el `model` del scope de `prop_extras`, o sea el
			MISMO objeto que esta editando ModelForm. De aca salen el `id` y el valor INICIAL del
			interruptor; lo que el usuario va dejando en el interruptor NO se lee de aca, porque ese
			objeto no es reactivo (ver `restringida_en_el_formulario`).
		*/
		model: Object,
	},
	data() {
		return {
			cargando_habilitados: false,
			error_habilitados: false,
			// null mientras no hay respuesta: distingue "todavia no se sabe" de un 0 real.
			habilitados: null,
			total: null,
			/*
				🔴 Lo que el interruptor tiene en el formulario AHORA, guardado o no. NO se lee de
				`this.model`, y por eso es un dato propio.

				El ABM le da al formulario una COPIA plana del modelo (`{...model}`, en
				common-vue/components/model/Index.vue, porque `price_type` no declara `full_reactivity`)
				que Vue no observa: cuando ModelForm hace `$set(model, 'catalogo_restringido_en_tienda', 1)`
				es una asignacion muda, y un computed que lea esa clave se queda con el valor de su primer
				calculo. Medido en vivo por el verificador el 5/10/2026: al prender el interruptor no
				aparecia el aviso, y al apagarlo quedaba el viejo. Es el mismo motivo por el que el badge
				Si/No de "Ocultar al publico" se queda pegado.

				🔴 NO se arregla con `full_reactivity: true` en src/models/price_type.js: el ABM pasaria
				a editar POR REFERENCIA la fila de `$store.state.price_type.models`, que leen en vivo
				Vender y otros doce componentes (price-type-input, buscador-articulos, ExcelPriceTypes,
				ai-excel-import, price-changes...), y cerrar el modal sin guardar dejaria una lista
				editada a medias aplicada a los precios. Es el mismo caveat que documenta
				src/models/address.js.

				Por eso el componente se entera por su cuenta: escucha el `change` del <input> del
				interruptor (`escuchar_el_interruptor`) y guarda el estado aca. Arranca con lo que trae
				el modelo y, mientras el objeto sea el mismo, manda el evento.
			*/
			restringida_en_el_formulario: esta_restringida(this.model),
			// Lo que tenia la lista GUARDADA cuando se abrio el formulario: el aviso lo usa para hablar
			// en futuro ("veran") mientras el interruptor este prendido pero todavia sin guardar.
			restringida_guardada: esta_restringida(this.model),
		}
	},
	computed: {
		/**
		 * ¿La lista ya esta guardada? Sin id no hay contra que pedir el contador.
		 *
		 * @return {Boolean}
		 */
		lista_guardada() {
			return !!(this.model && this.model.id)
		},
		/**
		 * ¿El interruptor esta prendido en el formulario AHORA (guardado o no)?
		 *
		 * Sale de `restringida_en_el_formulario`, que se alimenta del evento del interruptor: leer
		 * `this.model.catalogo_restringido_en_tienda` no sirve (ver ese dato en `data()`).
		 *
		 * @return {Boolean}
		 */
		lista_restringida() {
			return this.restringida_en_el_formulario
		},
		/**
		 * ¿El interruptor esta prendido pero eso todavia NO esta guardado?
		 *
		 * Es lo que pasa en una lista nueva, o en una guardada sin restriccion a la que se le acaba de
		 * prender el interruptor: la tienda recien lo aplica despues de guardar.
		 *
		 * @return {Boolean}
		 */
		restriccion_sin_guardar() {
			return this.lista_restringida && (!this.lista_guardada || !this.restringida_guardada)
		},
		/**
		 * El verbo del aviso: "ven" si la tienda ya aplica la restriccion, "veran" si todavia no.
		 *
		 * @return {String}
		 */
		verbo_de_la_tienda() {
			return this.restriccion_sin_guardar ? 'verán' : 'ven'
		},
		/**
		 * ¿Ya llego una respuesta valida del contador?
		 *
		 * @return {Boolean}
		 */
		contador_cargado() {
			return this.habilitados !== null && this.total !== null
		},
		/**
		 * ¿Se sabe (por el contador) que no hay ningun articulo habilitado para esta lista?
		 *
		 * @return {Boolean}
		 */
		sin_ninguno_habilitado() {
			return this.contador_cargado && Number(this.habilitados) === 0
		},
		/**
		 * ¿Hay algo para mostrar? Una lista nueva con el interruptor apagado no tiene contador ni
		 * aviso: el bloque no se dibuja y el formulario queda como siempre.
		 *
		 * @return {Boolean}
		 */
		mostrar_bloque() {
			return this.lista_guardada || this.lista_restringida
		},
	},
	watch: {
		/*
			Al guardar una lista nueva el `model` pasa a tener id sin que el componente se vuelva a
			montar: ahi corresponde pedir el contador por primera vez. `immediate` cubre la apertura
			de una lista ya guardada.
		*/
		'model.id': {
			handler: 'pedir_habilitados_en_tienda',
			immediate: true,
		},
		/*
			Si el formulario pasa a mostrar OTRO objeto de modelo (otra lista, o la misma tras un
			guardado que no cierra el modal), el interruptor vuelve a valer lo que dice ese modelo,
			que es tambien lo que ModelForm dibuja en el <input>, y eso pasa a ser lo "guardado".
			Mientras el objeto sea el mismo, manda el evento del interruptor (`al_cambiar_un_campo`).
		*/
		model(nuevo) {
			let restringida = esta_restringida(nuevo)

			this.restringida_en_el_formulario = restringida
			this.restringida_guardada = restringida
		},
	},
	created() {
		// Nodo donde se engancho el listener del interruptor. No va en `data`: es un elemento del
		// DOM y no tiene por que ser reactivo.
		this.contenedor_del_interruptor = null
	},
	mounted() {
		this.escuchar_el_interruptor()
	},
	beforeDestroy() {
		this.dejar_de_escuchar_el_interruptor()
	},
	methods: {
		/**
		 * Engancha UN listener `change` en el formulario que contiene este bloque, para enterarse
		 * de cada clic en el interruptor (ver `restringida_en_el_formulario` en `data()`).
		 *
		 * Va delegado en el formulario y no sobre el <input>: el input lo dibuja ModelForm, no este
		 * componente, y `change` burbuja hasta aca.
		 *
		 * Con el bloque sin dibujar (lista nueva con el interruptor apagado) `$el` es un comentario
		 * vacio, pero igual tiene padre: es el mismo al que despues se agrega el <div> del bloque.
		 *
		 * @return {void}
		 */
		escuchar_el_interruptor() {
			let padre = this.$el ? this.$el.parentNode : null

			if (!padre) {
				return
			}

			let formulario = typeof padre.closest == 'function' ? padre.closest('.model-form') : null

			this.contenedor_del_interruptor = formulario ? formulario : padre
			this.contenedor_del_interruptor.addEventListener('change', this.al_cambiar_un_campo)
		},
		/**
		 * Saca el listener de `escuchar_el_interruptor` al destruirse el componente: si el nodo del
		 * formulario sobrevive (se reusa), un listener colgado seguiria escribiendo en una
		 * instancia muerta.
		 *
		 * @return {void}
		 */
		dejar_de_escuchar_el_interruptor() {
			if (!this.contenedor_del_interruptor) {
				return
			}

			this.contenedor_del_interruptor.removeEventListener('change', this.al_cambiar_un_campo)
			this.contenedor_del_interruptor = null
		},
		/**
		 * Handler del `change` delegado: si el campo que cambio es el interruptor, copia su estado.
		 *
		 * Lee `checked` del propio <input> y no `this.model`, que es justamente el dato que no se
		 * actualiza. Es el mismo valor que ModelForm escribe en el modelo (`$event.target.checked ? 1 : 0`).
		 *
		 * @param {Event} event
		 * @return {void}
		 */
		al_cambiar_un_campo(event) {
			let campo = event ? event.target : null

			if (!campo || campo.id !== ID_DEL_INTERRUPTOR) {
				return
			}

			this.restringida_en_el_formulario = !!campo.checked
		},
		/**
		 * Pide `{habilitados, total}` de la lista a la API (contrato C2).
		 *
		 * Una respuesta que llega cuando el formulario ya muestra OTRA lista se descarta: el
		 * contador no puede quedar con los numeros de una lista que no es la que se esta viendo.
		 *
		 * @return {void}
		 */
		pedir_habilitados_en_tienda() {
			if (!this.lista_guardada) {
				return
			}

			let self = this
			let price_type_id = this.model.id

			this.cargando_habilitados = true
			this.error_habilitados = false
			this.habilitados = null
			this.total = null

			/*
				🔴 `skip_global_error_event`: el contador es un dato de mas del formulario y su fallo ya
				lo cuenta la linea gris de abajo. Sin la bandera, el interceptor de main.js ademas
				despacha `errorEvent` y aparece un toast rojo de 10 s al abrir CUALQUIER lista guardada
				de una cuenta con `online` cuya empresa-api todavia es vieja (la ruta no existe: 404 con
				`{"message":""}`), aunque nadie toque el interruptor. El SPA nuevo y la API vieja
				conviven hasta que se actualiza la cuenta. Mismo recurso que usa store/ai_chat.js
				(fetchMiConsumo) para un endpoint opcional.
			*/
			this.$api.get('price-type/' + price_type_id + '/habilitados-en-tienda', {
				skip_global_error_event: true,
			})
			.then(res => {
				if (!self.model || self.model.id != price_type_id) {
					return
				}
				self.cargando_habilitados = false

				let datos = res && res.data ? res.data : {}
				let habilitados = Number(datos.habilitados)
				let total = Number(datos.total)

				// Una respuesta sin los dos numeros (p. ej. una API vieja que no tiene la ruta y
				// contesta otra cosa) se trata como error y no como "0 de 0": Number(null) da 0 y
				// Number(undefined) da NaN, asi que los dos casos se miran aparte.
				if (
					datos.habilitados === null || typeof datos.habilitados == 'undefined'
					|| datos.total === null || typeof datos.total == 'undefined'
					|| isNaN(habilitados) || isNaN(total)
				) {
					self.error_habilitados = true
					return
				}

				self.habilitados = habilitados
				self.total = total
			})
			.catch(() => {
				if (!self.model || self.model.id != price_type_id) {
					return
				}
				// Sin toast (ver la bandera del GET): es un dato de mas en el formulario, no una
				// accion del usuario. La linea del error ya lo dice en su lugar.
				self.cargando_habilitados = false
				self.error_habilitados = true
			})
		},
	},
}
</script>
<style scoped lang="sass">
.habilitados-en-tienda-cont
	margin-top: 8px
	font-size: 0.85em

	.habilitados-en-tienda__contador
		color: var(--color-text-primary, rgba(0, 0, 0, .8))

	.habilitados-en-tienda__error
		color: var(--color-text-secondary, rgba(0, 0, 0, .55))

	// El aviso lleva el amarillo de advertencia de Bootstrap (#ffc107) como borde, en un recuadro:
	// es una consecuencia de lo que se eligio, no una ayuda que se puede pasar por alto. El fondo va
	// por --bg-hover, igual que el interruptor de las tarjetas de precio, para que se despegue de la
	// tarjeta tambien en modo oscuro.
	.habilitados-en-tienda__aviso
		margin-top: 6px
		padding: 6px 8px
		border-radius: 6px
		border-left: 3px solid #ffc107
		background: var(--bg-hover, rgba(0, 0, 0, .04))
		color: var(--color-text-primary, rgba(0, 0, 0, .8))
		word-break: break-word
</style>
