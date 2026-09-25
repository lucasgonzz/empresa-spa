/*
	DETECCION AUTOMATICA DE COMBOS EN VENDER

	Lo que pidio Lucas: si los articulos sueltos que el vendedor cargo alcanzan para armar un combo,
	se reemplazan por el combo y el sobrante queda suelto. Su ejemplo: combo de 1 taladro + 2 mechas;
	el vendedor carga 3 mechas y 1 taladro -> al agregar el taladro se arma el combo y queda 1 mecha
	suelta.

	Este archivo tiene DOS mitades bien separadas y conviene no mezclarlas:

	1. EL NUCLEO PURO (combos_armables / linea_participa / motivo_de_exclusion). Sin Vuex, sin
	   `this`, sin efectos. Entra el remito y el catalogo de combos, sale la lista de candidatos.
	   Es lo unico que hay que razonar para saber si la cuenta da bien, y es lo unico testeable
	   sin levantar un componente.

	2. EL MIXIN, que engancha ese nucleo al modulo VENDER: decide si la deteccion corre, le
	   pregunta al vendedor y aplica el reemplazo contra el store.

	🔴 Esto NO cambia como se calcula un precio. Reordena lineas: baja cantidades, borra las que
	quedan en cero y agrega un renglon de combo. El precio del combo sale de `combo.price` por el
	mismo camino de siempre (getPriceVender lee `final_price`).
*/

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   1 · NUCLEO PURO
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * Por que una linea del remito NO puede entrar en un combo.
 *
 * 🔴 Ninguno de estos frenos es prolijidad: cada uno tapa una forma concreta de romper la venta.
 * Devuelve el motivo (string) o null si la linea participa.
 *
 * @param {Object} item - linea del remito
 * @return {String|null}
 */
export function motivo_de_exclusion(item) {

	if (!item || !item.is_article) {
		/* Servicios, promociones y combos ya cargados no se fusionan en otro combo */
		return 'no es un articulo'
	}

	/*
		Un combo referencia articulos por article_id pelado, sin ninguna nocion de variante.
		Fusionar una linea con variante perderia la variante y descontaria stock del articulo
		padre.
	*/
	if (Number(item.article_variant_id || 0) !== 0 || item.is_variant) {
		return 'tiene variante'
	}

	/*
		Articulo marcado para escribirle el precio a mano EN CADA VENTA. Nunca va a poder entrar en
		un combo, con precio escrito o sin el. Y tiene un motivo extra para quedar afuera: al
		agregarlo, add_item_to_sale() le pone el foco al input de precio a los 500 ms -- si el
		cartel apareciera justo despues, le robaria el foco al vendedor mientras va a tipear.
	*/
	if (item.personalizar_price_en_vender) {
		return 'precio a mano en cada venta'
	}

	/* Precio escrito a mano en el renglon: el combo no puede representarlo */
	if (
		typeof item.price_vender_personalizado != 'undefined'
		&& item.price_vender_personalizado !== null
		&& item.price_vender_personalizado !== ''
	) {
		return 'precio personalizado'
	}

	/*
		Oferta por cantidad en modo PORCENTAJE. Es la misma exclusion de arriba vista por su otra
		cara: cuando la oferta gana por precio fijo, check_price_range escribe
		price_vender_personalizado y la linea ya quedaba afuera; en modo porcentaje no hay numero
		escrito, solo la marca, y el combo tampoco puede representar ese precio.
	*/
	if (Number(item.porcentaje_oferta_por_cantidad || 0) !== 0) {
		return 'oferta por cantidad en porcentaje'
	}

	/* "Varios precios": la linea es en realidad varias, con precios distintos adentro */
	if (Number(item.calculated_price_vender || 0) !== 0) {
		return 'varios precios'
	}
	if (Array.isArray(item.varios_precios) && item.varios_precios.length) {
		return 'varios precios'
	}

	/* Nombre editado a mano en el renglon */
	if (item.name_vender_personalizado) {
		return 'nombre personalizado'
	}

	/* Un combo no tiene descuento por linea en la UI: si la linea lo tiene, el combo lo perderia */
	if (Number(item.discount || 0) !== 0) {
		return 'descuento de linea'
	}

	/*
		Balanza / peso. La aritmetica de "cuantos combos entran" es entera: 1,250 kg de jamon no
		aporta a ningun combo.
	*/
	let cantidad = Number(item.amount)
	if (!isFinite(cantidad) || Math.floor(cantidad) !== cantidad || cantidad < 1) {
		return 'cantidad no entera'
	}

	return null
}

