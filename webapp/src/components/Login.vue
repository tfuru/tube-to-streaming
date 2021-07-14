<template>
  <div class="container">
    <h3 class="subtitle">アカウントを作らず利用する</h3>
    <p><a href="https://cluster.mu/w/e10c8416-6f4c-4f91-a606-2b07441a0583">動画を中継するツールをつくってみた</a>ワールドで<br />試すことができます。</p>
    <button class="button is-link" @click="clickBtnAnonymously">
      アカウントを作らずに利用する
    </button>
    <div> &nbsp; </div>
    <h3 class="subtitle">アカウント登録して利用する</h3>
    <p>自分のワールドに組み込んで使う事ができるようになります。</p>    
    <div id="firebaseui-auth-container"></div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";

import * as firebaseui from "firebaseui-ja";
import "firebaseui-ja/dist/firebaseui.css";

import firebase from "@/plugins/firebase";

export default Vue.extend({
  name: "Login",
  data: () => ({
    message: "ログイン",
  }),
  mounted: () => {
    const uiConfig = {
      signInFlow: "popup",
      signInSuccessUrl: "/",
      signInOptions: [
        {
          provider: firebase.PROVIDER_ID_EMAIL_AUTH_PROVIDER(),
          requireDisplayName: false,
        },
      ],
      tosUrl: "/terms",
      privacyPolicyUrl: "/privacy",
      autoUpgradeAnonymousUsers: true,
      callbacks: {
         signInSuccessWithAuthResult: (
          authResult: any,
          redirectUrl: string
        ) => {
          return true;
        },
        signInFailure: async (error: firebaseui.auth.AuthUIError) => {
          console.warn("signInFailure", error);
          // 匿名アカウント アップグレード
          const auth = firebase.auth();
          const credential = error.credential;
          const authResult = await auth.signInWithCredential(credential);          
        }
      }
    };
    const ui =
      firebaseui.auth.AuthUI.getInstance() ||
      new firebaseui.auth.AuthUI(firebase.auth());
    ui.start("#firebaseui-auth-container", uiConfig);
  },
  methods: {
    clickBtnAnonymously: async () => {
      console.log("clickBtnAnonymously");
      firebase.signInAnonymously();
    },
  },
});
</script>
