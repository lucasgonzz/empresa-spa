<template>
	<!--
		Nombres parecidos de las columnas de relación del Excel (misión
		importacion-relaciones-parecidas, 8/10/2026): proveedor, categoría, subcategoría y marca en
		artículos; provincia, localidad, vendedor y lista de precios en clientes; localidad en
		proveedores.

		Antes de esta lista, "ACME" en el Excel con "Acme" cargado creaba un proveedor duplicado sin
		que nadie se enterara. Acá se pregunta TODO lo que se parece (decisión de Lucas): cada ítem
		ya viene con la opción que propuso el chequeo marcada, así que no tocar nada es seguir con la
		propuesta, y cualquier ítem se puede cambiar — incluso uno que solo difiere en mayúsculas.

		v-model = mapa { clave del ítem -> índice de la opción elegida }. La lógica de qué se ve y qué
		se manda vive en relaciones_parecidas.js, compartida con Index.vue.
	-->
	<div
	v-if="items_validos.length > 0"
	class="ai-import-relaciones">

		<div
		class="ai-import-relaciones__encabezado"
		data-testid="ai-import-relaciones-lista">
			<p
			v-if="con_titulo"
			class="ai-import-relaciones__titulo">
				Nombres parecidos
				<span class="ai-import-relaciones__contador">{{ numero_es(items_visibles.length) }}</span>
			</p>
			<p class="ai-import-relaciones__intro">
				Encontramos en el archivo nombres parecidos a otros que ya tenés cargados, o parecidos entre sí.
				Revisalos antes de seguir para no crear duplicados: ya dejamos marcada la opción que nos parece correcta.
			</p>
		</div>

		<!-- Sin IA: el chequeo cayó a la parte determinista y lo que queda es "posible", no "seguro". -->
		<b-alert
		v-if="ia_no_consultada"
		show
		variant="warning"
		class="ai-import-relaciones__aviso m-t-10 m-b-0"
		data-testid="ai-import-relaciones-sin-ia">
			<i class="icon-alert-triangle m-r-5"></i>
			No pudimos consultar a la IA, así que estos nombres no se revisaron a fondo.
			Revisá los nombres parecidos antes de seguir.
		</b-alert>

		<!--
			Acciones masivas: solo sobre las pendientes (las confirmadas en importaciones anteriores se
			cambian de a una, a propósito: ya son una decisión del comercio). Con un único ítem no
			aportan nada sobre sus propios botones, así que no se muestran.
		-->
		<div
		v-if="items_pendientes.length > 1"
		class="ai-import-relaciones__acciones">
			<b-button
			size="sm"
			variant="outline-secondary"
			data-testid="ai-import-relaciones-usar-todas"
			:disabled="!hay_para_usar_en_todas"
			@click="aplicar_a_todas('existente')">
				Usar el existente en todas
			</b-button>
			<b-button
			size="sm"
			variant="outline-secondary"
			data-testid="ai-import-relaciones-crear-todas"
			@click="aplicar_a_todas('nuevo')">
				Crear todas como nuevas
			</b-button>
		</div>

		<!--
			La lista tiene su propio scroll (tope de alto) para que con decenas de ítems el encabezado,
			las acciones masivas y los botones del paso sigan a mano. Los títulos de grupo quedan
			pegados arriba mientras se scrollea.
		-->
		<div class="ai-import-relaciones__lista">

			<p
			v-if="items_pendientes.length === 0 && cantidad_ocultos === 0"
			class="ai-import-relaciones__vacio">
				No hay nombres nuevos para revisar: los que encontramos ya los confirmaste en importaciones anteriores.
			</p>

			<div
			v-for="seccion in secciones"
			:key="seccion.id"
			class="ai-import-relaciones__seccion">

				<b-button
				v-if="seccion.plegable"
				variant="link"
				class="ai-import-relaciones__plegable"
				data-testid="ai-import-relaciones-recordadas"
				:aria-expanded="recordadas_abiertas ? 'true' : 'false'"
				:aria-controls="id_recordadas"
				@click="recordadas_abiertas = !recordadas_abiertas">
					<i
					class="bi m-r-5"
					:class="recordadas_abiertas ? 'bi-chevron-down' : 'bi-chevron-right'"></i>
					Confirmadas en importaciones anteriores ({{ numero_es(items_recordados.length) }})
				</b-button>

				<b-collapse
				:id="seccion.plegable ? id_recordadas : null"
				:visible="!seccion.plegable || recordadas_abiertas">

					<div
					v-for="grupo in seccion.grupos"
					:key="seccion.id + '-' + grupo.tipo"
					class="ai-import-relaciones__grupo">

						<p class="ai-import-relaciones__grupo-titulo">
							{{ grupo.titulo }}
							<span class="ai-import-relaciones__grupo-cantidad">{{ numero_es(grupo.items.length) }}</span>
						</p>

						<div
						v-for="item in grupo.items"
						:key="item.clave"
						class="ai-import-relaciones__item"
						:data-clave="item.clave">

							<div class="ai-import-relaciones__item-cabecera">
								<span class="ai-import-relaciones__valor">«{{ item.valor }}»</span>
								<span
								v-if="texto_filas(item)"
								class="ai-import-relaciones__filas">
									{{ texto_filas(item) }}
								</span>
							</div>

							<small
							v-if="texto_padre(item)"
							class="ai-import-relaciones__detalle">
								{{ texto_padre(item) }}
							</small>

							<small
							v-if="item.explicacion"
							class="ai-import-relaciones__detalle">
								{{ item.explicacion }}
							</small>

							<div
							class="ai-import-relaciones__opciones"
							role="radiogroup"
							:aria-label="'Qué es «' + item.valor + '»'">
								<b-form-radio
								v-for="opcion in opciones_mostrables(item)"
								:key="item.clave + '-' + opcion.indice"
								:name="'ai-import-relacion-' + item.clave"
								:value="opcion.indice"
								:checked="elegido(item)"
								:data-testid="'ai-import-relaciones-opcion-' + item.clave + '-' + opcion.indice"
								class="ai-import-relaciones__opcion"
								@change="elegir(item, opcion.indice)">
									{{ texto_opcion(item, opcion.opcion) }}
								</b-form-radio>
							</div>

						</div>

					</div>

				</b-collapse>

			</div>

			<p
			v-if="cantidad_ocultos > 0"
			class="ai-import-relaciones__vacio">
				{{ texto_ocultos }}
			</p>

		</div>

	</div>
