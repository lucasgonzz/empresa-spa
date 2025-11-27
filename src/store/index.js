import Vue from 'vue'
import Vuex from 'vuex'
 
import auth from '@/store/auth'
import employee from '@/common-vue/store/employee'
import permission from '@/common-vue/store/permission'
import extencion from '@/common-vue/store/extencion'
import general from '@/common-vue/store/general'
import download_resources from '@/common-vue/store/download_resources'
import error from '@/common-vue/store/error'
import belongs_to_many from '@/common-vue/store/belongs_to_many'
import user from '@/common-vue/store/user'
import global_notification from '@/common-vue/store/global_notification'

import chart from '@/store/chart/index'

import papelera from '@/store/papelera/index'

import article from '@/store/article'
import brand from '@/store/brand'
import category from '@/store/category'
import condition from '@/store/condition'
import iva from '@/store/iva'
import iva_condition from '@/store/iva_condition'
import provider from '@/store/provider'
import provider_price_list from '@/store/provider_price_list'
import sub_category from '@/store/sub_category'
import location from '@/store/location'
import current_acount from '@/store/current_acount'
import vender from '@/store/vender/vender'
import discount from '@/store/discount'
import surchage from '@/store/surchage'
import combo from '@/store/combo'
import current_acount_payment_method from '@/store/current_acount_payment_method'
import client from '@/store/client'
import seller from '@/store/seller'
import price_type from '@/store/price_type'
import sale from '@/store/sale/index'
import provider_order from '@/store/provider_order/index'
import provider_order_status from '@/store/provider_order_status'
import provider_order_afip_ticket from '@/store/provider_order_afip_ticket'
import order from '@/store/order'
import order_status from '@/store/order_status'
import buyer from '@/store/buyer'
import delivery_zone from '@/store/delivery_zone'
import payment_method from '@/store/payment_method'
import cupon from '@/store/cupon'
import deposit from '@/store/deposit'
import size from '@/store/size'
import color from '@/store/color'
import article_discount from '@/store/article_discount'
import description from '@/store/description'
import budget from '@/store/budget'
import budget_status from '@/store/budget_status'
import afip_information from '@/store/afip_information'
import production_movement from '@/store/production_movement'
import order_production from '@/store/order_production'
import order_production_status from '@/store/order_production_status'
import recipe from '@/store/recipe'
import address from '@/store/address'
import title from '@/store/title'
import message from '@/store/message'
import payment_method_type from '@/store/payment_method_type'
import configuration from '@/store/configuration'
import service from '@/store/service'
import online_price_type from '@/store/online_price_type'
import order_payment_method_detail from '@/store/order_payment_method_detail'
import report from '@/store/report'
import credit_card from '@/store/credit_card'
import credit_card_payment_plan from '@/store/credit_card_payment_plan'
import commission from '@/store/commission'
import seller_commission from '@/store/seller_commission'
import sale_type from '@/store/sale_type'
// import chart from '@/store/chart'
import pagado_por from '@/store/pagado_por'
import provider_order_extra_cost from '@/store/provider_order_extra_cost'
import article_used_in_recipes from '@/store/article_used_in_recipes'
import update_feature from '@/store/update_feature'
import task from '@/store/task'
import inventory_linkage from '@/store/inventory_linkage'
import inventory_linkage_scope from '@/store/inventory_linkage_scope'
import article_property from '@/store/article_property'
import article_property_type from '@/store/article_property_type'
import article_property_value from '@/store/article_property_value'
import article_variant from '@/store/article_variant'
import online_configuration from '@/store/online_configuration'
import payment_method_installment from '@/store/payment_method_installment'
import plan from '@/store/plan'
import plan_feature from '@/store/plan_feature'
import dolar from '@/store/dolar'
import article_ticket_info from '@/store/article_ticket_info'
import check from '@/store/check'
import panel_control from '@/store/panel_control/index'
import meli_order from '@/store/meli_order'
import me_li_payment from '@/store/me_li_payment'
import articles_pre_import from '@/store/articles_pre_import'
import reportes from '@/store/reportes/index'
import article_pre_import_range from '@/store/article_pre_import_range'
import unidad_medida from '@/store/unidad_medida'
import cheque from '@/store/cheque'
import expense from '@/store/expense'
import expense_concept from '@/store/expense_concept'
import current_acount_payment_method_discount from '@/store/current_acount_payment_method_discount'
import afip_selected_payment_method from '@/store/afip_selected_payment_method'
import unidad_frecuencia from '@/store/unidad_frecuencia'
import pending from '@/store/pending'
import pending_completed from '@/store/pending_completed'

