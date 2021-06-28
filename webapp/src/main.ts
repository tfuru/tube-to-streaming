import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

Vue.config.productionTip = false

import axios from 'axios'
import VueAxios from 'vue-axios'
Vue.use(VueAxios, axios)

import firebase from "@/plugins/firebase"
firebase.init();
firebase.onAuth();

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
