<template>
  <div class="bookmarklet content">
    <h2 class="subtitle">ブックマークレット</h2>
    <p>Chromeのブックマークバーに<br>下のテキストを設定すると<br>ブックマークレットとして利用できます</p>
    <p><input class="input" type="text" @click="clickBookmarkletText" v-model="bookmarkletText"></p>
    <h3>使い方</h3>
    <div>
      <ol>
        <li>ブックマークバー上で右クリックし、ブックマークマネージャを開く</li>
        <li>右クリックし、新しいブックマークを追加する</li>
        <li>名前部分を 動画URL設定 等わかりやすい名前にする</li>
        <li>URL部分に 上のテキストエリアの javascript:(xxxxx) を貼り付ける</li>
        <li>再生したい動画のページを開く</li>
        <li>ブックマークレットをクリックして実行する</li>
      </ol>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import store from "@/store";

@Component
export default class Bookmarklet extends Vue {
  userid = (store.getters.user == null || store.getters.user.isAnonymous == true)? 'dummy' : store.getters.user.uid;

  // default.js を 参考に
  bookmarkletText = '';
  
  mounted(): void {
    this.bookmarkletText = `javascript:(function(uid,a){s=document.createElement('script');s.src=a;document.body.appendChild(s);convert(uid);})('${this.userid}','https://tube-to-streaming.an.r.appspot.com/bookmarklet/tube-to-streaming.js')`;
  }

  clickBookmarkletText(ev: any){
    ev.target.select(); 
  }
}
</script>

<style>
.bookmarklet {
  margin-top: 20px;
}

ol {
  display: inline-block;
  width: 320px;
  text-align: left;
  margin: 0 auto;
}

</style>