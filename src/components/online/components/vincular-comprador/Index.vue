<template>
	<div>
		<!--
			El modal de "Vincular con un cliente del sistema": elegir, entre los clientes del sistema, el
			que corresponde a un comprador de la tienda (o crear uno nuevo).

			Se monta UNA sola vez, en views/Online.vue, y se abre por evento (`vincular-comprador:abrir`
			en `$root`). Las pestañas Pedidos y Clientes de Tienda online están las dos montadas a la
			vez: si cada una tuviera su modal, dos instancias escucharían el mismo evento y se abrirían
			juntas.
		-->
		<b-modal
		id="vincular-comprador"
		title="Vincular con un cliente del sistema"
		size="md"
		centered
		scrollable
		modal-class="vincular-comprador"
		@show="abierto = true"
		@hidden="al_ocultar">
			<div
			v-if="buyer"
			class="vincular-comprador__contenido"
			data-testid="vincular-comprador-modal">
				<!-- A quién se está vinculando. -->
				<div class="vincular-comprador__contexto">
					<span
					class="vincular-comprador__avatar"
					aria-hidden="true">
						{{ inicial }}
					</span>
					<span class="vincular-comprador__datos">
						<strong
						class="vincular-comprador__nombre"
						data-testid="vincular-comprador-nombre">
							{{ nombre_del_comprador }}
						</strong>
						<span
						v-if="contacto"
						class="vincular-comprador__contacto">
							{{ contacto }}
						</span>
					</span>
				</div>

				<p class="vincular-comprador__aviso">
					Al vincularlo, sus pedidos confirmados van a la cuenta corriente de ese cliente y, en la tienda, verá sus precios y su cuenta corriente.
				</p>

				<!--
					El buscador arranca con el nombre del comprador ya escrito: mientras no se lo toque, la lista
					son las sugerencias que arma la API con el nombre, el email y el teléfono; al editarlo pasa
					a ser una búsqueda libre, y si se vacía vuelve a las sugerencias.
				-->
				<div class="vincular-comprador__buscador">
					<i
					class="bi bi-search vincular-comprador__lupa"
					aria-hidden="true"></i>
					<input
					ref="buscador"
					type="text"
					class="form-control vincular-comprador__input"
					maxlength="100"
					autocomplete="off"
					spellcheck="false"
					placeholder="Buscar por nombre, email, teléfono o CUIT"
					aria-label="Buscar un cliente del sistema"
					data-testid="vincular-comprador-buscador"
					:value="texto"
					@input="al_escribir($event.target.value)"
					@keyup.enter="buscar_ahora">
					<button
					v-if="texto !== ''"
					type="button"
					class="vincular-comprador__limpiar"
					title="Borrar lo escrito"
					aria-label="Borrar lo escrito"
					data-testid="vincular-comprador-limpiar"
					@click="limpiar">
						<i class="bi bi-x-circle-fill"></i>
					</button>
				</div>

				<!-- Lo que se ve cambiar, dicho en voz alta para quien usa lector de pantalla. -->
				<span
				class="vincular-comprador__anuncio"
				role="status"
				aria-live="polite">
					{{ anuncio }}
				</span>

				<div
				class="vincular-comprador__resultados"
				:aria-busy="cargando ? 'true' : 'false'">
					<!-- Primera carga: tres filas de esqueleto en el lugar de la lista. -->
					<div
					v-if="cargando && !resultados.length"
					class="vincular-comprador__esqueleto"
					aria-hidden="true"
					data-testid="vincular-comprador-esqueleto">
						<span
						v-for="n in 3"
						:key="n"
						class="vincular-comprador__esqueleto-fila"></span>
					</div>

					<div
					v-else-if="error"
					class="vincular-comprador__estado"
					role="alert"
					data-testid="vincular-comprador-error">
						<i
						class="bi bi-exclamation-circle"
						aria-hidden="true"></i>
						<p>
							{{ error }}
						</p>
						<b-button
						class="btn-modulo"
						variant="outline-secondary"
						data-testid="vincular-comprador-reintentar"
						@click="consultar">
							Reintentar
						</b-button>
					</div>

					<div
					v-else-if="!resultados.length"
					class="vincular-comprador__estado"
					data-testid="vincular-comprador-vacio">
						<i
						class="bi bi-search"
						aria-hidden="true"></i>
						<p>
							{{ texto_sin_resultados }}
						</p>
					</div>

					<!--
						Con una búsqueda nueva en camino la lista vieja NO se borra: queda atenuada y sin poder
						tocarse hasta que llegue la nueva. Vaciarla y volver al esqueleto en cada pausa de la
						escritura haría parpadear todo el modal.
					-->
					<div
					v-else
					ref="lista"
					class="vincular-comprador__lista"
					:class="{ 'vincular-comprador__lista--cargando': cargando }"
					role="radiogroup"
					aria-label="Clientes del sistema"
					data-testid="vincular-comprador-lista">
						<coincidencia
						v-for="cliente in resultados"
						:key="cliente.id"
						:cliente="cliente"
						:elegida="es_elegida(cliente)"
						@elegir="elegir"></coincidencia>
					</div>
				</div>

				<!-- El error de vincular vive acá y no en un toast: el modal sigue abierto para reintentar. -->
				<p
				v-if="error_vinculo"
				class="vincular-comprador__error-vinculo"
				role="alert"
				data-testid="vincular-comprador-error-vinculo">
					{{ error_vinculo }}
				</p>
			</div>

			<template #modal-footer>
				<div class="vincular-comprador__pie">
					<!-- Solo con permiso para crear clientes: es la misma regla que el botón "Nuevo" de Clientes. -->
					<b-button
					v-if="puede_crear_cliente"
					class="btn-modulo vincular-comprador__crear"
					variant="outline-secondary"
					:disabled="vinculando"
					data-testid="vincular-comprador-crear-cliente"
					@click="crear_cliente">
						<i class="bi bi-person-plus"></i>
						<span class="vincular-comprador__btn-texto">
							Crear cliente nuevo
						</span>
					</b-button>

					<b-button
					class="btn-modulo"
					variant="outline-secondary"
					:disabled="vinculando"
					data-testid="vincular-comprador-cancelar"
					@click="cerrar">
						Cancelar
					</b-button>

					<b-button
					class="btn-modulo"
					variant="primary"
					:disabled="!puede_vincular"
					data-testid="vincular-comprador-confirmar"
					@click="confirmar">
						<b-spinner
						v-if="vinculando"
						small
						class="m-r-5"></b-spinner>
						Vincular
					</b-button>
				</div>
			</template>
		</b-modal>

		<!-- El formulario de cliente nuevo. Cuando guarda, se vincula al comprador con el cliente creado. -->
		<crear-cliente
		ref="crear_cliente"
		@cliente-creado="al_crear_cliente"></crear-cliente>
	</div>