/**
 * Atajo booleano sobre motivo_de_exclusion().
 *
 * @param {Object} item
 * @return {Boolean}
 */
export function linea_participa(item) {
	return motivo_de_exclusion(item) === null
}

/**
 * Cuantas unidades de cada articulo pide un combo, acumulando por si un articulo aparece dos
 * veces en la receta.
 *
 * Devuelve [] si la receta no sirve para detectar: sin articulos, o con alguna cantidad que no
 * es un entero mayor a cero (ahi no hay division que valga).
 *
 * @param {Object} combo
 * @return {Array} [{article_id, amount}]
 */
export function requeridos_del_combo(combo) {

	if (!combo || !Array.isArray(combo.articles) || !combo.articles.length) {
		return []
	}

	let acumulado = {}
	let receta_valida = true

	combo.articles.forEach(article => {

		if (!receta_valida) {
			return
		}

		let cantidad = Number(article && article.pivot ? article.pivot.amount : null)

		if (!isFinite(cantidad) || Math.floor(cantidad) !== cantidad || cantidad < 1) {
			receta_valida = false
			return
		}

		acumulado[article.id] = (acumulado[article.id] || 0) + cantidad
	})

	if (!receta_valida) {
		return []
	}

	return Object.keys(acumulado).map(article_id => {
		return {
			article_id: article_id,
			amount: acumulado[article_id],
		}
	})
}

/**
 * 🔴 EL CORAZON. Funcion pura: no toca Vuex, no usa `this`, no modifica lo que recibe.
 *
 * Por cada combo: veces = min( por cada articulo del combo: floor(cantidad_en_remito / pivot.amount) ).
 * Si veces >= 1, el combo es armable.
 *
 * Cada candidato se calcula contra el remito TAL COMO ESTA, sin descontar lo que se llevaria otro
 * candidato. O sea que dos combos que se pelean por el mismo articulo pueden volver los dos: la
 * competencia la resuelve quien aplica, aplicando uno y volviendo a correr esto sobre el remito ya
 * modificado. Se hace asi a proposito -- una funcion que ademas repartiera el stock entre combos
 * tendria que elegir a cual privilegiar, y esa eleccion no es aritmetica, es del vendedor.
 *
 * @param {Array} items - lineas del remito (store vender/items)
 * @param {Array} combos - catalogo de combos, cada uno con articles[].pivot.amount
 * @return {Array} [{combo, veces, lineas: [{item, amount_por_combo, cantidad_usada, cantidad_restante}]}]
 */
