import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    user: {},
    isSignIn: false,
  },
  getters: {
    user(state) {
      return state.user;
    },
    isSignIn(state) {
      return state.isSignIn;
    },
  },
  mutations: {
    setUser(state, user) {
      state.user = user;
    },
    setSignIn(state, isSignIn) {
      state.isSignIn = isSignIn;
    },
  },
  actions: {},
  modules: {},
})
