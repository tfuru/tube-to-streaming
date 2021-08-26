<template>
  <div id="app">
    <div id="nav">
      <router-link to="/">Home</router-link>
      <p v-if="isLogin() == true" class="spacer"></p>
      <router-link v-if="isLogin() == true" to="/bookmarklet">ブックマークレット</router-link>
      <p v-if="isLogin() == true" class="spacer"></p>
      <button
        v-if="isLogin() == true"
        class="button is-small is-inverted"
        @click="clickLogout">ログアウト</button>
    </div>
    <router-view/>
  </div>
</template>

<style lang="scss">
@import "../node_modules/bulma/bulma.sass";

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

#nav {
  padding: 30px;

  a {
    font-weight: bold;
    color: #2c3e50;

    &.router-link-exact-active {
      color: #42b983;
    }
  }
}

.spacer {
  display: inline-block;
  width: 10px;
}

</style>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import store from "@/store";

import firebase from "@/plugins/firebase";

@Component({})
export default class App extends Vue {
  isLogin() {
    const isSignIn = store.getters.isSignIn;
    // console.log('isSignIn', isSignIn);
    return isSignIn;
  }

  clickLogout() {
    firebase.signOut();
  }
}
</script>