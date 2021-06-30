<template>
  <div class="container">
    <div class="columns">
      <div class="column">
        <h2>YouTubeのURLを設定する</h2>
      </div>
    </div>
    <div class="columns">
      <div class="column">
        <div v-if="error.message != ''" class="notification is-danger">
          {{error.message}}
        </div>
      </div>
    </div>    
    <div class="columns">
      <div class="column">
        <div v-if="success.message != ''" class="notification is-primary">
          {{success.message}}
        </div>
      </div>
    </div>    

    <div class="columns">
      <div class="column">
        <input class="input" type="text" placeholder="例) https://www.youtube.com/watch?v=H_piu9bSNHU&list=RDMM&index=3" v-model="youtube.url" @click="clickYoutubeUrl">
      </div>
    </div>
    <div class="columns">
      <div class="column">
        <button id="btn-set-url" class="button is-primary" @click="clickBtnSetUrl">URLを設定する</button>
      </div>
    </div>
    <div class="columns">
      <div class="column">
        <button id="btn-set-url" class="button" @click="clickBtnReset">リセット</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  name: 'TubeUrlForm',
  data: () => ({
    error: {
      message: '',
    },
    success: {
      message: '',
    },
    youtube: {
      url: 'https://www.youtube.com/watch?v=feSVtC1BSeQ',
      videoid: ''
    }
  }),
  mounted: () => {
      console.log("mounted");
  },
  methods: {
    clickYoutubeUrl(ev: any) {
      console.log('changeYoutubeUrl');      
      ev.target.select(); 

      this.error.message = '';
      this.success.message = '';

      const target = document.getElementById('btn-set-url');
      if (target) {
        target.classList.remove('is-loading');
      }
    },
    clickBtnSetUrl(ev: any) {
      // console.log('clickBtnSetUrl', ev.target);
      // 処理中 アイコンを追加する
      ev.target.classList.toggle('is-loading');

      // URLから videoid を 抽出
      console.log('youtube.url', this.youtube.url);
      const parser = new URL(this.youtube.url);
      console.log('search', parser.searchParams);

      if (parser.searchParams.has('v') == false) {
          // Vパラメーターがなかった
          console.log('v');
          this.error.message = 'videoid が 抽出できませんでした。 YouTube URLを確認してください';
          // 処理中 アイコンを削除
          ev.target.classList.toggle('is-loading');            
          return;
      }
      this.youtube.videoid = parser.searchParams.get('v') as string;
      console.log('this.youtube', this.youtube);

      // ダウンロード処理を実行する
      // TODO 進捗を通知する方法が必用そう
      this.axios.get(`/api/convert/last/${this.youtube.videoid}`)
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
    },
    clickBtnReset(ev: any) {
      // 処理中 アイコンを追加する
      ev.target.classList.toggle('is-loading');
      const userid = 'dummy';
      this.axios.get(`/${userid}/last/delete`)
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
  },
});
</script>