import article_discount_blanco from '@/store/article_discount_blanco'
import article_surchage from '@/store/article_surchage'
import article_surchage_blanco from '@/store/article_surchage_blanco'
 
import tipo_envase from '@/store/tipo_envase'

import deposit_movement from '@/store/deposit_movement/index'
import deposit_movement_status from '@/store/deposit_movement_status'

import cuota from '@/store/cuota'

import caja from '@/store/caja'
import apertura_caja from '@/store/apertura_caja'
import movimiento_caja from '@/store/movimiento_caja'
import concepto_movimiento_caja from '@/store/concepto_movimiento_caja'

import default_payment_method_caja from '@/store/default_payment_method_caja'

import movimiento_entre_caja from '@/store/movimiento_entre_caja'

import consultora_de_precio from '@/store/consultora_de_precio'

import afip_tipo_comprobante from '@/store/afip_tipo_comprobante'


// Lo importo solo para que me ande en table-component
// Es real esta en reportes/article_purchase
import article_purchase from '@/store/article_purchase'

import inventory_performance from '@/store/inventory_performance'

import nota_credito from '@/store/nota_credito'
import pago_de_cliente from '@/store/pago_de_cliente'

// Con afip_ticket cargo los problemas al facturar (facturas con errores y sin cae)
import afip_ticket from '@/store/afip_ticket'

import category_price_type_range from '@/store/category_price_type_range'
import article_price_type_group from '@/store/article_price_type_group'


import concepto_stock_movement from '@/store/concepto_stock_movement'

import devoluciones from '@/store/devoluciones'

// Vinoteca
import bodega from '@/store/bodega'
import cepa from '@/store/cepa'
import promocion_vinoteca from '@/store/promocion_vinoteca'

import road_map from '@/store/road_map/index'
import dealer from '@/store/dealer'

import venta_terminada_commission from '@/store/venta_terminada_commission'

import promocion_vinoteca_commission from '@/store/promocion_vinoteca_commission'

import online_template from '@/store/online_template'
import delivery_day from '@/store/delivery_day'

import article_pdf_observation from '@/store/article_pdf_observation'

import column_position from '@/store/column_position'

import price_type_surchage from '@/store/price_type_surchage'

import payment_plan from '@/store/payment_plan'

import payment_plan_cuota from '@/store/payment_plan_cuota'

import tienda_nube_order from '@/store/tienda_nube_order'
import tienda_nube_order_status from '@/store/tienda_nube_order_status'

import moneda from '@/store/moneda'
import pais_exportacion from '@/store/pais_exportacion'

import provincia from '@/store/provincia'
import provider_discount from '@/store/provider_discount'

import client_reputation from '@/store/client_reputation'

import expense_category from '@/store/expense_category'

import meli from '@/store/meli'

import meli_listing_type from '@/store/meli_listing_type'
import meli_buying_mode from '@/store/meli_buying_mode'
import meli_item_condition from '@/store/meli_item_condition'
import sync_to_meli_article from '@/store/sync_to_meli_article'
import sync_from_meli_article from '@/store/sync_from_meli_article'
import sync_from_meli_order from '@/store/sync_from_meli_order'

