/*
	El "Diseño ágil" de Vender (misión vender-secciones-personalizables, 22/11/2026): la plantilla
	del sistema pensada para el día a día de una operación.

	Una columna a la izquierda (un tercio de la pantalla) con la configuración de la venta, uno
	campo abajo del otro, y a la derecha, en dos tercios, "Artículos y servicios" arriba y "Cierre
	y opciones" abajo. Las tres secciones tienen alto fijo y suman 12 doceavos a la derecha
	(8 + 4) y 12 a la izquierda, así todo entra en la pantalla sin bajar: la tabla de artículos
	scrollea adentro de su sección y el buscador queda siempre a la vista.

	🔴 NO ESTÁ DUPLICADO EN EL BACKEND, Y ES A PROPÓSITO (igual que el predeterminado, ver
	diseno_predeterminado.js). La base guarda `{version: 2, plantilla: 'agil'}` sin `etapas`, y
	este archivo arma el resto en código: el backend no conoce el catálogo, el ancho del buscador
	depende de las extensiones del negocio (`cols` es una función en elementos.js) y un campo
	nuevo del futuro se ubica solo. Una SPA vieja ve ese layout como inválido y cae al
	predeterminado: degradado, nunca roto.

	No se saca ningún campo (`sacados` vacío): lo de menos uso queda al final del cierre, que
	scrollea. Así ningún interruptor con efecto de negocio (descontar stock, precios con IVA)
	queda escondido con su valor por defecto.
*/
import { KEY_SEPARADOR, KEY_SALTO_DE_FILA } from './elementos'
import diseno_predeterminado from './diseno_predeterminado'

/* Clave de la plantilla en el layout guardado. */
export const PLANTILLA_AGIL = 'agil'

/**
 * Arma una lista de items de un mismo ancho a partir de sus keys.
 *
 * @param {Array<string>} keys
 * @param {number} cols
 * @returns {Array}
 */
function items_con_ancho(keys, cols) {
	let items = []
	keys.forEach(function (key) {
		items.push({ key: key, cols: cols })
	})
	return items
}

/**
 * Arma el diseño ágil para este negocio/usuario. Incluye TODOS los campos del catálogo, cada uno
 * una vez (la suma de las tres secciones da los 34).
 *
 * @param {Object} vm componente de la SPA (para el ancho del buscador, que depende de extensiones)
 * @returns {{version: number, plantilla: string, etapas: Object, sacados: Array, secciones: Object, disposicion: Array}}
 */
export default function diseno_agil(vm) {
	let predeterminado = diseno_predeterminado(vm)

	/*
		Configuración inicial: todo de 12 (uno abajo del otro). Primero el cliente y sus
		interruptores, que es lo que cambia en cada venta (los interruptores del cliente sólo
		aparecen con un cliente elegido); después una línea y la configuración del día.
	*/
	let etapa_1 = items_con_ancho(['cliente', 'omitir_en_cuenta_corriente', 'alerta_de_cobro', 'enviar_correo'], 12)
	etapa_1.push({ key: KEY_SEPARADOR, id: 'agil_separador_1', cols: 12 })
	etapa_1 = etapa_1.concat(items_con_ancho([
		'metodo_de_pago', 'caja', 'facturacion', 'lista_de_precios', 'tipo_de_venta', 'sucursal',
		'moneda', 'vendedor', 'fecha_de_venta', 'guardar_como_presupuesto',
	], 12))

	/*
		Artículos y servicios: igual que el predeterminado. Se copia de él para heredar la cuenta del
		ancho del buscador (que depende de combos, vinoteca y "pedir la cantidad").
	*/
	let etapa_2 = []
	predeterminado.etapas.etapa_2.forEach(function (item) {
		etapa_2.push({ key: item.key, cols: item.cols })
	})

	/*
		Cierre y opciones: lo contextual arriba (nota de crédito, puntos, chequeo de depósito: cuando
		aparecen se ven sin desplazar), después descuentos, recargos y observaciones, y al final los
		interruptores y datos de menor uso.
	*/
	let etapa_3 = items_con_ancho(['nota_de_credito', 'puntos', 'chequeo_de_deposito'], 12)
	etapa_3 = etapa_3.concat(items_con_ancho(['descuentos', 'recargos', 'observaciones', 'observaciones_ocultas'], 6))
	etapa_3.push({ key: KEY_SALTO_DE_FILA, id: 'agil_salto_de_fila_1', cols: 12 })
	etapa_3 = etapa_3.concat(items_con_ancho(['precios_con_iva', 'descontar_stock', 'estado', 'fecha_de_entrega'], 3))
	etapa_3 = etapa_3.concat(items_con_ancho(['orden_de_compra', 'empleado'], 6))

	return {
		version: 2,
		plantilla: PLANTILLA_AGIL,
		etapas: {
			etapa_1: etapa_1,
			etapa_2: etapa_2,
			etapa_3: etapa_3,
		},
		sacados: [],
		secciones: {
			etapa_1: { titulo: 'Configuración inicial', descripcion: null, color: 'azul', alto: 12, alto_fijo: true, plegado: 'no' },
			etapa_2: { titulo: 'Artículos y servicios', descripcion: null, color: 'verde', alto: 8, alto_fijo: true, plegado: 'no' },
			etapa_3: { titulo: 'Cierre y opciones', descripcion: null, color: 'naranja', alto: 4, alto_fijo: true, plegado: 'no' },
		},
		disposicion: [
			{
				columnas: [
					{ ancho: 4, secciones: ['etapa_1'] },
					{ ancho: 8, secciones: ['etapa_2', 'etapa_3'] },
				],
			},
		],
	}
}
