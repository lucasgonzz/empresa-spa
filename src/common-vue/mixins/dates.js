import moment from 'moment'
moment.locale('es')
import numeral from 'numeral'

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
	methods: {
		phone(phone) {
			return phone.substr(4)
		},
		date(d, complete = false) {
			if (d) {
				if (complete) {
					return moment(d).format('DD/MM/YY h:mm:ss')
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
		price(p, with_decimals = true, quitar_decimales_solo_si_no_es_00 = true) {
			if (p === null) {
				return '-'
			}
			if (typeof p == 'undefined') {
				return '-'
			}
			let price = numeral(p).format('$0,0.00')	
			price = price.replaceAll(',', '_')
			price = price.replace('.', ',')
			price = price.replaceAll('_', '.')		
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