<template>
	<!--
		E12. El componente no se monta sin la extensión o sin rol de administrador: el botón
		que lo abre tampoco existe en ese caso y el endpoint contesta 403. Es un v-if y no un
		v-show a propósito -- para un usuario sin acceso no se ejecuta una línea de acá.
	-->
	<div v-if="hasExtencion('costo_en_dolares') && is_admin">
		<b-modal
		id="cotizacion-dolar"
		size="md"
		centered
		scrollable
		hide-footer
		lazy
		dialog-class="cotizacion-dolar-dialog"
		title="Cotización del dólar"
		@show="al_abrir"
		@hidden="al_cerrar">

			<!--
				Mientras el modal se está yendo no se dibuja nada nuevo. Guardar deja la
				medición en null -- la referencia que se acaba de guardar es la de este mismo
				momento, así que no hay nada medido -- y el modal sigue montado durante toda
				la transición de salida: sin esto, el último cuadro del cierre exitoso sería
				la pantalla de "no pudimos comparar", justo después de haber guardado bien.
			-->
			<div v-if="cerrando"></div>

			<!-- E1. Spinner solo, sin texto de relleno. -->
			<div
			v-else-if="loading"
			class="cotizacion-dolar__cargando">
				<b-spinner></b-spinner>
			</div>

			<div
			v-else
			class="cotizacion-dolar">

				<!--
					E11. El error de guardado va arriba de todo y el modal NO se cierra. Un
					cierre después de un fallo se lee como éxito, y el usuario se iría creyendo
					que su cotización quedó guardada.
				-->
				<b-alert
				v-if="error_al_guardar"
				show
				variant="danger">
					{{ error_al_guardar }}
				</b-alert>

				<!--
					E2. No se pudo consultar. 🔴 Ni listado vacío, ni "no hubo variación", ni
					un 0%: no saber cuánto vale el dólar hoy no es lo mismo que saber que no se
					movió, y de las dos cosas la única que se puede afirmar es que no se sabe.
				-->
				<template v-if="hubo_error_de_proveedor">

					<b-alert
					show
					variant="warning">
						{{ mensaje_de_error }}
					</b-alert>

					<b-button
					class="m-b-15"
					size="sm"
					variant="outline-secondary"
					:disabled="loading"
					@click="reintentar">
						Reintentar
					</b-button>

					<p class="cotizacion-dolar__leyenda m-b-15">
						Podés cargar un valor a mano, pero sin las cotizaciones no vamos a poder
						avisarte cuando cambie.
					</p>

					<lista-de-cotizaciones v-model="seleccion"></lista-de-cotizaciones>

					<div class="cotizacion-dolar__acciones">
						<b-button
						block
						variant="primary"
						:disabled="!puede_guardar || guardando"
						@click="guardar_seleccion">
							<b-spinner
							v-if="guardando"
							small></b-spinner>
							<span v-else>
								Guardar
							</span>
						</b-button>

						<b-button
						class="cotizacion-dolar__secundario"
						variant="link"
						:disabled="guardando"
						@click="ahora_no">
							Ahora no
						</b-button>
					</div>

				</template>

				<!-- E3. Primera vez: no hay nada contra qué comparar, así que no se compara. -->
				<template v-else-if="nunca_eligio">

					<p class="cotizacion-dolar__titulo-estado">
						Elegí la cotización del dólar
					</p>
					<p class="cotizacion-dolar__leyenda m-b-15">
						Es la que usamos para costear los artículos que tenés en dólares. Elegí
						una casa y una punta, o cargá el valor a mano.
					</p>

					<lista-de-cotizaciones v-model="seleccion"></lista-de-cotizaciones>

					<div class="cotizacion-dolar__acciones">
						<b-button
						block
						variant="primary"
						:disabled="!puede_guardar || guardando"
						@click="guardar_seleccion">
							<b-spinner
							v-if="guardando"
							small></b-spinner>
							<span v-else>
								Guardar
							</span>
						</b-button>

						<b-button
						class="cotizacion-dolar__secundario"
						variant="link"
						:disabled="guardando"
						@click="ahora_no">
							Ahora no
						</b-button>
					</div>

				</template>

				<!--
					E8. Hay una cotización elegida pero no hay referencia usable, así que no
					hay medición posible. Es el callejón en el que queda el que editó "Valor
					dolar" desde el formulario de Configuración: sin referencia no hay avisos,
					y elegir una acá es la única salida.
				-->
				<template v-else-if="sin_medicion">

					<p class="cotizacion-dolar__leyenda m-b-15">
						{{ texto_sin_medicion }}
					</p>

					<lista-de-cotizaciones v-model="seleccion"></lista-de-cotizaciones>

					<div class="cotizacion-dolar__acciones">
						<b-button
						block
						variant="primary"
						:disabled="!puede_guardar || guardando"
						@click="guardar_seleccion">
							<b-spinner
							v-if="guardando"
							small></b-spinner>
							<span v-else>
								Guardar
							</span>
						</b-button>

						<b-button
						class="cotizacion-dolar__secundario"
						variant="link"
						:disabled="guardando"
						@click="ahora_no">
							Ahora no
						</b-button>
					</div>

				</template>

				<!--
					E4, E5, E6 y E7. Hay medición. Lo que cambia entre los cuatro es el texto,
					no la pantalla: un solo número protagonista, una sola acción primaria y
					todo lo demás en voz baja.
				-->
				<template v-else>

					<div class="cotizacion-dolar__referencia">
						{{ texto_referencia }}
					</div>

					<!--
						Los dos números, o uno solo cuando no se movió. Mostrar "$1.540,00 →
						$1.540,00" sería dibujar un cambio que no pasó.
					-->
					<div
					v-if="ofrece_usar"
					class="cotizacion-dolar__numeros">
						<span class="cotizacion-dolar__numero-viejo">
							{{ price(comparacion.valor_referencia) }}
						</span>
						<span class="cotizacion-dolar__flecha">
							&rarr;
						</span>
						<span class="cotizacion-dolar__numero-nuevo">
							{{ price(comparacion.valor_nuevo) }}
						</span>
					</div>
					<div
					v-else
					class="cotizacion-dolar__numeros">
						<span class="cotizacion-dolar__numero-nuevo">
							{{ price(comparacion.valor_nuevo) }}
						</span>
					</div>

					<div
					class="cotizacion-dolar__variacion"
					:class="clase_de_variacion">
						{{ texto_variacion }}
					</div>

					<p
					v-if="texto_de_cuando"
					class="cotizacion-dolar__leyenda">
						{{ texto_de_cuando }}
					</p>

					<div class="cotizacion-dolar__acciones">
						<!--
							La única acción primaria del modal. Se esconde con la lista abierta
							para que nunca haya dos botones primarios peleándose: abrir "Elegir
							otra cotización" ya dice que el valor ofrecido no es el que se quiere.
						-->
						<b-button
						v-if="ofrece_usar && !mostrar_lista"
						block
						variant="primary"
						:disabled="guardando"
						@click="usar_la_de_hoy">
							<b-spinner
							v-if="guardando"
							small></b-spinner>
							<span v-else>
								Usar {{ price(comparacion.valor_nuevo) }}
							</span>
						</b-button>

						<b-button
						class="cotizacion-dolar__secundario"
						variant="link"
						:disabled="guardando"
						@click="ahora_no">
							{{ ofrece_usar ? 'Ahora no' : 'Listo' }}
						</b-button>
					</div>

					<div class="cotizacion-dolar__separador"></div>

					<b-button
					class="cotizacion-dolar__toggle"
					variant="link"
					@click="mostrar_lista = !mostrar_lista">
						<span>
							Elegir otra cotización
						</span>
						<i :class="mostrar_lista ? 'icon-up' : 'icon-down'"></i>
					</b-button>

					<b-collapse v-model="mostrar_lista">
						<lista-de-cotizaciones v-model="seleccion"></lista-de-cotizaciones>
						<b-button
						class="m-t-15"
						block
						variant="primary"
						:disabled="!puede_guardar || guardando"
						@click="guardar_seleccion">
							<b-spinner
							v-if="guardando"
							small></b-spinner>
							<span v-else>
								Guardar esta cotización
							</span>
						</b-button>
					</b-collapse>

				</template>

				<!--
					Las preferencias de aviso, UNA sola vez y para TODOS los estados.

					🔴 Antes vivían adentro de la rama de "hay medición", así que el checkbox y el
					umbral no existían en los otros tres: ni la primera vez que el comercio elige
					cotización, ni cuando carga una manual sin referencia, ni con el proveedor
					caído. Lucas pidió explícitamente que el aviso se pueda activar también cuando
					la cotización es manual, y en esas pantallas no había forma de tocarlo — pero
					el POST las mandaba igual, así que se guardaban valores que el usuario nunca
					vio ni eligió.

					Van al pie y no arriba del separador (como estaba en E6) para que queden en el
					mismo lugar en las cuatro pantallas: es una preferencia de la cuenta, no parte
					de la elección de este momento.

					Se dibujan solo si las cargamos del backend: mostrar los defaults del store
					como si fueran la configuración del comercio es peor que no mostrar nada.
				-->
				<div
				v-if="preferencias_cargadas"
				class="cotizacion-dolar__preferencias">
					<b-form-checkbox v-model="avisar_cambios">
						Avisarme cuando cambie
					</b-form-checkbox>
					<div class="cotizacion-dolar__umbral">
						<b-form-input
						autocomplete="off"
						class="cotizacion-dolar__umbral-input"
						type="number"
						step="0.1"
						min="0.01"
						max="100"
						size="sm"
						:disabled="!avisar_cambios"
						v-model="variacion_minima"></b-form-input>
						<span>%</span>
					</div>
				</div>

			</div>

		</b-modal>
	</div>
