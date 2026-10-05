/*
	Balanza (misión balanzas-configurables, 3/10/2026).

	Las balanzas dejaron de ser extensiones (`balanza_bar_code`, `plu_balanza_bar_code`) y pasaron a
	ser una configuración del dueño: en Configuración → Modulo de VENDER → "Tickets de balanza" elige
	"Por PLU" o "Por balanza". Con "Por balanza" aparece esta solapa (ABM → Balanzas, ver
	src/mixins/abm.js) y cada fila es una balanza: el código con el que empiezan sus tickets, el
	artículo al que se imputan y si el ticket trae el importe o el peso.

	Cómo se lee un ticket (la misma regla en la API, BalanzaHelper, y en la SPA sin conexión,
	src/utils/balanzas.js): gana la balanza cuyo código es el comienzo más largo del ticket; el valor
	son los `digitos` números anteriores al último (que es el verificador): 7 para el importe y 5 para
	el peso si se deja vacío.

	El prefijo lo valida la API, con un 422 y un mensaje propio que el formulario muestra en su aviso
	(common-vue/components/model/Index.vue::setSaveErrorFromApi) y el handler global en un toast:
	le saca lo que no es numero y exige de 1 a 6 numeros ("El código de la balanza tiene que tener
	entre 1 y 6 números."), y no deja repetirlo para el mismo dueño ("Ya tenés otra balanza con el
	código XX"). `digitos` lo guarda de 1 a 12; vacio o fuera de rango queda null (el default).
*/
export default {
	properties: [
		{
			text: 'Nombre',
			key: 'nombre',
			type: 'text',
			value: '',
			is_title: true,
			descriptions: [
				'Un nombre para reconocerla en esta lista, por ejemplo "Balanza carnicería". Es opcional.',
			],
		},
		{
			text: 'Código con el que empieza el ticket',
			// La columna de la tabla va corta: el texto largo solo se lee en el formulario.
			table_text: 'Código del ticket',
			key: 'prefijo',
			type: 'text',
			value: '',
			required: true,
			descriptions: [
				'Son los primeros números del código de barras que imprime esta balanza. Por ejemplo, si sus tickets son 2201000027143 y 2202000085805, el código es 22.',
				'Solo números, de 1 a 6. Dos balanzas no pueden tener el mismo código.',
				'Si cargás dos balanzas con códigos que se pisan, por ejemplo 22 y 2203, el ticket que empieza con 2203 va a la de 2203: gana el código más largo.',
			],
		},
		{
			text: 'Artículo',
			key: 'article_id',
			/*
				Mismo buscador que el artículo de una receta (src/models/recipe.js): busca contra la
				API, no contra el store, porque hay cuentas con miles de artículos y el resultado no
				puede depender de que la descarga haya terminado. La tabla y el formulario muestran el
				nombre con la relación `article` que manda la API.
			*/
			store: 'article',
			type: 'search',
			value: '',
			required: true,
			search_from_api: true,
			route_to_search: 'vender/buscar-articulo-por-nombre/1',
			/*
				La recomendacion del segundo renglon no es de estilo: un ticket con importe de un
				articulo que ya esta en la venta CON SU PROPIO PRECIO (de lista) se suma a ESE renglon
				(un ticket nunca crea un segundo renglon del mismo articulo sin variante: para el store
				de VENDER serian la misma linea, es_la_misma_linea), y para no perder ese precio lo pasa
				a la primera fila de varios precios (ArticleBarCode.vue::pasar_precio_del_renglon_a_fila).
				Desde ahi el renglon queda con su precio fijo: ya no lo recalculan la lista, el metodo de
				pago ni las ofertas por cantidad. Con un articulo general sin precio -el caso de
				Panchito- eso no pasa nunca: el renglon arranca en $0 y cada ticket es una fila.
			*/
			descriptions: [
				'El artículo al que se le imputa cada ticket de esta balanza, por ejemplo "Carnicería".',
				'Si la balanza imprime el importe, usá un artículo general sin precio (por ejemplo "Carnicería", "Verdulería"): el precio lo pone cada ticket. Si imprime el peso, usá el artículo que se pesa, con su precio por kilo.',
			],
		},
		{
			text: 'Qué trae el ticket',
			table_text: 'El ticket trae',
			key: 'tipo_dato',
			type: 'select',
			value: 'importe',
			required: true,
			options: [
				{text: 'Importe', value: 'importe'},
				{text: 'Peso', value: 'peso'},
			],
			descriptions: [
				'Importe: el ticket trae el precio a cobrar. Si el artículo ya está en la venta, el importe se suma como un precio más del mismo renglón; si no está, se agrega con ese importe.',
				'Peso: el ticket trae el peso y el artículo se agrega con esa cantidad, a su precio de lista (en kilos, o en gramos si el artículo se vende por gramo).',
			],
		},
		{
			text: 'Dígitos del importe o del peso',
			table_text: 'Dígitos',
			key: 'digitos',
			type: 'number',
			value: '',
			descriptions: [
				'Cuántos números del ticket son el importe o el peso, de 1 a 12. Se cuentan hacia atrás desde el anteúltimo número del código, porque el último es el dígito verificador.',
				'Dejalo vacío si no lo sabés: se usan 7 para el importe y 5 para el peso, que es lo más común. Un número fuera de 1 a 12 también queda vacío.',
			],
		},
	],
	abm_descripcion: {
		para_que_sirve: 'Configura las balanzas que imprimen tickets con código de barras: con qué código empieza cada ticket, a qué artículo se imputa y si trae el importe o el peso.',
		implicancias: 'En VENDER, cuando se escanea un código que no es el de ningún artículo, se busca la balanza cuyo código coincide con el comienzo del ticket (gana el más largo). Si el ticket trae el importe y el artículo ya está en la venta, el importe se suma como un precio más del mismo renglón; si no está, se agrega con ese importe. Si trae el peso, el artículo se agrega con esa cantidad. Solo se usa con "Por balanza" elegido en Configuración → Modulo de VENDER → Tickets de balanza.',
		como_se_utiliza: 'Elegí "Por balanza" en Configuración → Modulo de VENDER → Tickets de balanza. Después cargá acá una balanza por cada código de ticket: el código con el que empieza (por ejemplo 22), el artículo (por ejemplo "Carnicería") y si el ticket trae el importe o el peso.',
		palabras_clave: ['balanza', 'báscula', 'etiqueta', 'carnicería', 'verdulería', 'fiambrería', 'ticket', 'peso'],
	},
	singular_model_name_spanish: 'Balanza',
	plural_model_name_spanish: 'Balanzas',
	create_model_name_spanish: 'Nueva',
	text_delete: 'la',
}
