<template>
<div>
    <confirm
    model_name="current_acount"
    :text="delete_text"
    :actions="actions"
    show_compensar_caja_checkbox
    @confirmed_final="model_deleted"
    id="delete-current-acount"
    toast="Cuenta corriente eliminada"></confirm>
    
    <confirm-afip-tickets></confirm-afip-tickets>
    <send-afip-tickets></send-afip-tickets>
    
    <update-prices></update-prices>

    <unidades-entregadas></unidades-entregadas>
    <acopio-article-deliveries></acopio-article-deliveries>

    <pago></pago>    
    <nota-credito></nota-credito>    
    <nota-debito></nota-debito>    
    <import></import>    
    <saldo-inicial></saldo-inicial>    
    <checks-details></checks-details>    
    <payment-methods-details></payment-methods-details>  
    <pagado-por></pagado-por>  

    <model-index
    :show_btn_remove_belongs_to_many="false"
    model_name="budget">
        <template v-slot:model_modal_header="props">
            <budget-modal-buttons></budget-modal-buttons>
        </template>
    </model-index>

    <model-index
    model_name="order_production">
        <template v-slot:default="props">
            <order-production-modal-buttons></order-production-modal-buttons>
        </template>
    </model-index>  

    <model-index
    model_name="provider_order"></model-index>  

    <sale-modal></sale-modal>

    <b-modal 
    id="current-acounts" 
    ref="current_acounts"
    :title="title" 
    modal-class="cuenta-corriente-modal"
    size="xl" 
    body-class="p-0">
        <current-acounts-nav></current-acounts-nav>
        <!-- <color-info></color-info> -->
        <saldo-y-limite></saldo-y-limite>
        <list></list>

        <!--
            🔴 El footer va en el slot #modal-footer y NO suelto adentro del body, que es donde
            vivio hasta el 21/8/2026 con `hide-footer` puesto. Asi hereda el chasis que
            _modals.sass declara para TODOS los modales del sistema (mision 29): franja de 60px,
            radio de 16px en las dos esquinas de abajo y separador por token. Escrito como un
            bloque mas del cuerpo, esa franja habia que dibujarla a mano y quedaba distinta a la
            de cualquier otro modal del sistema.
        -->
        <template #modal-footer>
            <btn-pago-nota-credito></btn-pago-nota-credito>
        </template>
    </b-modal>
</div>
</template>
<script>
import current_acounts from '@/mixins/current_acounts'
// Modals
import Confirm from '@/common-vue/components/Confirm.vue' 
import Pago from '@/components/common/current-acounts/pago/Index'
import NotaCredito from '@/components/common/current-acounts/NotaCredito.vue'
import NotaDebito from '@/components/common/current-acounts/NotaDebito.vue'
import Import from '@/components/common/current-acounts/Import.vue'
import SaldoInicial from '@/components/common/current-acounts/SaldoInicial.vue'
import ChecksDetails from '@/components/common/current-acounts/ChecksDetails.vue'
import PaymentMethodsDetails from '@/components/common/current-acounts/payment-methods-details/Index'
import PagadoPor from '@/components/common/current-acounts/pagado-por/Index'
// import PrintBudget from '@/components/produccion/modals/budgets/Print'
import Model from '@/common-vue/components/model/Index'

