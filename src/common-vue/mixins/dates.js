import moment from 'moment'
moment.locale('es')
import numeral from 'numeral'
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
		price(p, with_decimals = true) {
			if (p === null) {
				return '-'
			}
			if (typeof p == 'undefined') {
				return '-'
			}
			let price = numeral(p).format('$0,0.00')
			// price = price.replaceAll(',', '-')
			// price = price.replace('.', ',')
			// price = price.replaceAll('-', '.')
			if (with_decimals) {
				return price
			} else {
				if (price.substr(price.length-2, price.length) == '00') {
					return price.substr(0, price.length-3)
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