import sale_channel from '@/store/sale_channel'
import article_ubication from '@/store/article_ubication'
import stock_suggestion from '@/store/stock_suggestion'
import stock_suggestion_article from '@/store/stock_suggestion_article'

import article_price_range from '@/store/article_price_range'

import turno_caja from '@/store/turno_caja'
import resumen_caja from '@/store/resumen_caja'

import sync_to_tn_article from '@/store/sync_to_tn_article'
import tag from '@/store/tag'


Vue.use(Vuex)

export default new Vuex.Store({
    state: {
    },
    mutations: {
    },
    actions: {
    },
    modules: {
        auth,
        employee,
        permission,
        extencion,
        general,
        download_resources,
        error,
        belongs_to_many,
        user,
        global_notification,

        chart,

        papelera,
        
        article,
        brand,
        category,
        condition,
        iva,
        iva_condition,
        provider,
        provider_price_list,
        sub_category,
        location,
        current_acount,
        vender,
        discount,
        surchage,
        combo,
        current_acount_payment_method,
        client,
        seller,
        price_type,
        sale,
        provider_order,
        provider_order_status,
        provider_order_afip_ticket,
        order,
        order_status,
        buyer,
        delivery_zone,
        payment_method,
        cupon,
        deposit,
        size,
        color,
        article_discount,
        description,
        budget,
        budget_status,
        afip_information,
        production_movement,
        order_production,
        order_production_status,
        recipe,
        address,
        title,
        message,
        payment_method_type,
        configuration,
        service,
        online_price_type,
        order_payment_method_detail,
        report,
        credit_card,
        credit_card_payment_plan,
        commission,
        seller_commission,
        sale_type,
        // chart,
        pagado_por,
        provider_order_extra_cost,
        article_used_in_recipes,
        update_feature,
        task,
        inventory_linkage,
        inventory_linkage_scope,
        article_property,
        article_property_type,
        article_property_value,
        article_variant,
        online_configuration,
        payment_method_installment,
        plan,
        plan_feature,
        dolar,
        article_ticket_info,
        check,
        panel_control,
        meli_order,
        me_li_payment,
        articles_pre_import,
        reportes,
        article_pre_import_range,
        unidad_medida,
        cheque,
        expense,
        expense_concept,
        current_acount_payment_method_discount,
        afip_selected_payment_method,
        unidad_frecuencia,
        pending,
        pending_completed,

        article_discount_blanco,
        article_surchage,
        article_surchage_blanco,

        tipo_envase,

        deposit_movement,
        deposit_movement_status,

        cuota,

        caja,
        apertura_caja,
        movimiento_caja,
        concepto_movimiento_caja,

        default_payment_method_caja,

        movimiento_entre_caja,

        consultora_de_precio,

        afip_tipo_comprobante,

        article_purchase,

        inventory_performance,

        nota_credito,
        pago_de_cliente,

        afip_ticket,

        category_price_type_range,
        article_price_type_group,

        concepto_stock_movement,

        devoluciones,


        // Vinoteca
        bodega,
        cepa,
        promocion_vinoteca,

        road_map,
        dealer,

        venta_terminada_commission,

        promocion_vinoteca_commission,

        online_template,
        delivery_day,

        article_pdf_observation,

        column_position,

        price_type_surchage,

        payment_plan,

        payment_plan_cuota,

        tienda_nube_order,
        tienda_nube_order_status,

        moneda,
        pais_exportacion,

        provincia,
        provider_discount,

        client_reputation,
        expense_category,

        meli,

        meli_listing_type,
        meli_buying_mode,
        meli_item_condition,
        sync_to_meli_article,
        sync_from_meli_article,
        sync_from_meli_order,

        sale_channel,
        article_ubication,
        stock_suggestion,
        stock_suggestion_article,

        article_price_range,

        turno_caja,
        resumen_caja,

        sync_to_tn_article,
        tag,
    }
})
