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
        /**
         * Paso del input numérico según decimales máximos permitidos en el model.
         *
         * @param {Object} prop definición de propiedad (puede incluir variable_decimals).
         * @returns {string|undefined} valor para el atributo step del input, o undefined si no aplica.
         */
        get_number_input_step(prop) {
            if (!prop || !prop.variable_decimals) {
                return undefined
            }
            const max_decimals = prop.variable_decimals.max != null ? prop.variable_decimals.max : 4
            if (max_decimals <= 0) {
                return '1'
            }
            return '0.' + '0'.repeat(max_decimals - 1) + '1'
        },
        /**
         * Formatea un número con decimales variables: muestra min_decimals por defecto
         * y hasta max_decimals solo si el valor usa el 3.er o 4.o decimal (u otros extra).
         *
         * @param {*} value valor crudo del campo.
         * @param {number} min_decimals decimales mínimos visibles (por defecto 2).
         * @param {number} max_decimals decimales máximos almacenados/permitidos (por defecto 4).
         * @returns {string} texto listo para mostrar en tablas y formularios.
         */
        format_number_variable_decimals(value, min_decimals = 2, max_decimals = 4) {
            if (value === null || value === undefined || value === '') {
                return ''
            }
            const number_value = Number(value)
            if (isNaN(number_value)) {
                return String(value)
            }
            const factor_max = Math.pow(10, max_decimals)
            const factor_min = Math.pow(10, min_decimals)
            const rounded_max = Math.round(number_value * factor_max) / factor_max
            const rounded_min = Math.round(number_value * factor_min) / factor_min

            if (rounded_max === rounded_min) {
                return rounded_min.toFixed(min_decimals)
            }

            let formatted = rounded_max.toFixed(max_decimals)
            formatted = formatted.replace(/(\.\d*?[1-9])0+$/, '$1')
            const decimal_part = formatted.indexOf('.') >= 0 ? formatted.split('.')[1] : ''
            if (decimal_part.length < min_decimals) {
                formatted = rounded_max.toFixed(min_decimals)
            }
            return formatted
        },
        /**
         * Normaliza un valor de pivot para guardarlo/mostrarlo con decimales variables.
         *
         * @param {Object} prop definición de propiedad del model.
         * @param {*} value valor actual del pivot.
         * @returns {*} valor normalizado o el original si no aplica variable_decimals.
         */
        normalize_variable_decimal_pivot_value(prop, value) {
            if (!prop || !prop.variable_decimals) {
                return value
            }
            const min_decimals = prop.variable_decimals.min != null ? prop.variable_decimals.min : 2
            const max_decimals = prop.variable_decimals.max != null ? prop.variable_decimals.max : 4
            const formatted = this.format_number_variable_decimals(value, min_decimals, max_decimals)
            if (formatted === '') {
                return value
            }
            return formatted
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