</template>
<script>
/**
 * Modal de la cotización del dólar de la cuenta.
 *
 * Se abre desde dos lugares —el gancho del arranque y el botón del formulario de
 * Configuración— y el contenido lo decide la respuesta del GET, no quién lo abrió. Lo único
 * que cambia según el que abrió es el campo `disparo` que viaja en el POST, que sale de
 * `store.abierto_desde`.
 *
 * 🔴 La regla que ordena todos los estados: "no se pudo medir" y "no hubo cambios" son
 * distintos y se muestran distinto. Un `comparacion` en null nunca se dibuja como un 0%.
 *
 * El GET se dispara en el `@show` y no en el que abre el modal: así el único lugar que sabe
 * cómo se carga esta pantalla es esta pantalla, y el botón de Configuración no tiene que
 * saber nada. En el arranque eso cuesta una consulta de más —el gancho ya consultó para
 * decidir si abrirlo—, y se paga a gusto: pasa solo en el caso E6, que es el raro, y a
 * cambio no hay ningún camino por el que el modal se abra mostrando datos de antes.
 */
/*
 * Referencia por default cuando el comercio no tiene ninguna elegida.
 *
 * 🔴 Están acá y no solo en ListaDeCotizaciones porque el dueño del dato es ESTE componente.
 * El hijo también los siembra al montarse, pero ese emit lo pisa la sincronización del padre
 * cuando llega la respuesta del GET, y el resultado era `casa: null, punta: null` viajando en un
 * POST que las pide required: el Guardar volvía 422 siempre. Sembrarlos donde nace el dato lo
 * hace independiente del orden en que se monten los componentes.
 *
 * Si cambian, cambian en los dos lados. Son la misma decisión escrita dos veces a propósito:
 * importarlos del SFC del hijo lo metería en el chunk del padre y rompería su carga diferida.
 */
