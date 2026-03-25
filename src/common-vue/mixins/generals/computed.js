import moment from 'moment'

export default {
    computed: {
        user() {
            return this.$store.state.auth.user
        },
        authenticated() {
            return this.$store.state.auth.authenticated
        },
        is_owner() {
            return this.user && !this.user.owner_id
        },
        is_admin() {
            return this.user && (this.is_owner || this.user.admin_access)
        },
        owner_id() {
            if (this.user.owner_id) {
                return this.user.owner_id
            }
            return this.user.id
        },
        owner() {
            if (this.is_owner) {
                return this.user
            }
            return this.user.owner
        },
        view() {
            return this.$route.params.view
        },
        sub_view() {
            return this.$route.params.sub_view
        },
        sub_sub_view() {
            return this.$route.params.sub_sub_view
        },
        today() {
            return moment().format('YYYY-MM-DD')
        },
        route_name() {
            return this.$route.name
        },
        testing_dusk() {
            return process.env.VUE_APP_TESTING_DUSK
        },
        idiom() {
            return process.env.VUE_APP_IDIOM
        },
        app_name() {
            return process.env.VUE_APP_APP_NAME
        },
        attempt_prop() {
            return process.env.VUE_APP_ATTEMPT_PROP
        },
        attempt_text() {
            return process.env.VUE_APP_ATTEMPT_TEXT
        },
        is_local() {
            return process.env.VUE_APP_API_URL.substring(process.env.VUE_APP_API_URL.length - 5) == ':8000'
        },
        route_index() {
            return process.env.VUE_APP_ROUTE_INDEX
        },
        route_to_redirect_if_unauthenticated() {
            return process.env.VUE_APP_ROUTE_TO_REDIRECT_IF_UNAUTHENTICATED
        },
        inputs_full_size() {
            return typeof process.env.VUE_APP_INPUTS_FULL_SIZE != 'undefined' && process.env.VUE_APP_INPUTS_FULL_SIZE
        },
        aspect_ratio_disabled() {
            return typeof process.env.VUE_APP_ASPECT_RATIO_DISABLED != 'undefined' && process.env.VUE_APP_ASPECT_RATIO_DISABLED
        },
        theme_dark() {
            return typeof process.env.VUE_APP_THEME_DARK != 'undefined' && process.env.VUE_APP_THEME_DARK
        },
        app_theme() {
            if (typeof process.env.VUE_APP_APP_THEME != 'undefined') {
                return process.env.VUE_APP_APP_THEME
            }
            return 'light'
        },
        image_url_prop_name() {
            if (process.env.VUE_APP_IMAGE_URL_PROP_NAME) {
                return process.env.VUE_APP_IMAGE_URL_PROP_NAME
            }
            return 'image_url'
        },
        custom_configuration_page() {
            if (typeof process.env.VUE_APP_CUSTOM_CONFIGURATION_PAGE != 'undefined' && process.env.VUE_APP_CUSTOM_CONFIGURATION_PAGE) {
                return true
            }
            return false
        },
        use_home_page() {
            if (typeof process.env.VUE_APP_USE_HOME_PAGE != 'undefined' && process.env.VUE_APP_USE_HOME_PAGE) {
                return true
            }
            return false
        },
        use_help_dropdown() {
            if (typeof process.env.VUE_APP_USE_HELP_DROPDOWN != 'undefined' && process.env.VUE_APP_USE_HELP_DROPDOWN) {
                return true
            }
            return false
        },
        has_extra_config() {
            if (typeof process.env.VUE_APP_HAS_EXTRA_CONFIG != 'undefined' && process.env.VUE_APP_HAS_EXTRA_CONFIG) {
                return true
            }
            return false
        },
        user_last_activity_minutes() {
            if (typeof process.env.VUE_APP_USER_LAST_ACTIVITY_MINUTES != 'undefined') {
                return process.env.VUE_APP_USER_LAST_ACTIVITY_MINUTES
            }
            return false
        },
        is_mobile() {
            if (this.$vssWidth < '700') {
                return true
            }
            return false
        },
        extra_config() {
            if (this.has_extra_config) {
                return require('@/mixins/extra_config').default
            }
        },
    },
}
