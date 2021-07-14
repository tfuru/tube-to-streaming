<template>
  <div class="container">
    <div id="firebaseui-auth-container"></div>
    <div> &nbsp; </div>
    <button class="button" @click="clickBtnAnonymously">
      アカウントを作らずに利用する
    </button>
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