</template>
<script>
import nombre_completo from '@/components/online/components/vincular-comprador/nombre_completo'
import Coincidencia from '@/components/online/components/vincular-comprador/Coincidencia'
import CrearCliente from '@/components/online/components/vincular-comprador/CrearCliente'

/** Id del b-modal. También es el ancla de los estilos (`#vincular-comprador`). */
const ID_MODAL = 'vincular-comprador'

/** Cuánto se espera, después de la última tecla, antes de salir a buscar. */
const ESPERA_BUSQUEDA_MS = 350

/**
 * Modal de "Vincular con un cliente del sistema" (misión vincular-comprador-desde-pedidos,
 * 24/9/2026).
 *
 * Reemplaza al campo "escribí el nombre tal cual figura en el sistema" (`ComercioCityUser`) que
 * hasta ahora era la única forma de vincular un comprador de la tienda con un cliente: la búsqueda
 * era por igualdad exacta y tomaba el primero de varios homónimos. Acá se ven TODAS las
 * coincidencias y se elige por id.
 *
 * El contrato con empresa-api:
 *   - `GET  buyer/{id}/clientes-para-vincular[?q=]`  → las coincidencias (sugerencias sin `q`).
 *   - `POST buyer/{id}/vincular-cliente {client_id}` → 200 vinculado, 409 ya vinculado a otro,
 *     422 cliente inválido, 404 comprador ajeno.
 *
 * Quién lo abre: el badge de la tabla de Pedidos (`BadgeSinVincular`) y el bloque del modal del
 * comprador en Tienda online → Clientes (`VinculoDelComprador`), los dos con
 * `$root.$emit('vincular-comprador:abrir', { buyer })`.
 */