export function combos_armables(items, combos) {

	let candidatos = []

	if (!Array.isArray(items) || !Array.isArray(combos)) {
		return candidatos
	}

	/*
		Lineas que participan, indexadas por article_id. Si el mismo articulo aparece en dos lineas
		que participan -- no deberia, repetidos.js las fusiona -- se usa la primera y la otra queda
		afuera. Nunca se suman dos renglones: el reemplazo despues tiene que bajarle la cantidad a
		UNO, y repartirlo entre dos seria inventar una decision.
	*/
	let linea_de_articulo = {}
	items.forEach(item => {
		if (!linea_participa(item)) {
			return
		}
		if (typeof linea_de_articulo[item.id] == 'undefined') {
			linea_de_articulo[item.id] = item
		}
	})

	combos.forEach(combo => {

		let requeridos = requeridos_del_combo(combo)

		if (!requeridos.length) {
			return
		}

		let veces = null
		let alcanza = true
		let usadas = []

		requeridos.forEach(requerido => {

			if (!alcanza) {
				return
			}

			let linea = linea_de_articulo[requerido.article_id]

			if (typeof linea == 'undefined') {
				alcanza = false
				return
			}

			let entran = Math.floor(Number(linea.amount) / requerido.amount)

			if (entran < 1) {
				alcanza = false
				return
			}

			if (veces === null || entran < veces) {
				veces = entran
			}

			usadas.push({
				item: linea,
				amount_por_combo: requerido.amount,
			})
		})

		if (!alcanza || !veces) {
			return
		}

		candidatos.push({
			combo: combo,
			veces: veces,
			lineas: usadas.map(usada => {
				let cantidad_usada = usada.amount_por_combo * veces
				return {
					item: usada.item,
					amount_por_combo: usada.amount_por_combo,
					cantidad_usada: cantidad_usada,
					/* Lo que queda suelto: la mecha sobrante del ejemplo de Lucas */
					cantidad_restante: Number(usada.item.amount) - cantidad_usada,
				}
			}),
		})
	})

	return candidatos
}

/**
 * El texto de la pregunta, armado aparte para poder leerlo sin levantar un componente.
 *
 * @param {Object} candidato - una entrada de combos_armables()
 * @return {Array} lineas de texto: la primera es la pregunta, el resto el detalle
 */
export function texto_de_la_pregunta(candidato) {

	let lineas = []

	let cuantos = candidato.veces > 1
		? candidato.veces + ' combos "' + candidato.combo.name + '"'
		: 'el combo "' + candidato.combo.name + '"'

	lineas.push('Con lo que cargaste se arma ' + cuantos + '. ¿Lo armo?')
	/* Sin numero gramatical: sirve igual para una linea que para cinco */
	lineas.push('Se saca del remito:')

	candidato.lineas.forEach(linea => {

		let texto = '· ' + linea.cantidad_usada + ' x ' + (linea.item.name || 'Articulo')

		if (linea.cantidad_restante > 0) {
			texto += ' (te queda' + (linea.cantidad_restante > 1 ? 'n ' : ' ') + linea.cantidad_restante + ' suelta' + (linea.cantidad_restante > 1 ? 's' : '') + ')'
		}

		lineas.push(texto)
	})

	return lineas
}

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   2 · EL MIXIN
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/*
	Cuanto se espera antes de mirar el remito. El input de cantidad del remito dispara en cada
	@keyup: sin esta demora, escribir "30" preguntaria al pasar por "3". La demora se reinicia en
	cada llamada, asi que lo que corre es siempre la ultima.
*/
const DEMORA_DETECCION = 700

/*
	🔴 ESTADO DE MODULO, NO data() DEL COMPONENTE. Y esto no es un atajo.

	El mixin termina mezclado en VARIOS componentes del remito a la vez -- el buscador de la
	cabecera, el de combos y la tabla de articulos, todos pasan por mixins/vender/index.js -- y
	cada uno tendria su propio data(). O sea: el vendedor rechaza el combo desde la tabla, agrega
	otro articulo desde la cabecera, y el cartel vuelve a aparecer porque ESE componente no se
	entero del rechazo. Lo mismo con el cartel abierto: dos componentes podrian abrir dos.

	El remito es uno solo, asi que el estado de la deteccion tambien. Un modulo ES es un singleton,
	y eso es exactamente lo que hace falta aca.
*/

/*
	Combos que el vendedor rechazo. Se les levanta el rechazo cuando el remito deja de alcanzar
	para armarlos -- o sea que si despues vuelve a alcanzar, se pregunta de nuevo. Preguntar en
	cada tecleo es inusable, que es justo lo que Lucas pidio evitar.
*/
let combos_rechazados = []

