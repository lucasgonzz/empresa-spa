import moment from 'moment'
moment.locale('es')
import numeral from 'numeral'
import { separadores_es, separadores_es_desde_dato, numero_es as numero_es_helper } from '@/common-vue/helpers/formato_numero'

// numeral.register('locale', 'es_custom', {
//     delimiters: {
//         thousands: '.',
//         decimal: ','
//     },
//         abbreviations: {
//             thousand: 'k',
//             million: 'm',
//             billion: 'b',
//             trillion: 't'
//         },
//         ordinal: function (number) {
//             return number === 1 ? 'er' : 'ème';
//         },
//     currency: {
//         symbol: '$'
//     }
// })

// numeral.locale('es_custom')

export default {
	/*
	 * OJO CON LOS NOMBRES DE ESTOS METODOS.
	 *
	 * Este mixin es GLOBAL: main.js -> Vue.mixin(app) -> common-vue/mixins/app.js -> mixins: [dates].
	 * Todo lo que se declare aca se inyecta en TODA instancia de Vue del sistema.
	 *
	 * En Vue 2, initState() corre initProps() y DESPUES initMethods(), y initMethods hace
	 * vm[key] = bind(methods[key], vm). O sea que un metodo de este archivo PISA cualquier prop
	 * que se llame igual, en cualquier componente, y this.<prop> pasa a devolver la funcion
	 * bindeada -- que concatenada a un string da "function () { [native code] }".
	 *
	 * Falla en silencio: Vue solo emite un warning de desarrollo en consola
	 * ("Method X has already been defined as a prop"), nunca una excepcion.
	 *
	 * Ya paso: aca vivia un metodo phone() muerto que pisaba la prop `phone` de
	 * WhatsappBtn.vue y hacia que el boton de WhatsApp abriera un chat inexistente
	 * (grupo 373, 7/8/2026). Antes de agregar un metodo aca, elegir un nombre que
	 * ningun componente vaya a querer usar como prop (date, price, hour ya son riesgosos)
	 * y correr herramientas/detectar-props-pisadas.py del repo claude-comerciocity.
	 */
	methods: {
		date(d, complete = false) {
			if (d) {
				if (complete) {
					return moment(d).format('DD/MM/YY HH:mm:ss')
				}
				return moment(d).format('DD/MM/YY')
			}
			return '-'
		},
		hour(d) {
			return moment(d).format('HH:mm')
		},
		hour_from_time(d) {
			return moment(d, 'HH:mm:ss').format('HH:mm')
		},
		price(p, with_decimals = false, quitar_decimales_solo_si_no_es_00 = true) {
			if (p === null) {
				return '-'
			}
			if (typeof p == 'undefined') {
				return '-'
			}
			// numeral formatea SIEMPRE en locale ingles ($1,234.56) y el swap se hace despues,
			// sobre el texto. El motivo esta explicado en common-vue/helpers/formato_numero.js:
			// registrarle el locale español a numeral le cambia tambien el PARSEO y multiplica
			// por cien los precios que Laravel manda como string. Es lo que intentaba el bloque
			// comentado del principio de este archivo, y por eso nunca se activo.
			let price = separadores_es(numeral(p).format('$0,0.00'))
			if (with_decimals) {
				return price
			} else {
				// if (price.substr(price.length-2, price.length) == '00') {
				// 	return price.substr(0, price.length-3)
				// }
				if (!quitar_decimales_solo_si_no_es_00 || price.substr(price.length-2, price.length) == '00') {
					return price.substr(0, price.length-3)
				} else {
					return price 
				}
			}
		},
		/*
			Los dos metodos de abajo se llaman `numero_es` y `porcentaje_es`, con sufijo, por
			SEGURIDAD y no por estetica. Este mixin es GLOBAL (ver el comentario grande de arriba):
			un metodo de aca pisa en silencio cualquier prop que se llame igual.

			`porcentaje` a secas NO se puede usar: ya es una prop declarada en
			common-vue/components/download-resources/RingProgress.vue,
			components/listado/modals/inventory-performance/CircleProgress.vue y
			components/listado/modals/inventory-performance/GraficoDona.vue. Los tres se romperian
			igual que se rompio WhatsappBtn con phone() en el grupo 373.

			Chequeado el 21/8/2026 contra las 460 props declaradas del repo: `numero_es` y
			`porcentaje_es` estan libres. Si agregas otro metodo aca, volve a chequear.

			Mision del 21/8/2026 — separadores de numeros.
		*/

		/**
		 * Una cantidad para mostrar: unidades, stock, kilos, cantidad de registros.
		 *
		 * Conserva los decimales que ya traia el valor en vez de imponer una cantidad fija, porque
		 * lo que se pidio fue cambiar los SEPARADORES, no cuantos decimales se ven.
		 *
		 * @param {*} valor valor crudo (numero o string con punto decimal, como lo manda Laravel).
		 * @returns {string} '1.500' · '1.500,0000' · '12,5' · '' si no hay valor.
		 */
		numero_es(valor) {
			return separadores_es_desde_dato(valor)
		},
		/**
		 * Una cantidad con una cantidad FIJA de decimales.
		 *
		 * @param {*} valor valor crudo.
		 * @param {number} decimales cuantos decimales mostrar.
		 * @returns {string} ej: numero_es_con_decimales(1234.5, 2) -> '1.234,50'.
		 */
		numero_es_con_decimales(valor, decimales) {
			return numero_es_helper(valor, decimales)
		},
		/**
		 * Un porcentaje para mostrar, SIN el simbolo % (lo pone quien llama, que es como esta
		 * escrito hoy en todos los templates: `{{ porcentaje_es(x) }}%`).
		 *
		 * Conserva los decimales del valor: Laravel manda '10.50' y se muestra '10,50'.
		 *
		 * @param {*} valor valor crudo.
		 * @returns {string} '10,50' · '12,5' · '25' · '' si no hay valor.
		 */
		porcentaje_es(valor) {
			return separadores_es_desde_dato(valor)
		},
		getMonth(d) {
			return moment(d).format('MMM')
		},
		getDay(d) {
			return moment(d).format('dd')
		},
		since(date, fisrt_upp = false) {
			if (date) {
				if (!fisrt_upp) {
					return moment(date).fromNow()
				} else {
					return this.capitalize(moment(date).fromNow())
				}
			}
			return '-'
		},
		until(date, fisrt_upp = false) {
			if (date) {
				if (!fisrt_upp) {
					return moment(date).toNow(true)
				} else {
					return this.capitalize(moment(date).toNow(true))
				}
			}
			return '-'
		},
		diff(d, formated = false) {
			var date = moment().diff(d, 'days')+''
			date = date.replace('-', '')
			if (formated) {
				// console.log('a: '+date)
				if (date == '0') {
					date = 'hoy'
				} else if (date == '1') {
					date = 'mañana'
				} else if (date == '2') {
					date = 'pasado mañana'
				} else {
					date = 'en ' + date + ' días'
				}
			} 
			return date
		},
		diff_(d) {
			var date = moment().diff(d, 'days')
			return date
		},
	}
}