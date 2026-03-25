import moment from 'moment'
import numeral from 'numeral'

export default {
    methods: {
        html_text(text) {
            return text.replace(/\n/g, '<br>')
        },
        strip_html(html) {
            const temp = document.createElement('div')
            temp.innerHTML = html
            return temp.textContent || temp.innerText || ''
        },
        propText(prop, capitalize = true, from_table = false) {
            let text

            if (prop.key == 'table_right_options' || prop.key == 'table_left_options') {
                return '&nbsp'
            }

            if (from_table && prop.table_text) {
                return prop.table_text
            }
            if (prop.text) {
                text = prop.text
            } else if (prop.key) {
                text = prop.key.replaceAll('_', ' ')
            }
            if (capitalize) {
                return this.capitalize(text)
            }
            return text
        },
        replaceGuion(string) {
            return string.replaceAll('-', '_')
        },
        routeString(string, in_plural = false, replace_guion_bajo = true) {
            let result
            string = '' + string

            if (in_plural) {
                result = this.modelPlural(string.toLowerCase().replaceAll(' ', '-'))
            } else {
                result = string.toLowerCase().replaceAll(' ', '-')
            }
            if (replace_guion_bajo) {
                return result.replaceAll('_', '-')
            }
            return result
        },
        routeToString(route) {
            return route.replaceAll('-', ' ')
        },
        capitalize(str) {
            return str.charAt(0).toUpperCase() + str.slice(1)
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
            if (p) {
                let price = numeral(p).format('$0,0.00')
                if (with_decimals) {
                    return price
                } else if (!quitar_decimales_solo_si_no_es_00 || price.substr(price.length - 2, price.length) == '00') {
                    return price.substr(0, price.length - 3)
                }
                return price
            }
            return '-'
        },
        getMonth(d) {
            return moment(d).format('MMM')
        },
        getDay(d) {
            return moment(d).format('dd')
        },
        since(date, fisrt_upp = false) {
            if (date) {
                if (fisrt_upp) {
                    return this.capitalize(moment(date).fromNow())
                }
                return moment(date).fromNow()
            }
            return '-'
        },
    },
}