const CASA_POR_DEFAULT = 'blue'
const PUNTA_POR_DEFAULT = 'venta'

export default {
	components: {
		ListaDeCotizaciones: () => import('@/components/common/cotizacion-dolar/ListaDeCotizaciones'),
	},
	data() {
		return {
			/**
			 * La selección que se está editando, con las cuatro claves siempre presentes
			 * porque las cuatro son obligatorias en el POST:
			 * { origen, casa, punta, valor_manual }
			 */
			seleccion: {
				origen: null,
				casa: null,
				punta: null,
				valor_manual: null,
			},
			avisar_cambios: true,
			variacion_minima: 1,
			mostrar_lista: false,
			/*
			 * El modal está en su transición de salida. Es local y no del store porque no es
			 * un dato de la cotización: es el estado de ESTA pantalla mientras se va.
			 */
			cerrando: false,
		}
	},
	computed: {
		loading() {
			return this.$store.state.dolar_cotizacion.loading
		},
		guardando() {
			return this.$store.state.dolar_cotizacion.guardando
		},
		error_al_guardar() {
			return this.$store.state.dolar_cotizacion.error_al_guardar
		},
		estado() {
			return this.$store.state.dolar_cotizacion.estado
		},
		seleccion_actual() {
			return this.$store.state.dolar_cotizacion.seleccion_actual
		},
		valor_dolar_actual() {
			return this.$store.state.dolar_cotizacion.valor_dolar_actual
		},
		comparacion() {
			return this.$store.state.dolar_cotizacion.comparacion
		},
		hubo_error_de_proveedor() {
			return this.$store.getters['dolar_cotizacion/hubo_error_de_proveedor']
		},
		nunca_eligio() {
			return this.$store.getters['dolar_cotizacion/nunca_eligio']
		},
		varia_bajo_umbral() {
			return this.$store.getters['dolar_cotizacion/varia_bajo_umbral']
		},
		mensaje_de_error() {
			let error = this.$store.state.dolar_cotizacion.error
			if (error && error.mensaje) {
				return error.mensaje
			}
			return 'No pudimos consultar las cotizaciones.'
		},
		/**
		 * No hay medición.
		 *
		 * Cubre los dos casos en los que el backend devuelve `comparacion` en null con el
		 * proveedor andando: el valor cargado a mano sin referencia (E8), y la referencia
		 * guardada que no sirve para medir (valor en 0 o nulo). Los dos terminan en la misma
		 * pantalla porque los dos se resuelven igual: eligiendo una referencia.
		 *
		 * 🔴 No vuelve a preguntar por `estado` ni por `seleccion_actual`, y no es un olvido:
		 * en el template se evalúa DESPUÉS del proveedor caído y del "nunca eligió", así que
		 * acá ya solo queda decidir si hay medición o no. Al ser la rama terminal de "no hay",
		 * la rama que sí muestra números no puede alcanzarse nunca con `comparacion` en null
		 * -- que es la única forma de que este modal no reviente leyendo una medición que no
		 * existe.
		 */
		sin_medicion() {
			return !this.comparacion
		},
		texto_sin_medicion() {
			if (this.seleccion_actual && this.seleccion_actual.origen === 'manual') {
				return 'Cargaste ' + this.price(this.valor_dolar_actual) + ' a mano. Para poder '
					+ 'avisarte cuando cambie, elegí contra qué cotización querés compararlo.'
			}
			return 'No pudimos comparar tu cotización con la de hoy porque la referencia que '
				+ 'tenemos guardada no sirve para medir. Elegí contra qué cotización querés '
				+ 'compararla.'
		},
		/**
		 * Si se ofrece adoptar el valor de hoy.
		 *
		 * 🔴 Con la cotización quieta no se ofrece: no hay nada que adoptar, y un botón que
		 * promete un cambio que no existe hace dudar de si el número de arriba está bien.
		 */
		ofrece_usar() {
			return !!this.comparacion
				&& Number(this.comparacion.variacion_porcentaje) !== 0
		},
		texto_referencia() {
			if (!this.comparacion) {
				return ''
			}
			let nombre = this.nombre_de_casa(this.comparacion.casa)
			if (this.seleccion_actual && this.seleccion_actual.origen === 'manual') {
				return 'Referencia: ' + nombre + ' · ' + this.comparacion.punta
			}
			return nombre + ' · ' + this.comparacion.punta
		},
		/**
		 * La variación, dicha con todas las letras en los tres casos.
		 *
		 * 🔴 Por debajo del umbral también se dice el número. El umbral decide si el modal
		 * aparece solo al iniciar sesión, no lo que se le contesta al que vino a preguntar.
		 */
		texto_variacion() {
			if (!this.comparacion) {
				return ''
			}
			if (!this.ofrece_usar) {
				return 'Tu cotización está al día.'
			}
			if (this.varia_bajo_umbral) {
				return 'Varió ' + this.porcentaje_corto(this.comparacion.variacion_porcentaje)
					+ ', por debajo de tu umbral de ' + this.porcentaje_corto(this.variacion_minima) + '.'
			}
			let subio = Number(this.comparacion.variacion_porcentaje) > 0
			return (subio ? 'Subió ' : 'Bajó ')
				+ this.price(Math.abs(Number(this.comparacion.diferencia)))
				+ ' (' + this.porcentaje_fijo(this.comparacion.variacion_porcentaje) + ')'
		},
		/**
		 * Un solo acento de color en todo el modal, y solo cuando hay movimiento que mostrar.
		 */
		clase_de_variacion() {
			if (!this.ofrece_usar || this.varia_bajo_umbral) {
				return ''
			}
			return Number(this.comparacion.variacion_porcentaje) > 0 ? 'is-subio' : 'is-bajo'
		},
		/**
		 * Cuándo fue la última vez que el usuario tocó esto, y con qué palabras según cómo lo
		 * haya hecho. Se formatea con los helpers del sistema y nunca cortando el string a
		 * mano.
		 */
		texto_de_cuando() {
			if (!this.seleccion_actual || !this.seleccion_actual.actualizada_at) {
				return ''
			}
			let cuando = 'el ' + this.date(this.seleccion_actual.actualizada_at)
				+ ' a las ' + this.hour(this.seleccion_actual.actualizada_at) + '.'
			if (this.seleccion_actual.origen === 'manual') {
				return 'Cargaste ' + this.price(this.valor_dolar_actual) + ' a mano ' + cuando
			}
			return 'Actualizaste la cotización ' + cuando
		},
		/**
		 * Si las preferencias del state son las del comercio y no los defaults del store.
		 *
		 * @returns {Boolean}
		 */
		preferencias_cargadas() {
			return this.$store.state.dolar_cotizacion.preferencias_cargadas
		},
		puede_guardar() {
			if (!this.seleccion.origen) {
				return false
			}
			/*
			 * 🔴 Con el proveedor caído lo ÚNICO guardable es una cotización manual.
			 *
			 * Sin esta rama, el botón primario de esa pantalla arrancaba habilitado en cuanto el
			 * comercio traía una selección preestablecida (que llega igual, porque es dato local),
			 * y el POST estaba garantizado a devolver 409: no se puede guardar "el blue venta" sin
			 * saber cuánto vale. Como la caché solo guarda éxitos, reintentar daba 409 de nuevo,
			 * indefinidamente. Un botón que no puede funcionar nunca no se ofrece habilitado.
			 */
			if (this.hubo_error_de_proveedor && this.seleccion.origen !== 'manual') {
				return false
			}
			/*
			 * `casa` y `punta` se exigen en los DOS caminos, manual incluido: el backend las pide
			 * required siempre. Antes el manual solo miraba el valor, así que un dato incompleto
			 * llegaba al POST con el botón habilitado y volvía 422.
			 */
			if (!this.seleccion.casa || !this.seleccion.punta) {
				return false
			}
			if (this.seleccion.origen === 'manual') {
				return Number(this.seleccion.valor_manual) > 0
			}
			return true
		},
		preferencias_cambiaron() {
			let estado = this.$store.state.dolar_cotizacion
			return this.avisar_cambios !== estado.avisar_cambios
				|| Number(this.variacion_minima) !== Number(estado.variacion_minima)
		},
	},
	methods: {
		al_abrir() {
			let self = this
			this.$store.commit('dolar_cotizacion/set_error_al_guardar', null)
			this.mostrar_lista = false
			this.sincronizar_desde_el_store()
			this.$store.dispatch('dolar_cotizacion/consultar', { silencioso: false })
			.then(() => {
				self.sincronizar_desde_el_store()
			})
		},
		al_cerrar() {
			/*
			 * `abierto_desde` vuelve a su valor común. Si quedara en 'login', la próxima vez
			 * que el usuario lo abra desde Configuración el historial diría que se lo mostró
			 * el sistema al iniciar sesión, que es falso.
			 */
			this.$store.commit('dolar_cotizacion/set_abierto_desde', 'configuracion')
			this.$store.commit('dolar_cotizacion/set_error_al_guardar', null)
			this.mostrar_lista = false
			this.cerrando = false
		},
		/**
		 * Cierra el modal marcando primero que se está yendo, para que la transición de
		 * salida no muestre un contenido distinto del que el usuario acaba de dejar.
		 *
		 * @returns {void}
		 */
		cerrar() {
			this.cerrando = true
			this.$bvModal.hide('cotizacion-dolar')
		},
		reintentar() {
			this.$store.dispatch('dolar_cotizacion/consultar', { silencioso: false })
		},
		/**
		 * Copia al formulario lo que dice el store. Se llama al abrir y otra vez cuando llega
		 * la respuesta: mientras se está cargando no hay formulario en pantalla, así que no
		 * puede pisar nada que el usuario haya tipeado.
		 *
		 * @returns {void}
		 */
		sincronizar_desde_el_store() {
			let estado = this.$store.state.dolar_cotizacion
			this.avisar_cambios = estado.avisar_cambios
			this.variacion_minima = estado.variacion_minima
			this.seleccion = this.seleccion_inicial()
		},
		/**
		 * La selección con la que arranca el formulario, sacada de lo que ya está guardado.
		 *
		 * 🔴 Con origen a mano el valor que se muestra es `users.dollar` (el que está vigente
		 * en la cuenta) y NO `seleccion_actual.valor`, que es cuánto valía la REFERENCIA en
		 * el momento de elegirla. Son dos números distintos justamente en este caso, y
		 * confundirlos le cambiaría el dólar al comercio sin que lo pida.
		 *
		 * @returns {Object}
		 */
		seleccion_inicial() {
			let estado = this.$store.state.dolar_cotizacion
			let actual = estado.seleccion_actual
			if (!actual || !actual.origen) {
				return {
					origen: null,
					casa: CASA_POR_DEFAULT,
					punta: PUNTA_POR_DEFAULT,
					valor_manual: null,
				}
			}
			/*
			 * 🔴 `casa` y `punta` NUNCA salen de acá en null, aunque en base lo estén.
			 *
			 * Los selects de referencia muestran "Blue / venta" por default, pero lo resolvían
			 * adentro de su getter: la pantalla mostraba una cosa y el dato seguía en null. Como
			 * `b-form-select` no emite al montarse, ese null viajaba tal cual en el POST contra una
			 * validación que las pide required, y el Guardar devolvía 422 SIEMPRE.
			 *
			 * A quién le pegaba: al comercio que editó "Valor dolar" a mano y quedó sin referencia
			 * —y por lo tanto sin avisos—, para quien esta pantalla es la única salida. La salida
			 * estaba tapiada, y el único síntoma era un error en inglés.
			 *
			 * La regla que deja: lo que el formulario muestra por default tiene que estar en el
			 * dato, no calculado al vuelo en la vista. Si no, promete algo que no manda.
			 */
			return {
				origen: actual.origen,
				casa: actual.casa || CASA_POR_DEFAULT,
				punta: actual.punta || PUNTA_POR_DEFAULT,
				valor_manual: actual.origen === 'manual' ? estado.valor_dolar_actual : null,
			}
		},
		/**
		 * Adoptar la cotización de hoy de la misma casa y punta que ya venía usando.
		 *
		 * El origen pasa a ser la casa de la referencia incluso si venía de un valor cargado
		 * a mano: aceptar el número de la casa ES elegir esa casa, y el backend rechaza con
		 * 422 cualquier origen preestablecido cuya casa no sea él mismo.
		 *
		 * @returns {void}
		 */
		usar_la_de_hoy() {
			this.enviar({
				origen: this.comparacion.casa,
				casa: this.comparacion.casa,
				punta: this.comparacion.punta,
				valor_manual: null,
			})
		},
		guardar_seleccion() {
			this.enviar({
				origen: this.seleccion.origen,
				casa: this.seleccion.casa,
				punta: this.seleccion.punta,
				valor_manual: this.seleccion.origen === 'manual'
					? Number(this.seleccion.valor_manual)
					: null,
			})
		},
		/**
		 * Manda el POST y cierra SOLO si volvió una respuesta.
		 *
		 * E10 y E11 son el mismo camino con dos finales: con respuesta, el modal se cierra y
		 * el toast lo arma el backend con lo que manda en `notifications`; sin respuesta, el
		 * modal se queda abierto con el mensaje del error a la vista.
		 *
		 * @param {Object} seleccion origen, casa, punta y valor_manual ya resueltos.
		 * @returns {void}
		 */
		enviar(seleccion) {
			let self = this
			let payload = {
				origen: seleccion.origen,
				casa: seleccion.casa,
				punta: seleccion.punta,
				valor_manual: seleccion.valor_manual,
				disparo: this.$store.state.dolar_cotizacion.abierto_desde,
			}

			/*
			 * 🔴 Las preferencias viajan SOLO si las cargamos de verdad del backend.
			 *
			 * Si el GET falló a nivel de red, `avisar_cambios` y `variacion_minima` quedaron en
			 * los defaults del store (true / 1), y en esa pantalla el checkbox y el umbral ni se
			 * dibujan. Mandarlos igual pisaba con esos defaults las preferencias reales del
			 * comercio: el que había apagado el aviso y puesto 5% lo veía volver a 1% y prendido,
			 * sin haber tocado nada. El backend ahora los toma como opcionales, así que no
			 * mandarlos es exactamente "no los cambies".
			 */
			if (this.preferencias_cargadas) {
				payload.avisar_cambios = !!this.avisar_cambios
				payload.variacion_minima = Number(this.variacion_minima)
			}

			this.$store.dispatch('dolar_cotizacion/guardar', payload)
			.then(respuesta => {
				if (!respuesta) {
					return
				}
				self.cerrar()
			})
		},
		/**
		 * Cerrar sin cambiar el dólar.
		 *
		 * Si el usuario apagó el aviso o movió el umbral, eso sí se guarda antes de cerrar:
		 * "ahora no, y no me molestes más" es un pedido concreto y perderlo obligaría a
		 * repetirlo en cada arranque. Si el guardado falla, el modal se queda abierto con el
		 * error: una preferencia que no se guardó y parece guardada vuelve sola en el próximo
		 * login y nadie entiende por qué.
		 *
		 * @returns {void}
		 */
		ahora_no() {
			let self = this

			/*
			 * 🔴 El valor que el usuario acaba de ver y decidió no adoptar. Se manda para que el
			 * arranque no le repita el MISMO aviso en cada login y en cada F5: la referencia solo
			 * se mueve cuando acepta, así que sin esto el modal volvía idéntico para siempre.
			 * Solo aplica si hubo medición de verdad; si no la hubo, no hay nada que posponer.
			 */
			let pospuesto_valor = this.comparacion ? Number(this.comparacion.valor_nuevo) : null

			/*
			 * Se guarda si cambió alguna preferencia O si hay algo que posponer. Antes solo miraba
			 * las preferencias, así que el "Ahora no" del caso más común no dejaba ningún rastro.
			 */
			if (!this.preferencias_cambiaron && !pospuesto_valor) {
				this.cerrar()
				return
			}
			this.$store.dispatch('dolar_cotizacion/guardar_preferencias', {
				avisar_cambios: !!this.avisar_cambios,
				variacion_minima: Number(this.variacion_minima),
				pospuesto_valor: pospuesto_valor,
			})
			.then(respuesta => {
				if (!respuesta) {
					return
				}
				self.cerrar()
			})
		},
		nombre_de_casa(clave) {
			let nombres = {
				oficial: 'Oficial',
				blue: 'Blue',
				mep: 'MEP',
			}
			return nombres[clave] || clave
		},
		/**
		 * Porcentaje con dos decimales y su signo: '1,30%', '-0,78%'.
		 *
		 * @param {Number|String} valor
		 * @returns {String}
		 */
		porcentaje_fijo(valor) {
			return (Number(valor) || 0).toFixed(2).replace('.', ',') + '%'
		},
		/**
		 * Porcentaje sin signo y sin ceros al final: '0,4%', '1%'. Es el que se usa en las
		 * frases, donde "varió 1,00%" se lee peor que "varió 1%".
		 *
		 * @param {Number|String} valor
		 * @returns {String}
		 */
		porcentaje_corto(valor) {
			let texto = Math.abs(Number(valor) || 0).toFixed(2)
			texto = texto.replace(/0+$/, '').replace(/\.$/, '')
			return texto.replace('.', ',') + '%'
		},
	},
}
</script>
<style lang="sass">
// 480px y no los 500 que trae size="md": con el ancho de bootstrap la linea de los dos
// numeros queda demasiado suelta y el modal se lee como un formulario en vez de como una
// respuesta.
//
// Van DOS clases y no una, por lo mismo que documenta el encabezado de _modals.sass: cada
// archivo .sass del proyecto arrastra bootstrap entero por el @import de _custom.scss, asi
// que la ultima copia de bootstrap queda despues en la hoja final y con una sola clase
// `.modal-dialog` le gana el empate.
.modal-dialog.cotizacion-dolar-dialog
	max-width: 480px

