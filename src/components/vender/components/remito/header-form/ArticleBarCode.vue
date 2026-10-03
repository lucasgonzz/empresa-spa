<template>
	<!--
		El ancla va sobre el campo entero (input + lector) y no sobre el input solo: es la que usa el
		tour de la demo para señalar el codigo de barras (clip 2.1).

		Elemento `codigo_de_barras` del diseño de Vender (mision diseno-vender-configurable,
		28/9/2026): la raiz era un <b-col cols="12" md="3"> de la fila de buscadores; ahora es un div
		suelto y el ancho y el aire entre campos los pone layout/GrillaDeEtapa.vue segun el diseño
		en uso. El v-if se queda: con la extension no_usar_codigos_de_barra el campo no existe.
	-->
	<div
	class="col-bar-code"
	data-tour="vender.campo_codigo_barras"
	v-if="!hasExtencion('no_usar_codigos_de_barra')">

		<div
		class="d-flex w-100">

			<b-form-input
			id="article-bar-code"
			dusk="article_bar_code"
			v-model="item_vender.codigo"
			autocomplete="off"
			ref="articleBarCode"
			@keydown.enter="set_article_from_barcode"
			:placeholder="placeholder"></b-form-input>

			<bar-code-scanner
			class="m-l-10"
			v-if="hasExtencion('bar_code_scanner')"
			@setBarCode="setBarCode"></bar-code-scanner>
		</div>

	</div>
</template>
<script>
import vender from '@/mixins/vender/index' 
import guardar_venta from '@/mixins/vender/guardar_venta/index' 
import sonido_error from '@/mixins/sonido_error' 
import vender_set_total from '@/mixins/vender_set_total'
/*
	"Varios precios" (mision balanzas-configurables, 3/10/2026): un ticket de balanza con importe de
	un articulo que ya esta en la venta se suma como un precio mas de ese renglon, lo mismo que pasa
	al escribir un precio en "Personalizado" y apretar Enter. Ver set_from_balanza().
*/
import varios_precios from '@/mixins/vender/varios_precios'
import { enfocar_primera_entrada_de_articulos } from '@/components/vender/layout/foco'
/*
	Tickets de balanza (mision balanzas-configurables, 3/10/2026): la dinamica la elige el dueño en
	Configuracion (users.tickets_de_balanza) y ya no sale de las extensiones. Ver src/utils/balanzas.js.
*/
import {
	leer_modo_tickets_de_balanza,
	leer_ticket_por_balanzas,
	cantidad_desde_peso,
	precio_tipeado_pendiente,
	cantidad_de_la_fila_pendiente,
} from '@/utils/balanzas'

import db from '@/offline/db'

/**
 * Escapa un texto para meterlo en un toast: vue-toast-notification dibuja el mensaje con v-html, y
 * el nombre de una balanza lo escribe el usuario.
 *
 * @param {String} texto
 * @returns {String}
 */
function escapar_html(texto) {
	return String(texto)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}