export default {
	components: {
		Coincidencia,
		CrearCliente,
	},
	data() {
		return {
			/** Comprador de la tienda que se está vinculando (el del pedido o la fila de Clientes). */
			buyer: null,
			/** Lo que hay escrito en el buscador. */
			texto: '',
			/** El texto con el que se abrió (el nombre del comprador): sirve para saber si lo tocaron. */
			texto_inicial: '',
			/** Coincidencias devueltas por la API, en el orden en que las mandó. */
			resultados: [],
			/** Cliente elegido (una de las filas de `resultados`), o null. */
			seleccionado: null,
			/** true mientras hay una búsqueda pendiente o en camino. */
			cargando: false,
			/** Mensaje de error de la búsqueda ('' si no hubo). */
			error: '',
			/** true mientras viaja el pedido de vincular. */
			vinculando: false,
			/** Mensaje de error de vincular ('' si no hubo): se muestra en el modal. */
			error_vinculo: '',
			/** true mientras el modal está a la vista. */
			abierto: false,
		}
	},
	computed: {
		/**
		 * Nombre del comprador, sin duplicar el apellido (ver nombre_completo.js).
		 *
		 * @returns {String}
		 */
		nombre_del_comprador() {
			return nombre_completo(this.buyer)
		},
		/**
		 * Inicial para el círculo del bloque de contexto.
		 *
		 * @returns {String}
		 */
		inicial() {
			return this.nombre_del_comprador !== '' ? this.nombre_del_comprador.charAt(0) : '?'
		},
		/**
		 * Email y teléfono del comprador (los que tenga) para el bloque de contexto.
		 *
		 * @returns {String} Ej.: "x@y.com · 1122334455" ('' si no tiene ninguno).
		 */
		contacto() {
			let datos = []

			if (this.buyer && this.buyer.email) {
				datos.push(String(this.buyer.email).trim())
			}
			if (this.buyer && this.buyer.phone) {
				datos.push(String(this.buyer.phone).trim())
			}

			return datos.filter(function (dato) {
				return dato !== ''
			}).join(' · ')
		},
		/**
		 * true si el usuario puede crear clientes (mismo permiso que el botón "Nuevo" de Clientes).
		 *
		 * @returns {Boolean}
		 */
		puede_crear_cliente() {
			return this.can('client.store')
		},
		/**
		 * true si se puede apretar "Vincular": hay una fila elegida y no hay nada en camino. Con una
		 * búsqueda pendiente la lista que se ve es la vieja, y elegir de ahí un cliente que la lista
		 * nueva quizás ya no trae sería confirmar a ciegas.
		 *
		 * @returns {Boolean}
		 */
		puede_vincular() {
			return this.seleccionado !== null && !this.cargando && !this.vinculando
		},
		/**
		 * Lo que se buscó, para el mensaje de "no encontramos": el texto del buscador o, si está
		 * vacío (se muestran las sugerencias), el nombre del comprador.
		 *
		 * @returns {String}
		 */
		buscando_por() {
			let escrito = this.texto.trim()

			return escrito !== '' ? escrito : this.nombre_del_comprador
		},
		/**
		 * Mensaje cuando no hay ninguna coincidencia. Sugerir "creá el cliente nuevo" solo si el
		 * usuario tiene el botón para hacerlo.
		 *
		 * @returns {String}
		 */
		texto_sin_resultados() {
			let mensaje = 'No encontramos clientes parecidos a «' + this.buscando_por + '».'

			return mensaje + (this.puede_crear_cliente ? ' Probá con otro nombre o creá el cliente nuevo.' : ' Probá con otro nombre.')
		},
		/**
		 * Frase para la región `aria-live`: cuántas coincidencias hay, o qué está pasando.
		 *
		 * @returns {String}
		 */
		anuncio() {
			if (this.cargando) {
				return 'Buscando clientes'
			}
			if (this.error) {
				return this.error
			}
			if (!this.resultados.length) {
				return 'No hay coincidencias'
			}

			return this.resultados.length === 1 ? '1 coincidencia' : this.resultados.length + ' coincidencias'
		},
	},
	created() {
		// Estado que NO tiene que ser reactivo: el temporizador de la espera de escritura y el contador
		// con el que se descartan las respuestas viejas.
		this.temporizador = null
		this.numero_de_pedido = 0
	},
	mounted() {
		this.$root.$on('vincular-comprador:abrir', this.abrir)
	},
	beforeDestroy() {
		// `$root` vive toda la sesión: sin el $off queda un listener por cada montaje de la pantalla.
		this.$root.$off('vincular-comprador:abrir', this.abrir)
		this.cancelar_pendientes()
	},
	methods: {
		/**
		 * Abre el modal para un comprador. Es el manejador de `vincular-comprador:abrir`.
		 *
		 * @param {Object} payload
		 * @param {Object} payload.buyer Comprador de la tienda (con `id`, `name` y, si los tiene,
		 *                               `surname`, `email` y `phone`).
		 * @returns {void}
		 */
		abrir(payload) {
			let comprador = payload ? payload.buyer : null

			if (!comprador || !comprador.id) {
				return
			}

			this.buyer = comprador
			this.texto_inicial = nombre_completo(comprador)
			this.mostrar_con(this.texto_inicial)
		},
		/**
		 * Deja el modal en limpio con `texto` en el buscador, lo muestra y pide las coincidencias.
		 * Lo usa la apertura normal y también el regreso desde el alta de un cliente cuando el
		 * vínculo falló (ahí el texto es el nombre del cliente recién creado).
		 *
		 * @param {String} texto Lo que va a quedar escrito en el buscador.
		 * @returns {void}
		 */
		mostrar_con(texto) {
			this.cancelar_pendientes()
			this.texto = texto
			this.resultados = []
			this.seleccionado = null
			this.error = ''
			this.error_vinculo = ''
			this.vinculando = false
			this.$bvModal.show(ID_MODAL)
			this.consultar()
		},
		/**
		 * El modal se terminó de ocultar: se cortan la espera y las búsquedas en camino, para que una
		 * respuesta tardía no toque un modal que ya no está.
		 *
		 * Ojo: NO se borra el comprador. "Crear cliente nuevo" oculta este modal y necesita seguir
		 * sabiendo con quién va a vincular al volver.
		 *
		 * @returns {void}
		 */
		al_ocultar() {
			this.abierto = false
			this.cancelar_pendientes()
			this.cargando = false
		},
		/**
		 * Corta la espera de escritura y hace que las respuestas que todavía vienen en camino se
		 * descarten cuando lleguen.
		 *
		 * @returns {void}
		 */
		cancelar_pendientes() {
			clearTimeout(this.temporizador)
			this.temporizador = null
			this.numero_de_pedido++
		},
		/**
		 * El usuario escribió en el buscador: se espera a que haga una pausa y recién ahí se busca.
		 *
		 * `cargando` se prende YA (no cuando sale el pedido): la lista de la pantalla es vieja desde
		 * este momento y el botón "Vincular" no tiene que poder usarla. Y se invalida el pedido que
		 * pudiera estar en camino, para que su respuesta no pise la lista con algo que ya no es lo
		 * que se escribió.
		 *
		 * @param {String} valor Texto actual del input.
		 * @returns {void}
		 */
		al_escribir(valor) {
			let self = this

			this.texto = valor
			this.error_vinculo = ''
			this.cancelar_pendientes()
			this.cargando = true

			this.temporizador = setTimeout(function () {
				self.consultar()
			}, ESPERA_BUSQUEDA_MS)
		},
		/**
		 * Enter en el buscador: busca ya, sin esperar la pausa.
		 *
		 * @returns {void}
		 */
		buscar_ahora() {
			this.cancelar_pendientes()
			this.consultar()
		},
		/**
		 * Vacía el buscador y vuelve a las sugerencias.
		 *
		 * @returns {void}
		 */
		limpiar() {
			this.texto = ''
			this.buscar_ahora()

			if (this.$refs.buscador) {
				this.$refs.buscador.focus()
			}
		},
		/**
		 * Pide las coincidencias a la API.
		 *
		 * Sin `q` son las SUGERENCIAS (la API las arma con el nombre, el email y el teléfono del
		 * comprador); con `q` es una búsqueda libre. Se pide con `q` solo si el texto es distinto del
		 * inicial: dejarlo como estaba, o volver a escribirlo igual, es pedir las sugerencias.
		 *
		 * 🔴 Cada pedido lleva un número y solo el ÚLTIMO puede escribir el resultado: las respuestas
		 * pueden volver en cualquier orden, y una búsqueda lenta no tiene que pisar a una más nueva.
		 *
		 * @returns {void}
		 */
		consultar() {
			let self = this
			let comprador = this.buyer

			if (!comprador) {
				return
			}

			/** Texto escrito, sin espacios de borde. */
			let escrito = this.texto.trim()
			/** Query string del pedido: vacío (sugerencias) o con la búsqueda libre. */
			let params = {}

			if (escrito !== '' && escrito !== this.texto_inicial.trim()) {
				params.q = escrito
			}

			this.numero_de_pedido++
			/** Número de ESTE pedido: si al volver ya no es el vigente, la respuesta se tira. */
			let mi_pedido = this.numero_de_pedido

			this.cargando = true
			this.error = ''

			this.$api.get('buyer/' + comprador.id + '/clientes-para-vincular', {
				params: params,
				// El error se muestra en el propio modal: sin esto el interceptor global suma un toast.
				skip_global_error_event: true,
			})
			.then(function (res) {
				if (mi_pedido !== self.numero_de_pedido) {
					return
				}

				self.cargando = false
				self.resultados = res.data && Array.isArray(res.data.models) ? res.data.models : []
				self.conservar_elegido()
				self.subir_lista()
			})
			.catch(function (err) {
				if (mi_pedido !== self.numero_de_pedido) {
					return
				}

				console.log(err)
				self.cargando = false
				self.resultados = []
				self.seleccionado = null
				self.error = self.mensaje_del_error(err, 'No pudimos buscar clientes. Probá de nuevo en unos segundos.')
			})
		},
		/**
		 * Si la fila elegida ya no está en la lista nueva, se suelta la elección: dejarla dejaría el
		 * botón "Vincular" habilitado para un cliente que el usuario ya no ve.
		 *
		 * @returns {void}
		 */
		conservar_elegido() {
			if (this.seleccionado === null) {
				return
			}

			let id_elegido = this.seleccionado.id
			let sigue = this.resultados.filter(function (cliente) {
				return cliente.id === id_elegido
			})

			if (!sigue.length) {
				this.seleccionado = null
			}
		},
		/**
		 * Lleva la lista al principio cuando llegan resultados nuevos.
		 *
		 * @returns {void}
		 */
		subir_lista() {
			let self = this

			this.$nextTick(function () {
				if (self.$refs.lista) {
					self.$refs.lista.scrollTop = 0
				}
			})
		},
		/**
		 * @param {Object} cliente Fila de `resultados`.
		 * @returns {Boolean} true si es la fila elegida.
		 */
		es_elegida(cliente) {
			return this.seleccionado !== null && this.seleccionado.id === cliente.id
		},
		/**
		 * El usuario marcó una fila.
		 *
		 * @param {Object} cliente Fila elegida.
		 * @returns {void}
		 */
		elegir(cliente) {
			this.seleccionado = cliente
			this.error_vinculo = ''
		},
		/**
		 * "Vincular": vincula al comprador con la fila elegida.
		 *
		 * @returns {void}
		 */
		confirmar() {
			if (!this.puede_vincular) {
				return
			}

			this.vincular_con(this.seleccionado, false)
		},
		/**
		 * Manda el vínculo a la API y, si sale bien, lo refleja en las tablas sin recargarlas.
		 *
		 * Se usa desde los dos caminos: "elegí uno existente" y "acabo de crear uno" (ahí
		 * `recien_creado` es true, y un fallo no deja al usuario sin nada: el cliente ya existe).
		 *
		 * @param {Object} cliente Cliente con el que vincular (necesita `id` y `name`).
		 * @param {Boolean} recien_creado true si el cliente se creó un instante antes en el modal de alta.
		 * @returns {Promise}
		 */
		vincular_con(cliente, recien_creado) {
			let self = this
			let comprador = this.buyer

			this.vinculando = true
			this.error_vinculo = ''

			return this.$api.post('buyer/' + comprador.id + '/vincular-cliente', {
				client_id: cliente.id,
			}, {
				// Los 404/409/422 de esta ruta se resuelven acá, con su propio mensaje.
				skip_global_error_event: true,
			})
			.then(function (res) {
				self.vinculando = false

				/** El comprador que devuelve la API, con el cliente ya cargado; si no vino, el que se eligió. */
				let modelo = res.data ? res.data.model : null
				let vinculado = modelo && modelo.comercio_city_client ? modelo.comercio_city_client : cliente

				self.reflejar_vinculo(comprador.id, vinculado)
				self.$toast.success('«' + nombre_completo(comprador) + '» vinculado con «' + vinculado.name + '»')
				self.cerrar()
			})
			.catch(function (err) {
				self.vinculando = false
				console.log(err)
				self.manejar_error_de_vinculo(err, comprador, cliente, recien_creado)
			})
		},
		/**
		 * Qué hacer cuando la API rechazó el vínculo.
		 *
		 * @param {Object} err Error de axios.
		 * @param {Object} comprador Comprador que se quería vincular.
		 * @param {Object} cliente Cliente con el que se quería vincular.
		 * @param {Boolean} recien_creado Ver `vincular_con`.
		 * @returns {void}
		 */
		manejar_error_de_vinculo(err, comprador, cliente, recien_creado) {
			let respuesta = err && err.response ? err.response : null

			// 409: otra persona vinculó a este comprador mientras tanto. No se pisa: se avisa con quién
			// quedó, se actualiza lo que se ve y se cierra.
			if (respuesta && respuesta.status === 409 && respuesta.data && respuesta.data.cliente_actual) {
				this.reflejar_vinculo(comprador.id, respuesta.data.cliente_actual)
				this.$toast.warning(respuesta.data.message || ('Este comprador ya está vinculado a «' + respuesta.data.cliente_actual.name + '».'))
				this.cerrar()
				return
			}

			// El cliente se creó pero no se pudo vincular: se avisa y se vuelve al modal con el nombre del
			// cliente nuevo en el buscador, que es el primero que va a aparecer para elegirlo.
			if (recien_creado) {
				this.$toast.error('El cliente se creó, pero no se pudo vincular. Elegilo de la lista para terminar.')
				this.mostrar_con(cliente.name || '')
				return
			}

			let mensaje = this.mensaje_del_error(err, 'No pudimos vincular al comprador. Probá de nuevo.')

			// Con el modal ya cerrado por el usuario mientras viajaba el pedido no hay dónde mostrarlo.
			if (this.abierto) {
				this.error_vinculo = mensaje
			} else {
				this.$toast.error(mensaje)
			}
		},
		/**
		 * Refleja el vínculo en los pedidos y en los compradores que ya están cargados.
		 *
		 * @param {Number} buyer_id Comprador vinculado.
		 * @param {Object} client Cliente con el que quedó vinculado.
		 * @returns {void}
		 */
		reflejar_vinculo(buyer_id, client) {
			this.$store.commit('order/actualizar_vinculo_del_comprador', { buyer_id: buyer_id, client: client })
			this.$store.commit('buyer/actualizar_vinculo', { buyer_id: buyer_id, client: client })
		},
		/**
		 * Texto para el usuario a partir de un error de axios.
		 *
		 * Solo se muestra lo que dice la API cuando es un mensaje de las rutas nuevas: un 422 (cliente
		 * inválido) o el 404 "Comprador no encontrado.". Cualquier otro fallo —sin conexión, un 500, o
		 * la ruta que no existe en una API que todavía no la tiene— se dice con el texto genérico, para
		 * no mostrar un mensaje en inglés del framework.
		 *
		 * @param {Object} err Error de axios.
		 * @param {String} generico Texto para cualquier otro caso.
		 * @returns {String}
		 */
		mensaje_del_error(err, generico) {
			let respuesta = err && err.response ? err.response : null
			let mensaje = respuesta && respuesta.data && typeof respuesta.data.message === 'string' ? respuesta.data.message.trim() : ''

			if (mensaje !== '' && (respuesta.status === 422 || (respuesta.status === 404 && mensaje === 'Comprador no encontrado.'))) {
				return mensaje
			}

			return generico
		},
		/**
		 * "Crear cliente nuevo": cierra este modal y abre el formulario de cliente, precargado con
		 * los datos del comprador.
		 *
		 * @returns {void}
		 */
		crear_cliente() {
			if (!this.buyer || this.vinculando) {
				return
			}

			this.$bvModal.hide(ID_MODAL)
			this.$refs.crear_cliente.abrir(this.buyer)
		},
		/**
		 * El formulario de cliente nuevo guardó: se vincula al comprador con el cliente creado.
		 *
		 * @param {Object} cliente Cliente creado (lo que devolvió `POST client`).
		 * @returns {void}
		 */
		al_crear_cliente(cliente) {
			if (!cliente || !cliente.id) {
				this.$toast.error('El cliente se creó, pero no pudimos vincularlo. Buscalo en la lista para terminar.')
				this.mostrar_con('')
				return
			}

			this.vincular_con(cliente, true)
		},
		/**
		 * Cierra el modal.
		 *
		 * @returns {void}
		 */
		cerrar() {
			this.$bvModal.hide(ID_MODAL)
		},
	},
}
</script>
<style lang="sass">
@import '@/components/online/components/vincular-comprador/_tokens'