</template>

<script>
import {
	TIPOS,
	definicion_de_tipo,
	items_de,
	indice_elegido,
	item_visible,
	indice_para_accion_masiva,
	opcion_es_valida,
} from './relaciones_parecidas'

export default {

	props: {
		/*
		 * `relaciones_parecidas` tal como llega en el resultado de get-recomendacion:
		 * { ia_consultada, items: [...] }. Null o sin ítems: el componente no dibuja nada.
		 */
		relaciones: {
			type: Object,
			default: null,
		},

		/* Mapa { clave del ítem -> índice de la opción elegida }. Es el v-model. */
		value: {
			type: Object,
			default: function() {
				return {}
			},
		},

		/*
		 * Si se dibuja el título "Nombres parecidos". En clientes y proveedores el paso entero se
		 * llama así (el título del modal ya lo dice) y repetirlo arriba de la lista sobra.
		 */
		con_titulo: {
			type: Boolean,
			default: true,
		},
	},

	data() {
		return {
			/* El grupo de las confirmadas en importaciones anteriores arranca plegado (decisión de Lucas). */
			recordadas_abiertas: false,
		}
	},

	computed: {

		/* Ítems con una forma que se puede mostrar (ver items_de). */
		items_validos() {
			return items_de(this.relaciones)
		},

		/*
		 * Ítems que se muestran: todos menos las subcategorías / localidades cuyo padre el usuario
		 * resolvió distinto de lo que supuso el chequeo (ver item_visible).
		 */
		items_visibles() {
			let self = this
			return self.items_validos.filter(function(item) {
				return item_visible(item, self.items_validos, self.value)
			})
		},

		/* Lo que hay que revisar ahora. */
		items_pendientes() {
			return this.items_visibles.filter(function(item) {
				return item.motivo !== 'recordado'
			})
		},

		/* Lo que el comercio ya confirmó en una importación anterior: va plegado. */
		items_recordados() {
			return this.items_visibles.filter(function(item) {
				return item.motivo === 'recordado'
			})
		},

		/* Cuántos ítems quedaron ocultos por la decisión tomada sobre su categoría o provincia. */
		cantidad_ocultos() {
			return this.items_validos.length - this.items_visibles.length
		},

		/*
		 * Aviso de los ocultos, nombrando al padre que corresponde: "categoría" si son todas
		 * subcategorías, "provincia" si son todas localidades.
		 */
		texto_ocultos() {
			let self = this
			let n = self.cantidad_ocultos
			let tipos_ocultos = self.items_validos.filter(function(item) {
				return self.items_visibles.indexOf(item) === -1
			}).map(function(item) {
				return item.tipo
			})

			let padre = 'la categoría o la provincia'
			if (tipos_ocultos.every(function(tipo) { return tipo === 'sub_categoria' })) {
				padre = 'la categoría'
			} else if (tipos_ocultos.every(function(tipo) { return tipo === 'localidad' })) {
				padre = 'la provincia'
			}

			if (n === 1) {
				return 'Dejamos de mostrar un nombre porque cambiaste ' + padre + ' a la que pertenece: se va a cargar como en cualquier importación.'
			}
			return 'Dejamos de mostrar ' + self.numero_es(n) + ' nombres porque cambiaste ' + padre + ' a la que pertenecen: se van a cargar como en cualquier importación.'
		},

		/*
		 * Secciones de la lista: las pendientes, abiertas, y las recordadas, plegables. Una sección
		 * sin ítems no se arma.
		 */
		secciones() {
			let secciones = []
			if (this.items_pendientes.length > 0) {
				secciones.push({ id: 'pendientes', plegable: false, grupos: this.agrupar(this.items_pendientes) })
			}
			if (this.items_recordados.length > 0) {
				secciones.push({ id: 'recordadas', plegable: true, grupos: this.agrupar(this.items_recordados) })
			}
			return secciones
		},

		/* True cuando la parte de IA del chequeo no corrió (cayó, o tardó): se avisa. */
		ia_no_consultada() {
			return !!this.relaciones && this.relaciones.ia_consultada === false
		},

		/* "Usar el existente en todas" solo tiene sentido si alguna pendiente tiene un existente que ofrecer. */
		hay_para_usar_en_todas() {
			return this.items_pendientes.some(function(item) {
				return indice_para_accion_masiva(item, 'existente') !== null
			})
		},

		/* id del colapsable de las recordadas (para aria-controls). */
		id_recordadas() {
			return 'ai-import-relaciones-recordadas-' + this._uid
		},
	},

	methods: {

		/**
		 * Agrupa ítems por tipo, en el orden de TIPOS; un tipo desconocido va al final.
		 *
		 * @param {Array} items
		 * @returns {Array} [{ tipo, titulo, items }]
		 */
		agrupar(items) {
			let grupos = []
			let por_tipo = {}

			items.forEach(function(item) {
				if (!por_tipo[item.tipo]) {
					por_tipo[item.tipo] = []
				}
				por_tipo[item.tipo].push(item)
			})

			TIPOS.forEach(function(definicion) {
				if (por_tipo[definicion.tipo]) {
					grupos.push({ tipo: definicion.tipo, titulo: definicion.titulo, items: por_tipo[definicion.tipo] })
					delete por_tipo[definicion.tipo]
				}
			})

			Object.keys(por_tipo).forEach(function(tipo) {
				grupos.push({ tipo: tipo, titulo: definicion_de_tipo(tipo).titulo, items: por_tipo[tipo] })
			})

			return grupos
		},

		/**
		 * Opciones del ítem que se pueden mostrar, con su índice original (el índice es lo que viaja
		 * en el v-model y tiene que coincidir con el de `opciones` de la API).
		 *
		 * @param {Object} item
		 * @returns {Array} [{ opcion, indice }]
		 */
		opciones_mostrables(item) {
			let mostrables = []
			item.opciones.forEach(function(opcion, indice) {
				if (opcion_es_valida(opcion)) {
					mostrables.push({ opcion: opcion, indice: indice })
				}
			})
			return mostrables
		},

		/* Índice elegido del ítem (o el sugerido, si todavía no se tocó). */
		elegido(item) {
			return indice_elegido(item, this.value)
		},

		/**
		 * Elige una opción para un ítem. El mapa se reemplaza entero (no se muta la prop).
		 *
		 * @param {Object} item
		 * @param {Number} indice
		 */
		elegir(item, indice) {
			let decisiones = Object.assign({}, this.value)
			decisiones[item.clave] = indice
			this.$emit('input', decisiones)
		},

		/**
		 * Acción masiva sobre todas las pendientes. Recorre también las ocultas (no las recordadas):
		 * si vuelven a aparecer porque el usuario cambió de nuevo su categoría, aparecen con la
		 * misma decisión masiva que el resto.
		 *
		 * @param {String} hacia 'existente' | 'nuevo'
		 */
		aplicar_a_todas(hacia) {
			let decisiones = Object.assign({}, this.value)

			this.items_validos.forEach(function(item) {
				if (item.motivo === 'recordado') {
					return
				}
				let indice = indice_para_accion_masiva(item, hacia)
				if (indice !== null) {
					decisiones[item.clave] = indice
				}
			})

			this.$emit('input', decisiones)
		},

		/**
		 * Texto de una opción, en lenguaje de comerciante y concordando en género con el tipo
		 * ("que ya está cargada" para una categoría, "cargado" para un proveedor).
		 *
		 * @param {Object} item
		 * @param {Object} opcion
		 * @returns {String}
		 */
		texto_opcion(item, opcion) {
			let femenino = definicion_de_tipo(item.tipo).genero === 'f'

			if (opcion.accion === 'usar') {
				let nombre = opcion.nombre !== null && opcion.nombre !== undefined && opcion.nombre !== ''
					? opcion.nombre
					: (femenino ? 'la que ya existe' : 'el que ya existe')
				return 'Es «' + nombre + '», que ya está ' + (femenino ? 'cargada' : 'cargado')
			}

			if (opcion.accion === 'unir') {
				return 'Es ' + (femenino ? 'la misma' : 'el mismo') + ' que «' + opcion.con + '» (también '
					+ (femenino ? 'nueva' : 'nuevo') + '): crear ' + (femenino ? 'una sola' : 'uno solo')
			}

			/* crear */
			let uniones = item.opciones.filter(function(otra) {
				return otra && otra.accion === 'unir'
			}).length

			if (uniones === 1) {
				return 'Son ' + (femenino ? 'distintas' : 'distintos') + ': crear ' + (femenino ? 'las dos' : 'los dos')
			}
			if (uniones > 1) {
				return 'Es ' + (femenino ? 'otra distinta' : 'otro distinto') + ': crear «' + item.valor + '» aparte'
			}
			return 'Es ' + (femenino ? 'una nueva' : 'uno nuevo') + ': crear «' + item.valor + '»'
		},

		/**
		 * "en la categoría «Herramientas»" para una subcategoría, "en la provincia «Córdoba»" para
		 * una localidad. Vacío si el ítem no tiene padre.
		 *
		 * @param {Object} item
		 * @returns {String}
		 */
		texto_padre(item) {
			let definicion = definicion_de_tipo(item.tipo)
			if (!definicion.en_el_padre || item.padre === null || item.padre === undefined || item.padre === '') {
				return ''
			}
			return definicion.en_el_padre + ' «' + item.padre + '»'
		},

		/**
		 * En cuántas filas del Excel aparece el valor. Vacío si la API no lo informó.
		 *
		 * @param {Object} item
		 * @returns {String}
		 */
		texto_filas(item) {
			let filas = Number(item.filas)
			if (!filas || filas < 1) {
				return ''
			}
			return 'en ' + this.numero_es(filas) + (filas === 1 ? ' fila' : ' filas')
		},
	},
}
</script>