// Components
// import BudgetModalButtons from '@/components/presupuestos/components/ModalButtons'
// import OrderProductionModalButtons from '@/components/produccion/components/order-productions/ModalButtons'
import CurrentAcountsNav from '@/components/common/current-acounts/Nav'
import ColorInfo from '@/components/common/current-acounts/ColorInfo'
import List from '@/components/common/current-acounts/List'
import BtnPagoNotaCredito from '@/components/common/current-acounts/BtnPagoNotaCredito'
export default {
    name: 'CurrentAcountIndex',
    mixins: [current_acounts],
    components: {
        // Modals
        Confirm,
        Pago, 
        NotaCredito,
        NotaDebito,
        Import,
        SaldoInicial,
        ChecksDetails,
        PaymentMethodsDetails,
        PagadoPor,
        // PrintBudget,
        Model,
        
        // Components
        // BudgetModalButtons,
        // OrderProductionModalButtons,
        CurrentAcountsNav,
        ColorInfo,
        List,
        BtnPagoNotaCredito,
        SaldoYLimite: () => import('@/components/common/current-acounts/SaldoYLimite'),
        ModelIndex: () => import('@/common-vue/components/model/Index'),
        SaleDetails: () => import('@/components/ventas/modals/details/Index'),
        BudgetModalButtons: () => import('@/components/budget/components/ModalButtons'),
        OrderProductionModalButtons: () => import('@/components/produccion/components/order-productions/ModalButtons'),
        SaleModal: () => import('@/components/common/SaleModal'),
        ConfirmAfipTickets: () => import('@/components/ventas/modals/afip-ticket/ConfirmAfipTickets'),
        SendAfipTickets: () => import('@/components/ventas/modals/afip-ticket/SendAfipTickets'),
        UpdatePrices: () => import('@/components/ventas/modals/update-prices/Index'),
        UnidadesEntregadas: () => import('@/components/ventas/modals/unidades-entregadas/Index'),
        AcopioArticleDeliveries: () => import('@/components/ventas/modals/unidades-entregadas/AcopioArticleDeliveries'),
    },
    computed: {
        title() {
            if (this.from_model) {
                let moneda = this.get_store_model('moneda', this.from_credit_account.moneda_id)
                if (moneda) {
                    // Decia `Cuenta corriente en  de ...`: el "en" y el doble espacio eran el resto
                    // de una edicion vieja que nunca se limpio.
                    return `Cuenta corriente de ${this.from_model.name} · ${moneda.name}`
                }
            }
            return ''
        },
        delete() {
            return this.$store.state.current_acount.delete
        },
        delete_text() {
            if (this.delete) {
                return 'este cuenta con saldo de $'+this.delete.saldo
            }
            return ''
        },
        actions() {
            return [
                'current_acount/delete',
                'current_acount/getModels',
            ]
        },
    },
    methods: {
        model_deleted() {
            this.loadModel(this.from_model_name, this.from_model.id)
        }
    }
}
</script>
<style lang="sass">
// ══════════════════════════════════════════════════════════════════════════════════════════════
// CHASIS VISUAL DEL MODAL DE CUENTA CORRIENTE (21/8/2026)
//
// UN SOLO MODAL PARA LAS DOS PUNTAS. `common/current-acounts/Index.vue` lo montan doce vistas
// --clientes, proveedores, ventas, presupuestos, alertas, rutas, listado, por-entregar,
// por-estado-- y las dos puntas que le importan a quien lo usa (la cuenta corriente de un CLIENTE
// y la de un PROVEEDOR) son el mismo componente con otro `from_model_name`. Lo que se escribe aca
// vale para las dos por construccion: no hay dos copias que sincronizar.
//
// ⚠️ Si estas buscando el otro `current-acounts/` --el de `components/ventas/modals/`--: ese
// Index.vue no lo monta nadie, asi que editarlo no cambia nada de lo que se ve. Pero la carpeta NO
// esta muerta entera: `current-acounts/ChecksDetails.vue` de ACA importa `pago/CheckComponent.vue`
// de ALLA. O sea que borrarla rompe el detalle de cheques de este mismo modal.
//
// POR QUE ESTE <style> NO LLEVA `scoped`. Casi todo lo de abajo tiene que alcanzar el interior de
// componentes hijos --el b-table que dibuja TableComponent.vue, los botones que declara
// models/current_acount.js, el boton de "Cerrar venta" que llega de otro modulo--. Un estilo con
// scope no cruza esa frontera. Por eso TODO va anidado bajo `.cuenta-corriente-modal`, que entra
// por la prop `modal-class` del b-modal: sin ese anidado, estas reglas se le filtrarian a las
// treinta y pico de pantallas que usan la misma tabla generica.
//
// LOS COLORES SALEN SIEMPRE DE TOKENS, nunca de hexadecimales. Los modales de bootstrap-vue se
// montan colgando de body, FUERA de #app --por eso los tokens viven en `:root` y no en `#app`,
// explicado en el encabezado de _dark_theme.sass--. Un hex aca deja el modal blanco en modo
// oscuro. Los dos unicos literales son el `#f1f3f4` sobre el header oscuro de la tabla y el `#fff`
// sobre un fondo de accion, y los dos estan justificados donde aparecen.
// ══════════════════════════════════════════════════════════════════════════════════════════════