// El modal cuelga de <body>, fuera de #app: por eso las clases van sin `scoped`, con el prefijo
// `vincular-comprador` del componente, y todo el color sale de tokens del tema (claro y oscuro).

.vincular-comprador__contenido
	text-align: left

// --- A quién se vincula --------------------------------------------------------------------------
.vincular-comprador__contexto
	display: flex
	align-items: center
	gap: 12px
	padding: 10px 12px
	border: 1px solid var(--color-border-secondary)
	border-radius: 12px
	background: var(--bg-section)

// La inicial en un círculo, en la tinta azul de las pistas fuertes.
.vincular-comprador__avatar
	display: flex
	flex: 0 0 auto
	align-items: center
	justify-content: center
	width: 36px
	height: 36px
	border-radius: 50%
	background: var(--vincular-pista-fondo)
	color: var(--vincular-pista-texto)
	font-size: 1rem
	font-weight: 600
	line-height: 1
	text-transform: uppercase

.vincular-comprador__datos
	display: flex
	flex-direction: column
	min-width: 0

.vincular-comprador__nombre
	font-size: 0.9375rem
	font-weight: 600
	line-height: 1.3
	color: var(--color-text-primary)
	overflow-wrap: anywhere

.vincular-comprador__contacto
	font-size: 0.8125rem
	line-height: 1.35
	color: var(--color-text-secondary)
	overflow-wrap: anywhere

