<template>
  <div class="home">
    <section class="section">
      <div class="container">
        <img alt="Vue logo" src="../assets/logo.png" class="logo">
        <p>ログインして表示されるフォームにYouTubeの動画URLを設定すると <br /> cluster ワールド内のスクリーンで再生できるようになります</p>
      </div>
    </section>

    <section class="section">
      <div v-if="isLogin() == false">
        <login />
      </div>
      <div v-else>
        <tube-url-form />
      </div>
    </section>
  </div>
</template>


<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import store from "../store";

import HelloWorld from '@/components/HelloWorld.vue'; // @ is an alias to /src
import Login from "@/components/Login.vue";
import TubeUrlForm from "@/components/TubeUrlForm.vue";

@Component({
  components: {
    HelloWorld,
    Login,
    TubeUrlForm,
  },
  computed: {

  },  
})
export default class Home extends Vue {
  isLogin(): boolean {
    const isSignIn = store.getters.isSignIn;
    // console.log('isSignIn', isSignIn);
    return isSignIn;
  }
}
</script>

<style scoped lang="scss">
.logo {
  width: 200px;  
}
</style>