<style lang="sass">
/* Lista de nombres parecidos (misión importacion-relaciones-parecidas). Minimalista: una caja, grupos con título pegado, ítems separados por una línea. */
.ai-import-relaciones
	min-width: 0

.ai-import-relaciones__titulo
	display: flex
	align-items: center
	gap: 8px
	margin: 0 0 4px 0
	font-weight: 600
	font-size: 15px
	color: var(--color-text-primary, #343a40)

.ai-import-relaciones__contador
	display: inline-flex
	align-items: center
	justify-content: center
	min-width: 22px
	height: 20px
	padding: 0 7px
	border-radius: 10px
	font-size: 12px
	font-weight: 600
	background: rgba(0, 123, 255, 0.1)
	color: var(--color-primary, #007bff)

.ai-import-relaciones__intro
	margin: 0
	font-size: 13px
	line-height: 1.45
	color: var(--color-text-secondary, #6c757d)

.ai-import-relaciones__aviso
	font-size: 13px

.ai-import-relaciones__acciones
	display: flex
	flex-wrap: wrap
	gap: 8px
	margin-top: 12px

/* Tope de alto con scroll propio: con decenas de ítems, el resto del paso sigue a mano. */
.ai-import-relaciones__lista
	margin-top: 12px
	max-height: 60vh
	overflow-y: auto
	border: 1px solid var(--color-border, rgba(0, 0, 0, 0.1))
	border-radius: 10px

.ai-import-relaciones__vacio
	margin: 0
	padding: 10px 14px
	font-size: 13px
	color: var(--color-text-secondary, #6c757d)

.ai-import-relaciones__seccion + .ai-import-relaciones__seccion
	border-top: 1px solid var(--color-border, rgba(0, 0, 0, 0.1))

/* Título de grupo pegado arriba mientras se scrollea la lista. */
.ai-import-relaciones__grupo-titulo
	position: sticky
	top: 0
	z-index: 1
	display: flex
	align-items: center
	gap: 6px
	margin: 0
	padding: 7px 14px
	font-size: 12px
	font-weight: 600
	letter-spacing: 0.02em
	text-transform: uppercase
	color: var(--color-text-secondary, #6c757d)
	background: var(--bg-section, #f8f9fa)
	border-bottom: 1px solid var(--color-border-secondary, rgba(0, 0, 0, 0.06))

.ai-import-relaciones__grupo-cantidad
	font-weight: 500
	opacity: 0.8

.ai-import-relaciones__item
	padding: 10px 14px
	border-bottom: 1px solid var(--color-border-secondary, rgba(0, 0, 0, 0.06))

	&:last-child
		border-bottom: none

.ai-import-relaciones__item-cabecera
	display: flex
	flex-wrap: wrap
	align-items: baseline
	gap: 2px 10px

.ai-import-relaciones__valor
	font-weight: 600
	font-size: 14px
	color: var(--color-text-primary, #343a40)
	word-break: break-word

.ai-import-relaciones__filas
	font-size: 12px
	color: var(--color-text-secondary, #6c757d)
	white-space: nowrap

.ai-import-relaciones__detalle
	display: block
	margin-top: 2px
	font-size: 12px
	line-height: 1.4
	color: var(--color-text-secondary, #6c757d)

.ai-import-relaciones__opciones
	margin-top: 6px

.ai-import-relaciones__opcion
	margin-bottom: 4px

	&:last-child
		margin-bottom: 0

	.custom-control-label
		font-size: 13px
		line-height: 1.45
		word-break: break-word

/* Botón que pliega / despliega las confirmadas en importaciones anteriores. */
.ai-import-relaciones__plegable
	display: flex
	align-items: center
	width: 100%
	padding: 10px 14px
	font-size: 13px
	font-weight: 600
	text-align: left
	text-decoration: none
	color: var(--color-text-primary, #343a40)

	&:hover,
	&:focus
		text-decoration: none
		background: var(--bg-section, #f8f9fa)
</style>