.vincular-comprador__aviso
	margin: 10px 2px 14px
	font-size: 0.8125rem
	line-height: 1.4
	color: var(--color-text-secondary)

// --- El buscador ---------------------------------------------------------------------------------
.vincular-comprador__buscador
	position: relative
	margin-bottom: 12px

.vincular-comprador__lupa
	position: absolute
	top: 50%
	left: 14px
	transform: translateY(-50%)
	font-size: 1rem
	line-height: 1
	color: var(--color-text-secondary)
	// Es un indicador, no un botón: el click tiene que llegar al input de abajo.
	pointer-events: none

// Mismo trato que el resto de los modales "nuevos" (ver la nota en agenda/ModalCompletar.vue): radio
// de 8px y foco suave en vez del borde de 3px y el halo del default global de _inputs.sass. El id
// del modal más dos clases le gana a los selectores de etiqueta de esa hoja sin usar !important.
// No se declara font-size: el tamaño de los inputs lo manda la preferencia del usuario.
#vincular-comprador .vincular-comprador__input.form-control
	// Le deja lugar a la lupa (izquierda) y al botón de borrar (derecha).
	padding-left: 40px
	padding-right: 40px
	border-width: 1px
	border-radius: var(--metodo-pago-input-radius)

	&:focus
		border-width: 1px
		border-color: var(--color-primary)
		box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)

