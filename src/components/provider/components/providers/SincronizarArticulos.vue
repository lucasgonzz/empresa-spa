<template>
<!--
	Mision sincronizar-descuentos-proveedor (17/9/2026): desde la tabla de descuentos del
	proveedor, el boton "Sincronizar articulos" baja los descuentos de la ficha a los articulos
	de ese proveedor.

	Es el hermano de PropagarDescuentos.vue, pero no es lo mismo:

	- Aquel se dispara SOLO al guardar el proveedor y solo alcanza a los articulos que YA tienen
	esos descuentos copiados.
	- Este lo dispara el usuario a proposito y puede alcanzar a TODOS los articulos del proveedor,
	incluidos los que hoy no tienen ningun descuento.

	🔴 Dos cosas que no se copian de PropagarDescuentos.vue:

	1. NO se consulta la preferencia de la cuenta (users.aplicar_descuentos_proveedor_al_asignar).
	Esa preferencia sigue rigiendo todo lo automatico —alta de articulo, cambio de proveedor,
	masiva, import—, pero este boton es una accion explicita sobre un proveedor puntual y con los
	numeros a la vista. Gatearlo dejaria un boton mudo, que no hace nada y no explica que la causa
	es un tilde en otra pantalla (decision de Lucas, 17/9/2026).

	2. NO se espera el resultado. La sincronizacion corre en segundo plano, como una exportacion:
	el modo "todos" alcanza miles de articulos y en un request eso es un timeout a mitad de camino,
	con parte del catalogo sincronizado y parte no. El modal confirma, avisa que se esta procesando
	y se cierra; el aviso de fin llega por la notificacion global de siempre. Por eso mismo el
	toast NO puede decir "se actualizaron N articulos": todavia no se actualizo ninguno.