/* Un solo cartel a la vez */
let preguntando_por_combo = false

let timer_deteccion = null

/**
 * Deja la deteccion como recien arrancada. La llama limpiar_vender y la usan las pruebas.
 */
export function reiniciar_estado_de_deteccion() {
	if (timer_deteccion) {
		clearTimeout(timer_deteccion)
		timer_deteccion = null
	}
	combos_rechazados = []
	preguntando_por_combo = false
}

export default {
	methods: {

		/**
		 * ¿Corre la deteccion ahora mismo?
		 *
		 * Lee el store directo y no computeds del mixin, para no depender del orden en que un
		 * componente mezcle los mixins.
		 *
		 * @return {Boolean}
		 */
		deteccion_de_combos_activa() {

			/* Gate de extension: la cuenta que no usa combos no paga nada de esto */
			if (!this.hasExtencion('combos')) {
				return false
			}

			/*
				Recuperar una venta anterior o editar un presupuesto. Los items traen
				pivot.checked_amount, returned_amount, delivered_amount y precio historico:
				reemplazarlos romperia la contabilidad de stock de UpdateHelper.
			*/
			if (this.$store.getters['vender/previus_sales/editando_venta_previa']) {
				return false
			}
			if (this.$store.state.vender.budget) {
				return false
			}

			return true
		},

		/**
		 * Programa una pasada de deteccion. Es lo unico que llaman los tres enganches.
		 *
		 * La condicion se evalua DOS veces a proposito: al programar y al disparar. Al programar,
		 * porque la carga de articulos por defecto es sincronica y ya termino para cuando salta el
		 * timer; al disparar, porque entre medio el vendedor pudo abrir una venta previa.
		 */
		programar_deteccion_de_combos() {

			if (!this.deteccion_de_combos_activa()) {
				return
			}

			if (timer_deteccion) {
				clearTimeout(timer_deteccion)
			}

			let self = this

			timer_deteccion = setTimeout(() => {
				timer_deteccion = null
				self.detectar_combos()
			}, DEMORA_DETECCION)
		},

		/**
		 * Mira el remito, limpia los rechazos que ya no aplican y ofrece el primer combo armable.
		 */
		detectar_combos() {

			if (!this.deteccion_de_combos_activa() || preguntando_por_combo) {
				return
			}

			let candidatos = combos_armables(
				this.$store.state.vender.items,
				this.$store.state.combo.models
			)

			/*
				Se le levanta el rechazo a todo combo que dejo de estar armable. Asi, si el vendedor
				dijo que no, saco el taladro y despues lo volvio a cargar, la pregunta vuelve.
			*/
			let armables_ahora = candidatos.map(candidato => candidato.combo.id)
			combos_rechazados = combos_rechazados.filter(combo_id => {
				return armables_ahora.indexOf(combo_id) != -1
			})

			let candidato = candidatos.find(_candidato => {
				return combos_rechazados.indexOf(_candidato.combo.id) == -1
			})

			if (typeof candidato == 'undefined') {
				return
			}

			this.preguntar_por_combo(candidato)
		},

		/**
		 * El cartel. Si el vendedor acepta, se arma; si no, el combo queda anotado como rechazado.
		 *
		 * @param {Object} candidato
		 */
		preguntar_por_combo(candidato) {

			let self = this
			let lineas = texto_de_la_pregunta(candidato)
			let h = this.$createElement

			preguntando_por_combo = true

			this.$bvModal.msgBoxConfirm(
				lineas.map(linea => h('div', { class: 'mb-1' }, linea)),
				{
					title: 'Se puede armar un combo',
					okTitle: 'Armar el combo',
					cancelTitle: 'Dejarlo como esta',
				}
			)
			.then(confirmado => {
				preguntando_por_combo = false
				/*
					🔴 Son TRES respuestas, no dos. msgBoxConfirm de BootstrapVue RESUELVE (no
					rechaza) con `null` cuando el cartel se cierra sin contestar: Escape, click
					afuera o la X. Si `null` cae en el else, un Escape sin querer deja el combo
					anotado como rechazado y no se vuelve a ofrecer hasta que el remito deje de
					alcanzar para armarlo -- o sea que el vendedor pierde el combo en silencio por
					apretar una tecla.

					El .catch de abajo NO cubria este caso: nunca se ejecuta por un cierre, solo
					por un error de verdad.
				*/
				if (confirmado === null || typeof confirmado == 'undefined') {
					return
				}
				if (confirmado) {
					self.armar_combo(candidato)
				} else {
					if (combos_rechazados.indexOf(candidato.combo.id) == -1) {
						combos_rechazados.push(candidato.combo.id)
					}
				}
			})
			.catch(err => {
				/* Un error de verdad al abrir el cartel. El cierre sin responder NO pasa por aca:
				   se resuelve con null y lo maneja el .then. */
				preguntando_por_combo = false
				console.log(err)
			})
		},

		/**
		 * Aplica el candidato contra el store: baja las cantidades, borra las lineas que quedan en
		 * cero y agrega el renglon del combo.
		 *
		 * @param {Object} candidato
		 */
		armar_combo(candidato) {

			candidato.lineas.forEach(linea => {

				if (linea.cantidad_restante <= 0) {

					this.$store.commit('vender/removeItem', linea.item)

				} else {

					this.$store.commit('vender/updateItem', {
						...linea.item,
						amount: linea.cantidad_restante,
					})
				}
			})

			this.agregar_combo_al_remito(candidato)

			/*
				Sin argumentos: setTotal() recalcula los precios de todo el remito -- incluido el
				price_vender del combo recien agregado, que sale de su final_price -- y rearma los
				cuatro buckets del total.
			*/
			this.setTotal()

			let cuantos = candidato.veces > 1
				? candidato.veces + ' combos'
				: 'el combo'

			this.$toast.success('Se armo ' + cuantos + ' "' + candidato.combo.name + '"')

			/*
				Otra pasada: con el remito ya modificado puede quedar armable OTRO combo -- ese es
				el caso de dos combos que se peleaban por el mismo articulo. No hay ciclo posible
				con el que acaba de armarse: se consumio `veces`, que es el maximo, asi que al
				menos uno de sus articulos quedo por debajo de lo que pide.
			*/
			this.programar_deteccion_de_combos()
		},

		/**
		 * Suma el combo al remito. Si ya hay un renglon de ese combo, se le suma la cantidad en vez
		 * de duplicarlo, que es el mismo criterio de repetidos.js.
		 *
		 * @param {Object} candidato
		 */
		agregar_combo_al_remito(candidato) {

			let ya_esta = this.$store.state.vender.items.find(item => {
				return item.is_combo && item.id == candidato.combo.id
			})

			if (typeof ya_esta != 'undefined') {

				this.$store.commit('vender/updateItem', {
					...ya_esta,
					amount: Number(ya_esta.amount) + candidato.veces,
				})
				return
			}

			/*
				Mismo molde con el que el buscador de combos arma el item (header-form/Combos.vue):
				is_combo, final_price desde combo.price -- que es de donde getPriceVender lo toma --
				y article_variant_id en 0 para que el matcheo del store lo trate como una linea mas.
			*/
			this.$store.commit('vender/addItem', {
				...candidato.combo,
				is_combo: true,
				article_variant_id: 0,
				price_type_personalizado_id: 0,
				final_price: Number(candidato.combo.price),
				amount: candidato.veces,
			})
		},

		/**
		 * Borra el estado de la deteccion. Lo llama limpiar_vender: remito nuevo, rechazos nuevos.
		 */
		limpiar_deteccion_de_combos() {
			reiniciar_estado_de_deteccion()
		},
	},
}