.vincular-comprador__limpiar
	position: absolute
	top: 50%
	right: 8px
	display: flex
	align-items: center
	justify-content: center
	width: 28px
	height: 28px
	padding: 0
	border: none
	border-radius: 50%
	background: transparent
	color: var(--color-text-secondary)
	line-height: 1
	cursor: pointer
	// Adentro de un .modal el sistema ya apaga la sombra de los <button>, pero no se depende de eso.
	box-shadow: none
	transform: translateY(-50%)
	transition: background-color 0.15s ease, color 0.15s ease

	&:hover
		background: var(--bg-hover)
		color: var(--color-text-primary)

	&:focus
		outline: none

	&:focus-visible
		box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)

// Texto solo para lectores de pantalla: fuera de la vista pero leído. (No se usa `.sr-only` de
// bootstrap para no depender de que esa clase esté en la hoja final.)
.vincular-comprador__anuncio
	position: absolute
	width: 1px
	height: 1px
	margin: -1px
	padding: 0
	overflow: hidden
	clip: rect(0, 0, 0, 0)
	white-space: nowrap
	border: 0

// --- Resultados ----------------------------------------------------------------------------------
.vincular-comprador__lista
	display: flex
	flex-direction: column
	gap: 6px
	// Alto acotado con scroll propio, y que se achica en pantallas bajas para que el modal entero
	// entre sin scroll doble: 26rem es lo que ocupan el resto del modal y sus márgenes.
	max-height: max(10rem, min(21rem, calc(100vh - 26rem)))
	overflow-y: auto
	// Un respiro para que el scroll no pise el borde de las filas.
	padding-right: 2px