-->
<b-modal
title="Sincronizar los articulos de este proveedor"
hide-footer
size="lg"
id="sincronizar-descuentos-proveedor"
@hidden="reset">

	<div v-if="loading">
		<b-skeleton width="100%" height="20px" class="m-b-10"></b-skeleton>
		<b-skeleton width="80%" height="20px" class="m-b-10"></b-skeleton>
		<b-skeleton width="60%" height="20px"></b-skeleton>
	</div>

	<!--
		No hay con que sincronizar (el proveedor no tiene descuentos cargados) o no hay sobre que
		(no tiene ningun articulo). Se avisa adentro del modal y no callandose, porque aca el
		usuario apreto un boton a proposito: no pasar nada seria un boton roto. Y tampoco se le
		muestran los contadores, que serian todos cero y no explicarian nada.
	-->
	<div
	v-else-if="nada_que_sincronizar"
	class="text-center">
		<p
		v-if="!hay_descuentos_en_la_ficha"
		class="m-b-5">
			<strong>{{ nombre_proveedor }}</strong> no tiene descuentos cargados.
		</p>
		<p
		v-else
		class="m-b-5">
			<strong>{{ nombre_proveedor }}</strong> no tiene ningun articulo.
		</p>
		<p class="text-muted m-b-20">
			{{
				hay_descuentos_en_la_ficha
					? 'Asignale este proveedor a algun articulo y despues volve a sincronizar.'
					: 'Cargale al menos un descuento en la tabla de abajo y despues volve a sincronizar.'
			}}
		</p>
		<b-button
		variant="primary"
		@click="cerrar">
			Entendido
		</b-button>
	</div>

	<div v-else>

		<p class="m-b-20">
			Los articulos de <strong>{{ nombre_proveedor }}</strong> van a quedar con los
			descuentos que tiene hoy cargados el proveedor.
		</p>

		<!-- Que hay hoy, para que la decision se tome con el numero a la vista y no a ciegas -->
		<div class="sincronizar-bloque m-b-20">
			<p class="m-b-5">
				<strong>{{ total_articulos }}</strong>
				{{ total_articulos == 1 ? 'articulo de este proveedor' : 'articulos de este proveedor' }}.
			</p>
			<p
			v-if="sin_descuentos"
			class="text-muted m-b-5">
				{{ sin_descuentos }} {{ sin_descuentos == 1 ? 'no tiene ningun descuento' : 'no tienen ningun descuento' }}.
			</p>
			<p
			v-if="al_dia"
			class="text-muted m-b-5">
				{{ al_dia }} {{ al_dia == 1 ? 'ya esta al dia' : 'ya estan al dia' }}.
			</p>
			<p
			v-if="desactualizados"
			class="text-muted m-b-5">
				{{ desactualizados }} {{ desactualizados == 1 ? 'tiene descuentos que no coinciden con la ficha' : 'tienen descuentos que no coinciden con la ficha' }}.
			</p>
			<p
			v-if="editados_a_mano"
			class="text-muted m-b-0">
				{{ editados_a_mano }} {{ editados_a_mano == 1 ? 'tiene un descuento que editaste a mano' : 'tienen descuentos que editaste a mano' }}.
			</p>
		</div>

		<!-- El alcance: es la pregunta central de la ventana -->
		<div class="sincronizar-bloque m-b-20">
			<p class="m-b-10">
				<strong>
					¿Que articulos se sincronizan?
				</strong>
			</p>

			<b-form-radio
			class="m-b-10"
			value="solo_con_descuentos"
			v-model="alcance">
				Solo los que ya tienen estos descuentos
				<span class="d-block text-muted sincronizar-subtexto">
					Se actualizan {{ desactualizados }}
					{{ desactualizados == 1 ? 'articulo' : 'articulos' }}. Los otros no se tocan.
				</span>
			</b-form-radio>

			<b-form-radio
			class="m-b-0"
			value="todos"
			v-model="alcance">
				Todos los articulos de este proveedor
				<span class="d-block text-muted sincronizar-subtexto">
					Los {{ total_articulos }}
					{{ total_articulos == 1 ? 'articulo va a quedar' : 'articulos van a quedar' }}
					con los descuentos que tiene hoy el proveedor.
				</span>
			</b-form-radio>
		</div>

		<!-- El tilde solo aparece si hay algo que pisar: si no, es una pregunta sin objeto -->
		<div
		v-if="editados_a_mano"
		class="sincronizar-bloque m-b-20">
			<b-form-checkbox
			v-model="pisar_editados_a_mano">
				Actualizar tambien los que edite a mano
			</b-form-checkbox>
			<p class="text-muted m-l-25 m-b-0 m-t-5">
				Si lo activas, esos {{ editados_a_mano }} van a quedar con los descuentos del proveedor y se pierde el valor que les habias puesto.
			</p>
		</div>

		<!--
			🔴 Los articulos que tienen descuentos que NO salieron de la ficha, sino de una compra
			real o de un import de Excel. Solo aparecen en el modo "todos": el modo "solo los que
			ya tienen estos descuentos" nunca los alcanza.

			Son el punto delicado de la ventana, porque la opcion "agregar" DUPLICA el descuento y
			eso no se ve hasta que el precio ya cambio: los descuentos se aplican en cascada, no
			sumados. El texto lo dice con el numero, antes de elegir.
		-->
		<div
		v-if="mostrar_accion_sobre_compras"
		class="sincronizar-bloque sincronizar-bloque--alerta m-b-20">
			<p class="m-b-10">
				<strong>
					{{ con_descuentos_de_compra }}
					{{ con_descuentos_de_compra == 1 ? 'articulo tiene' : 'articulos tienen' }}
					descuentos que vinieron de una compra o de una importacion
				</strong>
			</p>

			<b-form-radio
			class="m-b-10"
			value="saltear"
			v-model="accion_sobre_compras">
				No tocarlos
				<span class="d-block text-muted sincronizar-subtexto">
					Esos {{ con_descuentos_de_compra }}
					{{ con_descuentos_de_compra == 1 ? 'articulo queda' : 'articulos quedan' }}
					como estan.
				</span>
			</b-form-radio>

			<b-form-radio
			class="m-b-10"
			value="pisar"
			v-model="accion_sobre_compras">
				Dejar solo los del proveedor
				<span class="d-block text-muted sincronizar-subtexto">
					Se reemplazan por los descuentos actuales del proveedor. La bonificacion que se
					habia negociado en esa compra se pierde.
				</span>
			</b-form-radio>

			<b-form-radio
			class="m-b-10"
			value="agregar"
			v-model="accion_sobre_compras">
				Sumar los del proveedor a los que ya tienen
				<span class="d-block text-danger sincronizar-subtexto">
					Los descuentos se aplican uno sobre otro, no se suman: un articulo de $1.000 con
					10% de la compra y 10% del proveedor queda en $810, no en $900.
				</span>
			</b-form-radio>

			<!--
				Sirve para mirar la lista antes de decidir, en vez de elegir a ciegas sobre un
				contador. Se procesa en segundo plano como cualquier exportacion del sistema: el
				modal no espera nada ni descarga nada, el excel llega por la notificacion de
				siempre.
			-->
			<btn-loader
			variant="outline-secondary"
			size="sm"
			:block="false"
			:loader="exportando"
			@clicked="exportar_conflictos"
			text="Exportar Excel"></btn-loader>
		</div>

		<!--
			El cierre de la ventana. Arriba, cada opcion explica LO SUYO; esto explica la
			combinacion que el usuario armo, que es otra cosa: alcance, el tilde de los editados a
			mano y que hacer con las compras son tres decisiones que se multiplican entre si, y
			sin este bloque el usuario tiene que sumarlas de cabeza mirando tres recuadros
			separados antes de apretar el boton.

			Se rearma solo al cambiar cualquier opcion, porque sale de un computed.
		-->
		<div class="sincronizar-bloque sincronizar-bloque--cierre m-b-20">
			<p class="m-b-10">
				<strong>
					Esto es lo que va a pasar
				</strong>
			</p>

			<!--
				La combinacion elegida no toca ningun articulo. Decirlo es la mitad del trabajo; la
				otra mitad es que el boton quede deshabilitado (ver mas abajo), porque si no el
				usuario aprieta, la ventana se cierra avisando que se esta procesando y no pasa
				nada: parece que el sistema trabajo y no hizo nada.
			-->
			<p
			v-if="no_toca_nada"
			class="text-muted m-b-0">
				Con estas opciones no se va a modificar ningun articulo.
			</p>

			<template v-else>
				<ul class="sincronizar-consecuencias m-b-10">
					<li
					v-for="(linea, index) in consecuencias"
					:key="index"
					:class="linea.grave ? 'text-danger' : 'text-muted'">
						{{ linea.texto }}
					</li>
				</ul>

				<!--
					🔴 La consecuencia mas importante y la que no estaba dicha en ningun lado de la
					ventana: al re-materializar los descuentos se recalcula el costo y con el el
					precio de venta. Un comercio que aprieta el boton creyendo que "ordena unos
					descuentos" y termina con los precios de su ecommerce movidos tiene razon en
					sentirse enganado por esta ventana.
				-->
				<p class="m-b-0">
					<strong>
						Sincronizar cambia el precio de venta de esos articulos.
					</strong>
					<span v-if="tiene_tienda_online">
						El precio nuevo se va a ver en tu tienda online.
					</span>
				</p>
			</template>
		</div>

		<div class="sincronizar-acciones">
			<b-button
			variant="outline-secondary"
			@click="cerrar">
				Cancelar
			</b-button>
			<btn-loader
			variant="primary"
			:block="false"
			:loader="saving"
			:disabled="no_toca_nada"
			@clicked="confirm"
			text="Sincronizar articulos"></btn-loader>
		</div>

	</div>