export default {
	mixins: [vender, guardar_venta, sonido_error, vender_set_total, varios_precios],
	created() {
		setTimeout(() => {
			/*
				El foco inicial de Vender va a la primera entrada de articulos A LA VISTA (ver
				layout/foco.js): con el codigo de barras a la vista es este mismo input, como
				siempre. Con los diseños de Vender este componente se monta aunque el diseño lo haya
				sacado (escondido, en layout/ReservaDeElementos.vue), y enfocarse a si mismo dejaba
				el foco en un input invisible; ahi va al buscador por nombre. Tambien cubre el input
				que no existe (extension no_usar_codigos_de_barra, o el campo desmontado en estos
				500 ms), donde el focus() directo tiraba un TypeError.
			*/
			enfocar_primera_entrada_de_articulos()
		}, 500)
	},
	components: {
		BarCodeScanner: () => import('@/common-vue/components/bar-code-scanner/Index'),
	},
	computed: {
		address_id() {
			return this.$store.state.vender.address_id
		},
		item() {
			return this.$store.state.vender.item
		},
		articles() {
			return this.$store.state.article.models
		},
		usar_codigo_proveedor() {
			return this.hasExtencion('codigo_proveedor_en_vender')
		},
		placeholder() {
			if (this.usar_codigo_proveedor) {
				return 'Cod proveedor'
			}
			return 'Cod barras'
		},
		/**
		 * Como lee VENDER los tickets de balanza, segun la configuracion del dueño
		 * (Configuracion -> Modulo de VENDER -> Tickets de balanza): 'plu', 'balanzas' o null.
		 *
		 * @returns {String|null}
		 */
		modo_tickets_de_balanza() {
			return leer_modo_tickets_de_balanza(this.owner)
		},
		/**
		 * "Por PLU": el codigo del ticket trae el PLU del articulo y el peso. Reemplaza a
		 * hasExtencion('plu_balanza_bar_code'); la lectura del ticket es la misma de siempre.
		 *
		 * @returns {Boolean}
		 */
		usa_tickets_por_plu() {
			return this.modo_tickets_de_balanza == 'plu'
		},
		/**
		 * "Por balanza": cada balanza del dueño (ABM -> Balanzas) tiene un codigo de ticket propio
		 * y un articulo. Con conexion lo resuelve la API; esto se usa para leer sin conexion.
		 *
		 * @returns {Boolean}
		 */
		usa_tickets_por_balanzas() {
			return this.modo_tickets_de_balanza == 'balanzas'
		},
		/**
		 * Las balanzas del dueño, del store (se descargan al arrancar, ver mixins/call_methods.js).
		 *
		 * @returns {Array}
		 */
		balanzas_del_dueno() {
			return this.$store.state.balanza ? this.$store.state.balanza.models : []
		},
	},
	data() {
		return {
			finded_article: undefined,
			from_balanza: false,
			/*
				Prompt 525: cuando el back responde has_variants:true, se abre el selector de
				variantes (SelectVariant) en vez de agregar el articulo padre. Esta bandera evita
				que set_article_from_barcode agregue el item o muestre el toast de "no encontrado"
				mientras se espera que el usuario elija una variante en el modal.
			*/
			opening_variant_selector: false,
		}
	},
	methods: {
		_callVender() {
			if (!this.usar_codigo_proveedor) {
				this.guardar_venta()
			}
		},

		/*
			Todo empieza con este metodo
		*/
		async set_article_from_barcode() {
			if (this.item_vender.codigo != '') {

				this.finded_article = undefined
				this.from_balanza = false
				// Se resetea en cada busqueda: si el back vuelve a responder has_variants:true
				// para un nuevo escaneo, tiene que volver a bloquear el agregado automatico.
				this.opening_variant_selector = false

				await this.set_finded_article(this.item_vender.codigo)

				console.log('from_balanza: '+this.from_balanza)
				console.log('finded_article: ')
				console.log(this.finded_article)

				if (
					typeof this.finded_article != 'undefined'
					&& !this.from_balanza
					&& !this.opening_variant_selector
				) {

					this.set_nombre_en_input()

					this.finded_article.is_article = true
					this.set_item_vender(this.finded_article)

				} else if (!this.from_balanza && !this.opening_variant_selector) {

					this.sonido_error()

					this.$toast.error('No se encontro articulo')

					let input = document.getElementById('article-bar-code')
					input.value = ''

				}
			}
		},

		async set_finded_article(codigo) {

			if (!this.usar_codigo_proveedor) {
				codigo = this.getBarCode(codigo)
			}

			if (
				!this.$store.state.auth.online
				|| this.owner.usar_articles_cache
			) {

				console.log('Buscando offline')

				let finded = await db.table('articles')
							    .where('bar_code')
							    .equals(codigo)
							    .first();

				if (typeof finded != 'undefined') {

					this.finded_article = finded
				
				} else if (this.usa_tickets_por_plu) {

					/*
						Hasta la mision balanzas-configurables (3/10/2026) la condicion era
						hasExtencion('plu_balanza_bar_code'); ahora es la configuracion del dueño.
						La lectura del ticket (set_article_from_plu) no cambia.
					*/
					await this.set_article_from_plu(codigo)

				} else if (this.usa_tickets_por_balanzas) {

					/*
						"Por balanza" sin conexion (mision balanzas-configurables, 3/10/2026). Con la
						vieja extension de importe, sin conexion el ticket daba "No se encontro".

						Sin `await` A PROPOSITO (regla del repo: nada de async/await nuevo en src/):
						se DEVUELVE la promesa. Esta rama es lo ultimo que hace set_finded_article(),
						asi que devolverla es lo mismo que esperarla: la promesa de esta funcion async
						adopta la devuelta, y set_article_from_barcode() espera a que el ticket quede
						agregado antes de mirar from_balanza.
					*/
					return this.leer_ticket_por_balanzas_sin_conexion(codigo)

				} else {

					this.finded_article = undefined
				}


			} else if (this.$store.state.auth.online) {

				await this.getArticleFromApi(codigo)

			}

		},
		check_article(article, codigo) {
			if (this.usar_codigo_proveedor) {
				return article.provider_code && article.provider_code.toLowerCase() == codigo.toLowerCase()
			} else {
				return article.bar_code && article.bar_code == codigo
			} 
		},
		async setBarCode(bar_code) {
			this.from_balanza = false
			await this.getArticleFromCodigo(bar_code)

			if (!this.from_balanza) {

				console.log('*********************************************')
				console.log('*********************************************')
				console.log('SIGE DE LARGO con from_balanza: '+this.from_balanza)
				console.log('*********************************************')
				console.log('*********************************************')

				this.finded_article.is_article = true

				this.set_item_vender(this.finded_article, true) 
			}
		},
		set_nombre_en_input() {
			let input = document.getElementById('search-article')
			// El chequeo que habia aca era `typeof input != 'undefined'`, que nunca es falso:
			// getElementById devuelve null, no undefined. El guard vive adentro del helper.
			this.setInputValueSync(input, this.finded_article.name)
		},
		getArticleFromApi(bar_code) {
			this.$store.commit('auth/setMessage', 'Buscando articulo')
			this.$store.commit('auth/setLoading', true)
			
			console.log('getArticleFromApi')

			return this.$api.get('vender/buscar-articulo-por-codido/'+bar_code)
			.then(res => {
				this.$store.commit('auth/setLoading', false)

				/*
					"Por balanza" (mision balanzas-configurables, 3/10/2026): el codigo empieza con el
					de una balanza del dueño, pero el articulo de esa balanza no existe, se borro o no
					es de esta cuenta. Llega con article en null, por eso va antes del if de abajo.
					from_balanza en true para que set_article_from_barcode() no tape este aviso con el
					generico "No se encontro articulo": el aviso propio dice donde arreglarlo.
				*/
				if (res.data.balanza_sin_articulo) {
					this.from_balanza = true
					this.finded_article = undefined
					this.avisar_balanza_sin_articulo(res.data.balanza_nombre)
					return
				}

				if (res.data.article) {

					if (res.data.from_balanza) {
						console.log('entro a from_balanza')
						this.set_from_balanza(res)
						this.from_balanza = true
						return
					} 

					if (res.data.from_balanza_plu) {
						console.log('entro a from_balanza_plu')
						this.from_balanza = true
						this.finded_article = res.data.article
						this.finded_article.amount = res.data.amount
						this.finded_article.is_article = true

						this.set_item_vender(this.finded_article, false, false)

						return
					}

					/*
						Prompt 525 (depende del 520): el back distingue 3 casos al escanear.
						- variant_id presente (mas abajo): se encontro una variante puntual, se
						  agrega directo via set_item_vender (ya sabe traducir variant_id a
						  article_variant_id).
						- has_variants:true: el articulo escaneado tiene variantes disponibles
						  pero el codigo no identifica una en particular -> hay que abrir el
						  selector (SelectVariant) en vez de agregar el padre sin variante.
						- has_variants:false (u omitido): flujo de siempre, articulo sin variantes.
					*/
					if (res.data.has_variants) {

						this.opening_variant_selector = true
						this.finded_article = undefined

						// Se deja el articulo + sus variantes en el store para que SelectVariant
						// las consuma (mismo shape que manda el back: variant_id/variant_description)
						this.$store.commit('vender/setArticleForSale', {
							...res.data.article,
							variants: res.data.variants,
						})

						this.$bvModal.show('select-variant')

						let input = document.getElementById('article-bar-code')
						input.value = ''

						return
					}

					this.finded_article = res.data.article

					if (res.data.variant_id) {
						this.finded_article.variant_id = res.data.variant_id
					}

				} else {
					this.finded_article = undefined
				}
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
				this.$toast.error('Error al buscar codigo de barras: '+err)
			})
		},
		/**
		 * Ticket de balanza con IMPORTE que resolvio la API ("Por balanza", mision
		 * balanzas-configurables, 3/10/2026).
		 *
		 * Antes le pisaba el precio al renglon del articulo (price_vender_personalizado): un segundo
		 * ticket pisaba al primero, y si el articulo no estaba en la venta el ticket no hacia nada.
		 * Ahora el importe se SUMA: ver agregar_ticket_de_importe().
		 *
		 * El peso por balanza no pasa por aca: la API lo manda con las claves del PLU
		 * (from_balanza_plu + amount) y entra por el mismo camino que un ticket PLU.
		 *
		 * @param {Object} res Respuesta de vender/buscar-articulo-por-codido:
		 *        {from_balanza: true, article, price_vender, balanza_id}.
		 * @returns {void}
		 */
		set_from_balanza(res) {
			console.log('set_from_balanza')
			this.agregar_ticket_de_importe(res.data.article, res.data.price_vender)
		},
		/**
		 * Suma a la venta un ticket de balanza con importe, reutilizando "varios precios".
		 *
		 * - Si el articulo YA ESTA en la venta (ver linea_para_otro_precio), el importe es una fila
		 *   mas de sus varios precios. Si ese renglon tenia un precio tipeado en "Personalizado"
		 *   sin Enter, primero se confirma como fila, igual que el Enter: si no, se perderia, porque
		 *   con varios precios el renglon vale solo la suma de sus filas.
		 * - Si NO ESTA, se agrega con ese importe (agregar_linea_de_ticket).
		 *
		 * Lo usan el ticket que lee la API (set_from_balanza) y el que se lee sin conexion.
		 *
		 * 🔴 El foco SIEMPRE vuelve a la primera entrada de articulos (el codigo de barras) y NUNCA
		 * queda en el input de precio, aunque el articulo este marcado para personalizar el precio
		 * en VENDER: el precio ya lo puso la balanza, y el que esta pasando tickets escanea uno atras
		 * del otro sin tocar el mouse. Si el foco se fuera al precio, el proximo ticket se tipearia
		 * adentro del precio del renglon. Por eso aca no se usa el foco del Enter
		 * (ArticlesTable.vue::foco_despues_de_varios_precios) sino limpiar_item().
		 *
		 * @param {Object} articulo Articulo del ticket.
		 * @param {Number} importe Importe que trae el ticket.
		 * @returns {void}
		 */
		agregar_ticket_de_importe(articulo, importe) {

			let linea = this.linea_para_otro_precio(articulo)

			if (linea) {

				let pendiente = precio_tipeado_pendiente(linea)

				if (pendiente !== null) {
					this.agregar_otro_precio(linea, pendiente, cantidad_de_la_fila_pendiente(linea))
					linea.price_vender_personalizado = ''
				}

				this.agregar_otro_precio(linea, importe)

				// Vacia el codigo de barras (y el item de la cabecera) y devuelve el foco ahi.
				this.limpiar_item()

				return
			}

			this.agregar_linea_de_ticket(articulo, importe)
		},
		/**
		 * El renglon de la venta al que un ticket con importe se le suma como un precio mas, o null
		 * si el ticket tiene que ir en un renglon propio.
		 *
		 * Candidatos: los renglones del mismo articulo (is_article, mismo id) SIN variante. Entre
		 * ellos, en este orden:
		 *   1. Uno que ya tenga varios precios (el ticket anterior de la misma balanza, o precios
		 *      cargados a mano con Enter).
		 *   2. Uno con un precio tipeado en "Personalizado" todavia sin Enter, o uno que no suma nada
		 *      (el "Carniceria" por defecto de Panchito, con precio 0).
		 *
		 * 🔴 Un renglon que suma plata propia -el precio de lista, o el de un renglon de una venta o
		 * un presupuesto que se esta editando- NO se toma. Pasarlo a varios precios con solo el
		 * ticket le borraria ese precio sin avisar: con varios precios el renglon vale solo la suma
		 * de sus filas (getTotalItem) y la API guarda solo las filas. Ahi el ticket va en un renglon
		 * propio y el que estaba queda como estaba.
		 *
		 * @param {Object} articulo Articulo del ticket.
		 * @returns {Object|null} El renglon (objeto del store vender.items), o null.
		 */
		linea_para_otro_precio(articulo) {

			let lineas = this.items.filter(item => {
				return item.is_article
					&& item.id == articulo.id
					&& !Number(item.article_variant_id)
			})

			let con_varios_precios = lineas.find(linea => Array.isArray(linea.varios_precios))

			if (con_varios_precios) {
				return con_varios_precios
			}

			let disponible = lineas.find(linea => {
				return precio_tipeado_pendiente(linea) !== null
					|| !Number(this.getTotalItem(linea, false))
			})

			return disponible || null
		},
		/**
		 * Agrega el articulo del ticket como renglon propio: cantidad 1 y el importe como su unico
		 * precio (varios precios de una fila), asi el proximo ticket del mismo articulo se le suma.
		 *
		 * Entra por set_item_vender(articulo, false, false), el mismo camino que un ticket PLU: los
		 * controles de stock de siempre y sin preguntar la cantidad.
		 *
		 * La copia lleva personalizar_price_en_vender = false A PROPOSITO: con esa marca,
		 * add_item_to_sale() le manda el foco al input de precio del renglon a los 500 ms
		 * (check_foco_to_precio_personalizado). El precio ya lo puso la balanza y el foco tiene que
		 * quedar en el codigo de barras para el proximo ticket. Es solo la copia que va a la venta:
		 * el articulo no cambia.
		 *
		 * El unico caso que no entra por set_item_vender es cuando ya hay un renglon del mismo
		 * articulo que linea_para_otro_precio() no tomo (suma un precio propio): add_item_vender()
		 * lo encontraria como repetido y le sumaria 1 a su cantidad (o le mandaria el foco a su
		 * precio) en vez de agregar el ticket. Ahi se hace lo mismo que set_item_vender salvo ese
		 * chequeo de repetido.
		 *
		 * @param {Object} articulo Articulo del ticket.
		 * @param {Number} importe Importe que trae el ticket.
		 * @returns {void}
		 */
		agregar_linea_de_ticket(articulo, importe) {

			let copia = {
				...articulo,
				is_article: true,
				amount: 1,
				varios_precios: [
					{
						price_vender: importe,
						amount: '',
						id: 0,
					},
				],
				personalizar_price_en_vender: false,
			}

			/*
				Misma pregunta que se hace add_item_vender() (repetidos.js: get_item_repetido +
				ya_esta_en_la_venta): el primer renglon de articulo con este id, si no tiene variante,
				es el que fusionaria.
			*/
			let repetido = this.items.find(item => item.is_article && item.id == articulo.id)
			let lo_fusionaria = typeof repetido != 'undefined' && !repetido.article_variant_id

			if (!lo_fusionaria) {
				this.set_item_vender(copia, false, false)
				return
			}

			copia.article_variant_id = 0

			if (!this.check_stock_mayor_a_cero(copia)) {
				return
			}

			this.$store.commit('vender/setItem', copia)

			if (this.check_stock_disponible(this.item_vender)) {

				// Igual que add_item_vender() para un articulo nuevo: limpia y devuelve el foco adentro.
				this.add_item_to_sale()

				this.setTotal()
			}
		},
		/**
		 * Aviso de que el ticket es de una balanza cuyo articulo no sirve (no existe, se borro o no
		 * es de esta cuenta): sonido de error, toast que dice donde arreglarlo y codigo de barras
		 * vacio para seguir escaneando.
		 *
		 * @param {String|null} nombre Nombre de la balanza (puede venir vacio: es opcional).
		 * @returns {void}
		 */
		avisar_balanza_sin_articulo(nombre) {

			this.sonido_error()

			let balanza = nombre
				? 'La balanza «' + escapar_html(nombre) + '»'
				: 'La balanza de este ticket'

			this.$toast.error(balanza + ' no tiene un artículo válido. Revisala en ABM → Balanzas.')

			/*
				setInputValueSync y no `input.value = ''` a secas: avisa a Vue, asi el v-model
				(item_vender.codigo) tambien queda vacio y un Enter con el campo vacio no vuelve a
				buscar el ticket viejo.
			*/
			this.setInputValueSync(document.getElementById('article-bar-code'), '')
		},
		async set_article_from_plu(barcode) {

			console.log('set_article_from_plu')

			if (barcode.length < 12) {
		        return
		    }

		    // 2
		    let tipoBalanza = barcode.substring(0, 2);
		    // 5
		    let plu = barcode.substring(2, 7).replace(/^0+/, '');   // quita ceros iniciales
		    // 6
		    let peso = barcode.substring(7, 12).replace(/^0+/, ''); // quita ceros iniciales

			console.log('plu: '+plu)
			console.log('peso: '+peso)


			let finded = await db.table('articles')
						    .where('plu')
						    .equals(plu)
						    .first();

			console.log('finded')
			console.log(finded)
			if (typeof finded != 'undefined') {

				this.from_balanza = true

				finded.is_article = true

				// Gramo = 2
				if (
					finded.unidad_medida_id != 2
				) {
					peso /= 1000
				}

				finded.amount = peso

				this.$store.commit('vender/setItem', finded)
				this.add_item_vender()

			} else {
				this.finded_article = undefined
				return 
			}
		    
		},
		/**
		 * "Por balanza" SIN CONEXION, o con "Utilizar articulos descargados para buscar por codigo
		 * de barras" (mision balanzas-configurables, 3/10/2026).
		 *
		 * El ticket se lee con las balanzas del store y la misma regla que la API
		 * (leer_ticket_por_balanzas de src/utils/balanzas.js), y el articulo se trae de la base local
		 * (Dexie) por su id. Despues va por el mismo camino que con conexion:
		 *   - importe -> agregar_ticket_de_importe(), el mismo manejador que set_from_balanza();
		 *   - peso    -> agregar_ticket_de_peso_sin_conexion(), el mismo camino que un PLU sin conexion.
		 * Si la balanza no tiene articulo o no esta en la base local, el mismo aviso que manda la API
		 * con balanza_sin_articulo.
		 *
		 * Devuelve una promesa (sin async/await, regla del repo): set_finded_article() la devuelve
		 * para que set_article_from_barcode() la espere.
		 *
		 * @param {String} codigo Codigo escaneado, ya sin espacios.
		 * @returns {Promise}
		 */
		leer_ticket_por_balanzas_sin_conexion(codigo) {

			let self = this

			let lectura = leer_ticket_por_balanzas(codigo, self.balanzas_del_dueno)

			// No es un ticket de ninguna balanza: sigue como cualquier codigo no encontrado.
			if (!lectura) {
				self.finded_article = undefined
				return Promise.resolve()
			}

			let article_id = Number(lectura.balanza.article_id)

			if (!article_id) {
				self.from_balanza = true
				self.finded_article = undefined
				self.avisar_balanza_sin_articulo(lectura.balanza.nombre)
				return Promise.resolve()
			}

			return db.table('articles').get(article_id)
			.then(articulo => {

				// El ticket es de una balanza: desde aca el aviso generico de "no encontrado" no va.
				self.from_balanza = true

				if (typeof articulo == 'undefined') {
					self.finded_article = undefined
					self.avisar_balanza_sin_articulo(lectura.balanza.nombre)
					return
				}

				if (lectura.tipo_dato == 'peso') {
					self.agregar_ticket_de_peso_sin_conexion(articulo, lectura.valor)
				} else {
					self.agregar_ticket_de_importe(articulo, lectura.valor)
				}
			})
			.catch(err => {
				// Mismo criterio que el catch de getArticleFromApi(): se avisa y se sigue.
				console.log('Error al leer el ticket de balanza sin conexion')
				console.log(err)
				self.finded_article = undefined
				self.$toast.error('Error al leer el ticket de balanza: '+err)
			})
		},
		/**
		 * Ticket de balanza con PESO leido sin conexion. Mismo camino que un ticket PLU sin conexion
		 * (set_article_from_plu): el articulo va a la cabecera con la cantidad del ticket y entra por
		 * add_item_vender(), que si ya esta en la venta le suma esa cantidad. Con conexion la API manda
		 * el peso con las claves del PLU (from_balanza_plu) y entra por el camino del PLU online.
		 *
		 * @param {Object} articulo Articulo de la base local (Dexie): es una copia, se puede modificar.
		 * @param {Number} valor Peso como lo marca la balanza (gramos).
		 * @returns {void}
		 */
		agregar_ticket_de_peso_sin_conexion(articulo, valor) {

			articulo.is_article = true

			// En kilos, salvo que el articulo se venda por gramo (misma regla que el PLU).
			articulo.amount = cantidad_desde_peso(valor, articulo)

			this.$store.commit('vender/setItem', articulo)
			this.add_item_vender()
		},
	}
}
</script>
<style scoped lang="sass">
.col-bar-code
	display: flex
	align-items: center
</style>