// Con una búsqueda nueva en camino la lista vieja queda atenuada y sin poder tocarse.
.vincular-comprador__lista--cargando
	opacity: 0.55
	pointer-events: none
	transition: opacity 0.15s ease

.vincular-comprador__estado
	display: flex
	flex-direction: column
	align-items: center
	gap: 8px
	padding: 22px 12px
	text-align: center
	font-size: 0.875rem
	line-height: 1.4
	color: var(--color-text-secondary)

	.bi
		font-size: 1.5rem
		line-height: 1
		opacity: 0.7

	p
		max-width: 34ch
		margin: 0

.vincular-comprador__esqueleto
	display: flex
	flex-direction: column
	gap: 6px

.vincular-comprador__esqueleto-fila
	display: block
	height: 62px
	border-radius: 10px
	background: var(--bg-hover)
	animation: vincular-comprador-pulso 1.2s ease-in-out infinite

@keyframes vincular-comprador-pulso
	0%, 100%
		opacity: 1

	50%
		opacity: 0.5

// Quien pidió menos movimiento en el sistema operativo no ve el pulso.
@media (prefers-reduced-motion: reduce)
	.vincular-comprador__esqueleto-fila
		animation: none

.vincular-comprador__error-vinculo
	margin: 12px 0 0
	padding: 8px 12px
	border: 1px solid var(--btn-peligro-borde)
	border-radius: 10px
	background: var(--btn-peligro-fondo)
	color: var(--btn-peligro-texto)
	font-size: 0.8125rem
	line-height: 1.4

// --- El pie --------------------------------------------------------------------------------------
.vincular-comprador__pie
	display: flex
	align-items: center
	gap: 8px
	width: 100%

// "Crear cliente nuevo" queda a la izquierda, solo; Cancelar y Vincular se van a la derecha.
.vincular-comprador__crear
	margin-right: auto

// 🔴 El margen va en el <span> y no en el <i>: con el `whitespace: condense` de Vue, un <i> y un
// <span> en líneas separadas quedan pegados.
.vincular-comprador__btn-texto
	margin-left: 6px

// En teléfono el pie se apila a ancho completo: "Crear cliente nuevo" arriba y "Vincular" abajo.
@media (max-width: 575px)
	.vincular-comprador__pie
		flex-direction: column
		align-items: stretch

		.btn
			width: 100%

	.vincular-comprador__crear
		margin-right: 0

	// En el teléfono el scroll lo maneja el modal entero: una lista con scroll propio adentro de un
	// cuerpo que también scrollea es la trampa de dos dedos.
	.vincular-comprador__lista
		max-height: none
		overflow-y: visible
		padding-right: 0
</style>
