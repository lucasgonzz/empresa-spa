import Vue from 'vue'
import Vuex from 'vuex'

import auth from '@/store/auth'
import employee from '@/common-vue/store/employee'
import permission from '@/common-vue/store/permission'
import general from '@/common-vue/store/general'
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
import sale from '@/store/sale'
import provider_order from '@/store/provider_order'
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
        general,
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
    }
})
