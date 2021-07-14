<template>
  <div class="container">
    <div class="columns">
      <div class="column content">
        <h2 class="subtitle">YouTubeのURLを設定する</h2>
      </div>
    </div>
    <div v-if="error.message != ''" class="columns">
      <div class="column">
        <div  class="notification is-danger">
          {{error.message}}
        </div>
      </div>
    </div>    
    <div v-if="success.message != ''" class="columns">
      <div class="column">
        <div class="notification is-primary">
          {{success.message}}
        </div>
      </div>
    </div>
    <div class="columns">
      <div class="column">
        <div class="field is-horizontal">
          <input class="input is-left" type="text" placeholder="例) https://www.youtube.com/watch?v=H_piu9bSNHU&list=RDMM&index=3" v-model="youtube.url" @click="clickYoutubeUrl">
          <p class="spacer"></p>
          <button id="btn-set-url" class="button is-primary" @click="clickBtnSetUrl">URLを設定する</button>
          <p class="spacer"></p>
          <button id="btn-set-url" class="button" @click="clickBtnReset">リセット</button>
        </div>
      </div>
    </div>
    <div v-if="userid != 'dummy'" class="columns">
      <div class="column content">
        <h2 class="subtitle">配信URL</h2>
        <p> ワールドに設置した Video Player に設定するURL</p>
        <input class="input is-left" type="text" v-model="lastMp4Url" @click="clickLastMp4Url">
        <h3>参考</h3>
        <p><a href="https://creator.cluster.mu/2021/02/04/set-up-movie/">Video Playerを使ってワールド内に動画を設置する</a></p>
        <p>サイトを参考に Video Player を設定して の Source 欄に<br /> 上のテキストボックスのURLを指定すると利用する事ができます。</p>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.spacer {
  display: inline-block;
  width: 10px;
}
</style>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import store from "@/store";

@Component({})
export default class TubeUrlForm extends Vue {
  error = {
    message: '',
  };

  success = {
    message: '',
  };

  youtube = {
    url: 'https://youtu.be/feSVtC1BSeQ',
    videoid: ''
  };

  userid = (store.getters.user.isAnonymous == true)? 'dummy' : store.getters.user.uid;

  lastMp4Url = "";

  mounted(): void {
    console.log('currentUser', this.userid, location.host);
    this.lastMp4Url = `${location.origin}/${this.userid}/last`;
  }
  
  clickLastMp4Url(ev: any): void {
    console.log('changeYoutubeUrl');
    ev.target.select(); 
  }

  clickYoutubeUrl(ev: any): void {
    console.log('changeYoutubeUrl');
    ev.target.select(); 

    this.error.message = '';
    this.success.message = '';

    const target = document.getElementById('btn-set-url');
    if (target) {
      target.classList.remove('is-loading');
    }
  }

  clickBtnSetUrl(ev: any): void {
    // console.log('clickBtnSetUrl', ev.target);
    // 処理中 アイコンを追加する
    ev.target.classList.toggle('is-loading');

    // URLから videoid を 抽出
    console.log('youtube.url', this.youtube.url);
    const parser = new URL(this.youtube.url);
    console.log('search', parser);

    this.youtube.videoid = '';
    if (parser.searchParams.has('v') == false) {
      // Vパラメーターがなかった
      // スマホURL https://youtu.be/X5ACAS2KYQo
      if (parser.hostname == 'youtu.be') {
        this.youtube.videoid = parser.pathname.replace(/^\//,'');
      }
    }
    else {
      this.youtube.videoid = parser.searchParams.get('v') as string;
    }

    if (this.youtube.videoid == '') {
        this.error.message = 'videoid が 抽出できませんでした。 YouTube URLを確認してください';
        // 処理中 アイコンを削除
        ev.target.classList.toggle('is-loading');            
        return;
    }
    console.log('this.youtube', this.youtube);

    // サーバ側でのダウンロード処理を実行する
    // TODO 進捗を通知する方法が必用そう
    const convertUrl = `/api/convert/last/${this.userid}/${this.youtube.videoid}`;
    console.log('convertUrl', convertUrl);
    this.axios.get(convertUrl)
      .then((resp) => {            
        // 処理中 アイコンを削除
        ev.target.classList.toggle('is-loading');
        this.success.message = '動画が設定されました。cluster ワールドで再生してみてください';
      })
      .catch((e) => {
        this.error.message = e.message;
        // 処理中 アイコンを削除
        ev.target.classList.toggle('is-loading');
      });
  }

  clickBtnReset(ev: any): void {
    // 処理中 アイコンを追加する
    ev.target.classList.toggle('is-loading');
    this.axios.get(`/${this.userid}/last/delete`)
      .then((resp) => {            
        // 処理中 アイコンを削除
        ev.target.classList.toggle('is-loading');
        this.success.message = '再生対象がリセットされました。再度、動画を設定してみてください';
      })
      .catch((e) => {
        this.error.message = e.message;
        // 処理中 アイコンを削除
        ev.target.classList.toggle('is-loading');
      });
  }
}
</script>