.cotizacion-dolar
	&__cargando
		display: flex
		justify-content: center
		padding: 30px 0

	&__titulo-estado
		font-size: 20px
		font-weight: 600
		color: var(--color-text-primary)
		margin-bottom: 6px

	&__referencia
		font-size: 13px
		color: var(--color-text-secondary)
		margin-bottom: 6px

	// La linea de los dos numeros no envuelve nunca: partir "$1.540,00 -> $1.560,00" en dos
	// renglones rompe la lectura de un solo golpe, que es todo lo que este modal tiene que
	// lograr. En telefono se achica la tipografia en vez de dejar que envuelva.
	&__numeros
		display: flex
		align-items: baseline
		flex-wrap: nowrap
		gap: 10px
		font-size: 28px
		line-height: 1.2
		color: var(--color-text-primary)

	&__numero-viejo
		color: var(--color-text-secondary)

	&__numero-nuevo
		font-weight: 600

	&__flecha
		font-size: 20px
		color: var(--color-text-secondary)

	&__variacion
		font-size: 15px
		margin-top: 6px
		color: var(--color-text-primary)

	&__leyenda
		font-size: 13px
		color: var(--color-text-secondary)
		margin-top: 10px
		margin-bottom: 0

	&__acciones
		margin-top: 18px

	&__secundario
		display: block
		width: 100%
		margin-top: 6px
		color: var(--color-text-secondary)

	&__preferencias
		display: flex
		align-items: center
		justify-content: space-between
		gap: 12px
		margin-top: 18px
		font-size: 14px
		color: var(--color-text-primary)

	&__umbral
		display: flex
		align-items: center
		gap: 6px
		white-space: nowrap
		color: var(--color-text-secondary)

	&__umbral-input
		width: 80px

	&__separador
		border-top: 1px solid var(--color-border)
		margin: 18px 0 4px

	&__toggle
		display: flex
		align-items: center
		justify-content: space-between
		width: 100%
		padding: 6px 0
		font-size: 14px
		color: var(--color-text-primary)
		text-decoration: none

		&:hover, &:focus
			color: var(--color-text-primary)
			text-decoration: none

// El unico color del modal aparte del boton primario. Salen de los tokens que ya tiene el
// tema para estado bueno y estado malo, asi que andan igual en claro y en oscuro; un verde
// escrito a mano se apagaria sobre el fondo oscuro.
.cotizacion-dolar__variacion.is-subio
	color: var(--caja-abierta-acento)

.cotizacion-dolar__variacion.is-bajo
	color: var(--btn-peligro-texto)

@media (max-width: 576px)
	// Ancho completo con 16px de margen, y los numeros un escalon mas chicos para que la
	// linea entera siga entrando sin partirse.
	.modal-dialog.cotizacion-dolar-dialog
		max-width: none
		margin: 16px

	.cotizacion-dolar__numeros
		font-size: 24px
		gap: 8px

	.cotizacion-dolar__flecha
		font-size: 18px

	// El checkbox y el umbral se apilan: uno al lado del otro quedan apretados contra los
	// bordes y el input de porcentaje se espicha hasta no poder tocarse.
	.cotizacion-dolar__preferencias
		flex-direction: column
		align-items: flex-start
		gap: 8px
</style>
