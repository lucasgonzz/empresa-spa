/*
	Catalogos que se descargan al iniciar sesion (los pide
	common-vue/components/download-resources/Index.vue).

	🔴 ESTA LISTA NO ES "todo lo que el sistema necesita": es lo que hace falta tener en memoria
	DESDE EL ARRANQUE. Lo que solo usa un modulo se pide al entrar a ese modulo. Sacar algo de
	aca no es gratis -- hay que dejar a alguien pidiendolo -- pero agregar algo tampoco: cada
	entrada es peso en la respuesta del arranque de los ~40 clientes.

	Salieron cinco en la mision 43 (12/8/2026), cada uno por un motivo distinto:

	- 'provider': ya estaba decidido en el grupo 332 (4/8/2026) y la entrada quedo colgada. El
	  buscador va contra la API y la tabla lee la relacion embebida; los lugares que necesitan el
	  catalogo entero lo piden ellos (panel-control/proveedores/Index.vue, los dos modales de
	  importacion, y mixins/global_notification_functions.js despues de importar).
	- 'sale': lo pide el modulo de Ventas en su created() (views/Ventas.vue), igual que
	  DepositoParaCheckear y DepositoCheckeadas. Ademas su index() del backend exige $modulo.
	- 'order': lo pide el modulo de pedidos online (components/online/components/orders/Index.vue).
	  No es un catalogo: es una tabla transaccional que crece con el uso. Bajarla al arrancar
	  ademas duplicaba la alerta de pedidos sin confirmar (ver mixins/alert_infos.js).
	- 'recipe': lo piden las vistas de produccion (views/Produccion.vue y views/ProduccionV2.vue).
	- 'permission': lo pide el modulo de empleados (common-vue/views/Employee.vue). Es la lista
	  de checkboxes del formulario de empleado, NO el can() del usuario logueado -- esos permisos
	  viajan adentro del usuario cuando resuelve la sesion y no tocan este store.
*/
export default [
    // 'extencion',

    {
        model_name: 'bodega',
        if_has_extencion: 'vinoteca',
    },
    {
        model_name: 'cepa',
        if_has_extencion: 'vinoteca',
    },
    {
        model_name: 'recipe_route_type',
        if_has_extencion: 'productionV2',
    },
    {
        model_name: 'production_batch_status',
        if_has_extencion: 'productionV2',
    },
    {
        model_name: 'production_batch_movement_type',
        if_has_extencion: 'productionV2',
    },
    
    // Deben descargarse antes que 'table_column_preference': su bootstrap calcula ya las
    // columnas dinamicas de articulo (listas de precio, depositos, descuentos por metodo de
    // pago) usando estas colecciones, y si estan vacias en ese momento, esas columnas quedan
    // afuera de props_to_show para el resto de la sesion (prompt 255).
    'address',
    'current_acount_payment_method_discount',
    'price_type',
    'table_column_preference',
    'pdf_column_option',
    'pdf_column_profile',
    'employee',
    'sale_channel',
    'sale_status',
    'meli_listing_type',
    'meli_buying_mode',
    'meli_item_condition',
    'article_ubication',
    'online_template',
    'platform',
    'pais_exportacion',
    'moneda',
    // 'client',
    // 'provider',  -> lo pide cada pantalla que lo necesita (ver la nota de arriba)
    'column_position',
    'c_a_payment_method_type',
    'current_acount_payment_method',
    'afip_tipo_comprobante',
    'afip_information',
    'concepto_stock_movement',
    'category_price_type_range',
    'article_price_type_group',
    'provider_order_status',
    'category',
    'order_status',
    'tienda_nube_order_status',
    'default_payment_method_caja',
    'order_production_status',
    'deposit_movement_status',
    'budget_status',
    'cuota',
    'concepto_movimiento_caja',
    'caja',
    'turno_caja',
    'tipo_envase',
    'article',
    'unidad_frecuencia',
    'afip_selected_payment_method',
    'expense_concept',
    'expense_category',
    'article_pre_import_range',
    'unidad_medida',
    'article_property_type',
    'article_property_value',
    // 'task',
    // 'permission',  -> lo pide common-vue/views/Employee.vue (ver la nota de arriba)
    'sale_type',
    'discount',
    'surchage',
    'brand',
    'condition',
    // 'recipe',  -> lo piden las vistas de produccion (ver la nota de arriba)
    'iva',
    'iva_condition',
    'sub_category',
    'provincia',
    'location',
    'seller',
    'payment_method',
    'payment_method_type',
    // 'commission',
    'commission',
    'delivery_day',
    'delivery_zone',
    // 'sale',  -> lo pide views/Ventas.vue en su created() (ver la nota de arriba)
    'sale_sender_info',
    // 'credit_card',
    // 'credit_card_payment_plan',
    // 'order',  -> lo pide el modulo de pedidos online (ver la nota de arriba)
    'online_price_type',
    // 'buyer',
    'inventory_linkage_scope',
    'article_ticket_info',
    'client_reputation',
    'inputs_size',
]