// Regla heredada, se deja EXACTAMENTE como estaba y fuera del anidado a proposito: es global desde
// antes de esta mision y no se pudo ubicar con certeza que la usa (no la genera TableComponent.vue
// ni b-table). Moverla adentro de `.cuenta-corriente-modal` la acotaria, que es un cambio de
// alcance disfrazado de prolijidad.
.detalle
	max-width: 100px

.cuenta-corriente-modal
	// Los controles de este modal hablan el MISMO idioma que la barra de encabezado de los
	// listados (_toolbar_botones.sass, mision 13): misma altura, mismo radio, misma separacion y
	// la misma sombra muy leve. No se eligen numeros nuevos: se toman los tokens de alla. El
	// fallback esta por si algun dia esa hoja global deja de cargar antes que este chunk.
	--cc-control-h: var(--toolbar-control-h, 36px)
	--cc-btn-radio: var(--toolbar-btn-radius, 10px)
	--cc-gap: var(--toolbar-btn-gap, 8px)
	--cc-grupo-gap: var(--toolbar-group-gap, 16px)
	--cc-btn-sombra: var(--toolbar-btn-shadow, rgba(99, 99, 99, 0.12) 0px 1px 3px 0px)

	// Radio de la caja de la tabla. Copiado de .tabla-modulo-wrapper (_controles_modulo.sass),
	// que a su vez lo copio de .cont-table-wrapper del Display generico.
	--cc-tabla-radio: 12px

	// Botones que viven DENTRO de una celda. Son mas chicos que los de la barra porque comparten
	// la fila con el dato: si midieran los 36px de la barra, cada fila creceria a la altura del
	// boton y la tabla dejaria de leerse como una lista.
	--cc-btn-celda-h: 30px
	--cc-btn-celda-radio: 8px

	// Fila seleccionada. Va como token y no suelto porque es el estado CENTRAL de este modal: se
	// elige un movimiento y el footer cambia a "Registrar pago para ...". Reemplaza al
	// `rgba(0,0,0,.7)` con texto blanco que le pone TableComponent.vue a toda fila seleccionada
	// del sistema, que aca pintaba de negro justo la fila cuyos importes hay que leer para
	// decidir el pago.
	--cc-fila-sel: rgba(0, 123, 255, 0.10)
	--cc-fila-sel-hover: rgba(0, 123, 255, 0.16)

	// El modal va con `body-class="p-0"`: el aire lo pone cada bloque (la barra, la lista), asi la
	// tabla puede llegar hasta donde quiera sin pelearse con un padding del contenedor.
	.modal-body
		background: var(--bg-card)

	// ─── La tabla ────────────────────────────────────────────────────────────────────────────
	// El chasis va en un wrapper EXTERNO y no sobre el elemento que scrollea: por spec el
	// border-radius de un elemento no recorta sus propias barras de scroll, asi que con el radio
	// puesto sobre `.table-component-scroll` --que es el que tiene overflow:auto-- la barra
	// horizontal aparece cortando la curva. Es el mismo motivo por el que existen
	// .cont-table-wrapper en el Display y .tabla-modulo-wrapper en el modulo de IA.
	//
	// El modificador `--con-datos` lo pone List.vue solo cuando hay movimientos: sin el, una
	// cuenta vacia mostraria una caja con sombra alrededor del cartel de "Sin movimientos", que es
	// exactamente lo contrario de lo que un estado vacio tiene que hacer.
	// 🔴 EL ALTO DE LA TABLA. Medido en la aplicacion corriendo el 21/8/2026, con el modal abierto
	// sobre un proveedor con dos movimientos en 1440x900.
	//
	// TableComponent.vue le pone al contenedor que scrollea un `height` INLINE --no un
	// max-height-- igual a `window.innerHeight - contenedor.top - 8` (container_style(), y su
	// unica excepcion es `is_from_search_modal`). En un listado eso es exactamente lo que se
	// quiere: la tabla llega hasta el fondo de la ventana. Adentro de un modal produce dos cosas
	// malas a la vez, y las dos se ven:
	//
	//   1. Todo lo que va DESPUES de la tabla queda fuera de la pantalla por construccion. Medido:
	//      footer en top 630 con la ventana en 900. O sea que "Registrar pago" --la accion
	//      principal del modal-- solo se ve scrolleando. Ya pasaba antes de esta mision con los
	//      botones sueltos en el cuerpo; con la franja de 60px del footer del sistema son ~80px en
	//      vez de ~46px.
	//   2. Con pocas filas queda media pantalla de caja blanca vacia debajo de la ultima.
	//
	// Se corrige donde se puede sin tocar el componente compartido: `height: auto` con !important
	// (una regla !important le gana a un estilo inline normal) y un tope propio que ya descuenta
	// el chrome del modal --header 60 + barra ~64 + aire 36 + footer 60, mas los margenes del
	// dialogo--. Con eso la tabla mide lo que miden sus filas y recien scrollea cuando pasa el
	// tope, que es el comportamiento que TableComponent ya tiene para el modal de busqueda.
	.cc-tabla-wrapper .table-component-scroll
		height: auto !important
		max-height: calc(100vh - 320px) !important

	// En una ventana muy baja --telefono acostado-- esa resta deja la tabla en casi nada o en
	// negativo. Ahi manda un porcentaje del alto, que degrada bien.
	@media screen and (max-height: 560px)
		.cc-tabla-wrapper .table-component-scroll
			max-height: 45vh !important

	.cc-tabla-wrapper--con-datos
		border-radius: var(--cc-tabla-radio)
		overflow: hidden
		// Mismo valor y mismo token que .cont-table-wrapper: el gris claro de la sombra es
		// invisible sobre fondo oscuro, por eso el color va por token.
		box-shadow: var(--shadow-color) 0px 2px 8px 0px

		// El radio lo pone el wrapper. La tabla de adentro trae el suyo propio
		// (`border-radius: 10px 10px 10px 0` en TableComponent.vue, y encima con la esquina de
		// abajo a la derecha en cero): las dos curvas juntas dejan una media luna del fondo
		// asomando en cada esquina.
		.table-component-scroll .table.table-component-b-table,
		.table-component-scroll table.table
			border-radius: 0

		// _tables.sass le pone a TODO tbody del sistema `border: 2px solid #DDDDDD` y un radio
		// propio abajo (lineas 11-14). Adentro de la caja redondeada ese marco se ve como un
		// rectangulo mal recortado, y en modo oscuro ademas queda gris claro sobre oscuro.
		tbody
			border: none
			border-radius: 0

		thead th
			// Token DEDICADO y no --bg-section: el header de tabla va oscuro en los DOS modos
			// (decision de Lucas, 5/8/2026, grupo 360). Es la misma regla que el th del Display y
			// la de .tabla-modulo.
			background-color: var(--bg-table-header)
			// Literal a proposito, y es uno de los dos de esta hoja: el texto va sobre un header
			// oscuro en los dos modos, asi que --color-text-primary no sirve (en claro es #212529
			// y no se leeria). Mismo valor que .cont-th del Display.
			color: #f1f3f4
			// Bootstrap le pone al thead th un `border-bottom: 2px solid #dee2e6` que sobre el
			// header oscuro queda como una linea clara que ninguna otra tabla del sistema tiene.
			border-top: none
			border-bottom: none
			// 🔴 !important, y no es adivinado: TableComponent.vue declara
			// `.table th, .table td { padding: 5px !important }` en un style sin scope y cargado
			// global, activo siempre porque $table_font_small es true en _custom.scss. Un
			// !important le gana a cualquier regla normal por mas clases que tenga, asi que sin
			// este el padding de aca se ve pisado en el navegador aunque en el codigo parezca
			// ganar. Es el mismo caso que ya documenta _controles_modulo.sass.
			padding: 10px 14px !important
			font-size: 0.8125rem
			font-weight: 600
			white-space: nowrap
			vertical-align: middle

		td
			// Mismo motivo que el thead de arriba.
			padding: 8px 14px !important
			vertical-align: middle
			font-size: 0.875rem
			border-top: 1px solid var(--color-border)

		// La primera fila pega contra el header oscuro: la linea de arriba sobra.
		tbody tr:first-child td
			border-top: none

		// 🔴 El hover se pinta en el td y NO en el tr, y no es capricho: _tables.sass declara
		// `table tbody tr { background-color: #FFF !important }` para modo claro y _dark_theme.sass
		// declara su contraparte oscura tambien con !important. Un !important no se vence sin otro
		// !important. El td es OTRO elemento: su fondo se dibuja encima del de la fila y no compite
		// con ninguna de las dos reglas.
		tbody tr:hover > td
			background-color: var(--bg-hover)

		// La fila seleccionada. Necesita !important porque `.table .b-table-row-selected td` de
		// TableComponent.vue ya lo tiene; entre dos !important decide la especificidad, y este
		// selector suma mas clases.
		tbody tr.b-table-row-selected > td
			background-color: var(--cc-fila-sel) !important
			color: var(--color-text-primary) !important

		tbody tr.b-table-row-selected:hover > td
			background-color: var(--cc-fila-sel-hover) !important

		// TableComponent le pone al tr seleccionado `border: 2px solid $blue !important`. Un borde
		// sobre un tr lo dibuja cada celda por separado y quedaba una linea cortada entre columna y
		// columna. Se reemplaza por un acento macizo al costado izquierdo, que es la señal que ya
		// usa el resto del sistema para "esta es la fila elegida".
		tbody tr.b-table-row-selected
			border: none !important

		tbody tr.b-table-row-selected > td:first-child
			box-shadow: inset 3px 0 0 var(--color-primary)

		// ─── Los botones que viven adentro de una celda ───────────────────────────────────────
		// Son cinco y venian de cinco lugares distintos: los dos que declara
		// models/current_acount.js (el detalle del movimiento y "Ver Info", los dos en celeste
		// `info`), el de metodos de pago (azul macizo), el de borrar (rojo macizo) y el de "Cerrar
		// venta" que llega de otro modulo (outline verde, `size="sm"`). Convivian cuatro alturas y
		// cuatro pesos visuales en la misma celda.
		//
		// Esta regla les da UNA geometria. El color lo sigue poniendo la variante de cada uno, que
		// es lo unico que de verdad los distingue.
		.btn
			height: var(--cc-btn-celda-h)
			display: inline-flex
			align-items: center
			justify-content: center
			gap: 6px
			padding: 0 10px
			font-size: 0.8125rem
			font-weight: 500
			line-height: 1
			border-radius: var(--cc-btn-celda-radio)
			box-shadow: none
			white-space: nowrap
			transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease

			// Los iconos `icon-*` del sistema se dibujan con un ::before al que _generals.sass le
			// pone `top: .15em` y margenes laterales, pensado para un icono adentro de un parrafo.
			// En un boton flex el centrado lo da el contenedor, asi que se apaga. El reset va sobre
			// el ::before y no sobre el <i>: la regla global apunta al pseudoelemento, y sobre el <i>
			// no vencia nada. Los `bi bi-*` ni siquiera entran por ahi --el selector es
			// [class^='icon-'] y ellos empiezan con `bi`--, pero el resto de esta regla si los toca.
			i,
			i::before
				top: 0
				margin: 0
				line-height: 1

		// Las dos columnas que declara models/current_acount.js usan la variante `info`, que es el
		// celeste de bootstrap: dos botones celestes macizos por fila gritaban mas que el importe
		// de al lado, que es el dato que se viene a leer. Pasan a leerse como texto accionable, que
		// es lo que son: abren el comprobante.
		//
		// ⚠️ Sube el contraste pero NO lo resuelve: --color-primary en claro es #007bff sobre
		// blanco = 3,99:1, y a 0.8125rem el texto no es "large", asi que sigue abajo del 4,5:1 de
		// AA. Es el azul del sistema y esta en todas las pantallas, o sea que no es un problema que
		// nazca aca ni que se pueda cerrar aca; queda anotado para cuando se revise la paleta.
		.btn-info
			background: transparent
			border: 1px solid transparent
			color: var(--color-primary)

			&:hover,
			&:focus,
			&:not(:disabled):not(.disabled):active
				background: var(--bg-hover)
				border-color: var(--color-border)
				color: var(--color-primary)
				box-shadow: none

		// El neutro de celda: hoy lo usa el boton de metodos de pago, que era azul macizo. La
		// variante `light` de bootstrap ya trae su contraparte oscura en _dark_theme.sass; lo que
		// le falta es el borde, sin el cual sobre una fila blanca no se ve donde termina.
		.btn-light
			background: var(--bg-card)
			border: 1px solid var(--color-border)
			color: var(--color-text-primary)

			&:hover,
			&:focus,
			&:not(:disabled):not(.disabled):active
				background: var(--bg-hover)
				border-color: var(--color-border)
				color: var(--color-text-primary)
				box-shadow: none

			// El badge "Provisorio" viaja adentro de este boton: va en el gris de la superficie
			// para que no compita con el texto del propio boton.
			.badge
				background: var(--bg-section)
				color: var(--color-text-secondary)
				border: 1px solid var(--color-border)
				font-weight: 500

		// Borrar un movimiento: de rojo macizo a rojo suave, con los mismos tres tokens que uso el
		// footer del modal de formulario (mision 2). Cuando todos los botones gritan no se destaca
		// ninguno, y el que menos deberia gritar es el unico irreversible de la fila.
		.btn-danger
			background: var(--btn-peligro-fondo)
			border: 1px solid var(--btn-peligro-borde)
			color: var(--btn-peligro-texto)

			&:hover,
			&:focus,
			&:not(:disabled):not(.disabled):active
				background: var(--btn-peligro-borde)
				border-color: var(--btn-peligro-borde)
				// Literal, y es el segundo y ultimo de esta hoja: es texto sobre el rojo de accion,
				// que es el mismo color en los dos modos.
				color: #fff
				box-shadow: none

		// Los badges de estado de la fila (Facturado / Factura sin cae / Acopio / Cerrada). El
		// radio de 4px de bootstrap al lado de botones de 8px se lee como otro sistema.
		.badge
			border-radius: 999px
			padding: 4px 9px
			font-size: 0.75rem
			font-weight: 600
			letter-spacing: 0.01em

		// La celda de acciones. TableComponent la declara como flex centrado pero sin separacion,
		// asi que cada boton traia su propio `m-l-5` / `m-r-15` y la distancia entre un par y el
		// siguiente quedaba despareja. La separacion la da el contenedor.
		.cont-edit
			gap: var(--cc-gap)
			justify-content: flex-start

			// 🔴 `display: contents` y no `> div:empty { display: none }`, que fue el primer
			// intento y cubria solo la mitad de los casos.
			//
			// Cada componente de la celda envuelve su boton en un div propio, y CerrarVenta anida
			// DOS. Con el div como item del flex, un v-if que no dibuja nada igual se lleva su gap
			// alrededor. `:empty` tapaba el caso de un div con solo un comentario adentro (Vue deja
			// `<!---->`, y :empty ignora comentarios), pero NO el de CerrarVenta con la extension
			// `cerrar_ventas` prendida y sin boton ni badge para mostrar: ahi el div de afuera
			// contiene al de adentro, asi que no esta vacio.
			//
			// Con `display: contents` los envoltorios dejan de generar caja: el boton de adentro
			// pasa a ser item directo del flex y un envoltorio sin contenido no ocupa ni se lleva
			// gap, tenga adentro un comentario, otro div, o nada.
			> div,
			> div > div
				display: contents

			// La separacion la da el gap del contenedor. Estos margenes los escribe cada
			// componente (`m-l-5` en CerrarVenta, `m-l-15` en otros) y salen de _helpers.scss con
			// !important, asi que hay que igualarlos. Van por descendiente y no por `> *`: con
			// `display: contents` arriba, los botones ya no son hijos directos.
			.btn,
			.badge
				margin: 0 !important

	// ─── Modo oscuro ─────────────────────────────────────────────────────────────────────────
	// Solo los dos tokens que se declaran como rgba de un color de accion: el resto de la hoja usa
	// tokens que ya tienen su contraparte en html.dark-mode.
	html.dark-mode &
		--cc-fila-sel: rgba(77, 163, 255, 0.16)
		--cc-fila-sel-hover: rgba(77, 163, 255, 0.24)
</style>