</b-modal>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'

// El evento del bus de $root que dispara esta ventana. Lo emite HasMany.vue a partir de la clave
// has_many.extra_button declarada en src/models/provider.js, con el proveedor como payload.
const EVENTO_ABRIR = 'sincronizar-descuentos-proveedor'

// El id del b-modal. Coincide con el nombre del evento por casualidad de nombre, no por regla:
// son dos cosas distintas y se nombran aparte para que no se acoplen.
const MODAL_ID = 'sincronizar-descuentos-proveedor'

export default {
	components: {
		BtnLoader,
	},
	data() {
		return {
			provider_id: null,
			nombre_proveedor: '',

			loading: false,
			saving: false,
			exportando: false,

			// Lo que devuelve el preview
			hay_descuentos_en_la_ficha: true,
			total_articulos: 0,
			sin_descuentos: 0,
			al_dia: 0,
			desactualizados: 0,
			editados_a_mano: 0,
			con_descuentos_de_compra: 0,

			/*
				El default es el alcance que NO toca articulos que hoy no tienen nada: es el
				comportamiento que el sistema ya tenia. "Todos" es la opcion nueva y la mas
				grande, asi que se elige a proposito, no por venir marcada.
			*/
			alcance: 'solo_con_descuentos',

			// Por defecto NO se pisan: un descuento editado a mano es una decision comercial
			pisar_editados_a_mano: false,

			// Por defecto no se tocan los que traen descuentos de una compra o un import
			accion_sobre_compras: 'saltear',
		}
	},
	computed: {
		/*
			Los dos casos en los que la ventana no tiene nada que preguntar: el proveedor no tiene
			descuentos cargados (no hay CON que sincronizar) o no tiene ningun articulo (no hay
			SOBRE que). En los dos, la ventana avisa en una linea en vez de mostrar una lista de
			contadores en cero y dos opciones que no cambian nada.
		*/
		nada_que_sincronizar() {
			return !this.hay_descuentos_en_la_ficha || !this.total_articulos
		},
		/*
			Los descuentos que vinieron de una compra o de un import solo estan en juego en el modo
			"todos": el otro modo ni los mira. Preguntarlo cuando no aplica seria una decision que
			el usuario toma y el sistema despues ignora.
		*/
		mostrar_accion_sobre_compras() {
			return this.con_descuentos_de_compra > 0 && this.alcance == 'todos'
		},
		/*
			La cuenta tiene el ecommerce. Sale de la mecanica de extensiones del sistema
			(hasExtencion vive en el mixin global de src/mixins/generals.js, el mismo que resuelve
			los `if_has_extencion` de los modelos). Sin ecommerce, hablarle al usuario de "tu
			tienda online" seria nombrarle algo que no tiene.
		*/
		tiene_tienda_online() {
			return !!this.hasExtencion('online')
		},
		/*
			Lo que va a pasar con la combinacion que el usuario tiene elegida AHORA. Cada linea
			lleva:
			  - `grave`: la pinta en rojo. Solo para las dos que destruyen o distorsionan un dato:
			    perder una bonificacion negociada en una compra, y aplicar dos descuentos en
			    cascada (que baja el costo mas de lo que dice la ficha).
			  - `cambia`: si esa linea implica tocar articulos. De ahi sale `no_toca_nada`, y por
			    eso se deriva de las lineas en vez de sumar los contadores: los grupos del preview
			    podrian solaparse y una suma daria un numero que no es.
		*/
		consecuencias() {
			let lineas = []
			let es_todos = this.alcance == 'todos'

			// Los que hoy no tienen ningun descuento: solo los alcanza el modo "todos"
			if (es_todos && this.sin_descuentos) {
				lineas.push({
					texto: this.frase(
						this.sin_descuentos,
						'articulo va a recibir estos descuentos por primera vez.',
						'articulos van a recibir estos descuentos por primera vez.'
					),
					grave: false,
					cambia: true,
				})
			}

			// Los que tienen descuentos de la ficha pero con otros valores: se actualizan siempre
			if (this.desactualizados) {
				lineas.push({
					texto: this.frase(
						this.desactualizados,
						'articulo va a quedar con los descuentos actualizados.',
						'articulos van a quedar con los descuentos actualizados.'
					),
					grave: false,
					cambia: true,
				})
			}

			// Los editados a mano dependen del tilde, no del alcance
			if (this.editados_a_mano) {
				if (this.pisar_editados_a_mano) {
					lineas.push({
						texto: this.frase(
							this.editados_a_mano,
							'articulo que editaste a mano se va a pisar.',
							'articulos que editaste a mano se van a pisar.'
						),
						grave: false,
						cambia: true,
					})
				} else {
					lineas.push({
						texto: this.frase(
							this.editados_a_mano,
							'articulo que editaste a mano no se va a tocar.',
							'articulos que editaste a mano no se van a tocar.'
						),
						grave: false,
						cambia: false,
					})
				}
			}

			// Los que traen descuentos de una compra o un import: solo estan en juego en "todos"
			if (es_todos && this.con_descuentos_de_compra) {
				if (this.accion_sobre_compras == 'pisar') {
					lineas.push({
						texto: this.frase(
							this.con_descuentos_de_compra,
							'articulo va a perder la bonificacion que se habia negociado en esa compra.',
							'articulos van a perder la bonificacion que se habia negociado en esa compra.'
						),
						grave: true,
						cambia: true,
					})
				} else if (this.accion_sobre_compras == 'agregar') {
					lineas.push({
						texto: this.frase(
							this.con_descuentos_de_compra,
							'articulo va a quedar con los dos descuentos aplicados uno sobre otro, asi que su costo va a bajar mas de lo que dice la ficha.',
							'articulos van a quedar con los dos descuentos aplicados uno sobre otro, asi que su costo va a bajar mas de lo que dice la ficha.'
						),
						grave: true,
						cambia: true,
					})
				} else {
					lineas.push({
						texto: this.frase(
							this.con_descuentos_de_compra,
							'articulo con descuentos de una compra o una importacion no se va a tocar.',
							'articulos con descuentos de una compra o una importacion no se van a tocar.'
						),
						grave: false,
						cambia: false,
					})
				}
			}

			// Los que ya coinciden con la ficha
			if (this.al_dia) {
				lineas.push({
					texto: this.frase(
						this.al_dia,
						'ya esta al dia y no cambia.',
						'ya estan al dia y no cambian.'
					),
					grave: false,
					cambia: false,
				})
			}

			return lineas
		},
		/*
			Ninguna de las lineas de arriba toca un articulo. Pasa, por ejemplo, con el alcance
			"solo los que ya tienen estos descuentos" y `desactualizados` en cero.
		*/
		no_toca_nada() {
			return !this.consecuencias.some(linea => linea.cambia)
		},
	},
	created() {
		this.$root.$on(EVENTO_ABRIR, this.abrir)
	},
	beforeDestroy() {
		/*
			🔴 El bus de $root es global y vive toda la sesion. Sin este $off, cada vez que se
			vuelve a montar la vista de proveedores queda otra escucha viva y un solo click del
			usuario dispararia N veces el preview y N veces la sincronizacion.

			Y va con el handler nombrado, nunca $off a secas: $off sin argumentos limpia TODOS los
			listeners del bus, incluidos los de otros componentes.
		*/
		this.$root.$off(EVENTO_ABRIR, this.abrir)
	},
	methods: {
		/**
		 * Arma "N <texto>" con la concordancia correcta. Esta ventana repite el mismo patron
		 * siete veces y con ternarios adentro de cada push el computed se vuelve ilegible.
		 *
		 * @param {Number} cantidad
		 * @param {String} en_singular texto para cantidad == 1
		 * @param {String} en_plural texto para el resto
		 * @return {String}
		 */
		frase(cantidad, en_singular, en_plural) {
			return cantidad + ' ' + (cantidad == 1 ? en_singular : en_plural)
		},
		// Handler del evento global. El payload es el proveedor (el parent_model del has_many).
		abrir(provider) {
			if (!provider || !provider.id) {
				// Proveedor todavia sin guardar: no tiene articulos ni id contra el cual consultar
				this.$toast.error('Guarda el proveedor antes de sincronizar sus articulos')
				return
			}

			this.provider_id = provider.id
			this.nombre_proveedor = provider.name
			this.loading = true

			/*
				La ventana se abre antes del preview, con el esqueleto adentro. El usuario apreto un
				boton: si no pasa nada hasta que responde la API, parece que el click se perdio.
			*/
			this.$bvModal.show(MODAL_ID)

			let self = this
			this.$api.get('provider/'+provider.id+'/sincronizar-descuentos/preview')
			.then(res => {
				self.loading = false
				self.hay_descuentos_en_la_ficha = res.data.hay_descuentos_en_la_ficha
				self.total_articulos = res.data.total_articulos
				self.sin_descuentos = res.data.sin_descuentos
				self.al_dia = res.data.al_dia
				self.desactualizados = res.data.desactualizados
				self.editados_a_mano = res.data.editados_a_mano
				self.con_descuentos_de_compra = res.data.con_descuentos_de_compra

				if (res.data.nombre_proveedor) {
					self.nombre_proveedor = res.data.nombre_proveedor
				}
			})
			.catch(err => {
				self.loading = false
				console.log(err)
				self.$toast.error('No se pudo consultar el estado de los articulos de este proveedor')
				self.cerrar()
			})
		},
		confirm() {
			this.saving = true

			let self = this
			this.$api.put('provider/'+this.provider_id+'/sincronizar-descuentos', {
				alcance: this.alcance,
				pisar_editados_a_mano: this.pisar_editados_a_mano,
				accion_sobre_compras: this.accion_sobre_compras,
			})
			.then(res => {
				self.saving = false

				/*
					No hay contador de articulos actualizados y no puede haberlo: la sincronizacion
					recien se encolo. El aviso de que termino le llega al usuario por la
					notificacion global, igual que una exportacion.
				*/
				self.$toast.success(
					res.data.message
						? res.data.message
						: 'La sincronizacion se esta procesando. Te avisamos cuando termine.',
					{
						duration: 4000,
					}
				)

				self.cerrar()
			})
			.catch(err => {
				self.saving = false
				console.log(err)

				/*
					Sin este aviso el usuario ve desaparecer el loader y nada mas, y lo natural es
					volver a apretar el boton. Como lo unico que fallo fue el encolado, y no la
					sincronizacion, se puede reintentar sin miedo a duplicar nada.
				*/
				self.$toast.error('No se pudo iniciar la sincronizacion. Volve a intentar.')
			})
		},
		exportar_conflictos() {
			this.exportando = true

			let self = this
			this.$api.get('provider/'+this.provider_id+'/sincronizar-descuentos/exportar-conflictos')
			.then(() => {
				self.exportando = false
				// Mismo texto que el export de articulos del listado: es la convencion del sistema
				self.$toast.success('La exportacion se esta procesando. Te avisaremos cuando el excel este listo.', {
					duration: 4000,
				})
			})
			.catch(err => {
				self.exportando = false
				console.log(err)
				self.$toast.error('No se pudo iniciar la exportacion de excel', {
					duration: 4000,
				})
			})
		},
		cerrar() {
			this.$bvModal.hide(MODAL_ID)
		},
		reset() {
			this.provider_id = null
			this.nombre_proveedor = ''

			this.loading = false
			this.saving = false
			this.exportando = false

			this.hay_descuentos_en_la_ficha = true
			this.total_articulos = 0
			this.sin_descuentos = 0
			this.al_dia = 0
			this.desactualizados = 0
			this.editados_a_mano = 0
			this.con_descuentos_de_compra = 0

			this.alcance = 'solo_con_descuentos'
			this.pisar_editados_a_mano = false
			this.accion_sobre_compras = 'saltear'
		},
	},
}
</script>
<style scoped lang="sass">
.sincronizar-bloque
	padding: 10px
	border-radius: 8px
	background-color: rgba(0, 0, 0, 0.02)

// El bloque de los descuentos que vinieron de una compra: es el que puede duplicar el descuento
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
